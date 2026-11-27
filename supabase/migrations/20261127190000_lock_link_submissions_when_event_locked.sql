-- Migration: 20261127190000_lock_link_submissions_when_event_locked.sql
-- Description: Enforce event, college, and matrix lock guards on link submissions (submission_entries & prefest_submissions)

CREATE OR REPLACE FUNCTION public.validate_submission_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_event RECORD;
  v_settings RECORD;
  v_reg_chest TEXT;
  v_stu_chest TEXT;
  v_reg_deadline TIMESTAMPTZ;
  v_fine_deadline TIMESTAMPTZ;
  v_clean_input TEXT;
BEGIN
  NEW.file_url := TRIM(COALESCE(NEW.file_url, ''));
  IF NEW.file_url = '' OR NEW.file_url !~* '^https?://\S+$' THEN
    RAISE EXCEPTION 'Submission link must be a valid http:// or https:// URL.'
      USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE item_id = NEW.item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event with ID % does not exist.', NEW.item_id
      USING ERRCODE = '23503';
  END IF;

  IF NOT (
    COALESCE(v_event.is_submission, false)
    OR COALESCE(v_event.is_screening, false)
    OR v_event.mode::text = 'submission'
  ) THEN
    RAISE EXCEPTION 'Event % does not accept pre-fest submission links.', COALESCE(v_event.item_code, NEW.item_id::text)
      USING ERRCODE = '23514';
  END IF;

  -- Verify active registration & resolve canonical chest_no without assuming students.chest_no exists
  v_clean_input := UPPER(TRIM(COALESCE(NEW.chest_no, '')));
  IF v_clean_input = '' THEN
    RAISE EXCEPTION 'Participant chest number is required for submission links.'
      USING ERRCODE = '23514';
  END IF;

  SELECT
    r.chest_no,
    COALESCE(
      NULLIF(TRIM(COALESCE(to_jsonb(s)->>'chest_no', '')), ''),
      NULLIF(TRIM(r.chest_no), '')
    )
  INTO v_reg_chest, v_stu_chest
  FROM public.registrations r
  LEFT JOIN public.students s
    ON s.college_affl_no = r.college_affl_no
   AND (
     UPPER(TRIM(COALESCE(to_jsonb(s)->>'chest_no', ''))) = UPPER(TRIM(r.chest_no))
     OR 'ST-' || COALESCE(to_jsonb(s)->>'cic_no', to_jsonb(s)->>'admission_no', '') = UPPER(TRIM(r.chest_no))
     OR COALESCE(to_jsonb(s)->>'cic_no', to_jsonb(s)->>'admission_no', '') = TRIM(r.chest_no)
     OR s.id::text = TRIM(r.chest_no)
   )
  WHERE r.item_id = NEW.item_id
    AND r.college_affl_no = NEW.college_affl_no
    AND (
      UPPER(TRIM(r.chest_no)) = v_clean_input
      OR UPPER(TRIM(COALESCE(to_jsonb(s)->>'chest_no', ''))) = v_clean_input
      OR 'ST-' || COALESCE(to_jsonb(s)->>'cic_no', to_jsonb(s)->>'admission_no', '') = v_clean_input
      OR COALESCE(to_jsonb(s)->>'cic_no', to_jsonb(s)->>'admission_no', '') = TRIM(COALESCE(NEW.chest_no, ''))
      OR COALESCE(s.id::text, '') = TRIM(COALESCE(NEW.chest_no, ''))
    )
  LIMIT 1;

  IF v_reg_chest IS NULL THEN
    RAISE EXCEPTION 'Participant % is not actively registered for event %.', NEW.chest_no, COALESCE(v_event.item_code, NEW.item_id::text)
      USING ERRCODE = '23514';
  END IF;

  IF v_stu_chest IS NOT NULL AND TRIM(v_stu_chest) <> '' THEN
    NEW.chest_no := TRIM(v_stu_chest);
  ELSE
    NEW.chest_no := TRIM(v_reg_chest);
  END IF;

  -- Server-authoritative timestamp & deadline classification
  NEW.submitted_at := now();
  BEGIN
    v_role := (SELECT public.auth_user_role());
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  -- Lock validation: if not admin/convenor, event must not be locked
  IF v_role IS NULL OR v_role NOT IN ('admin'::user_role, 'convenor'::user_role) THEN
    -- 1. Check event global lock
    IF COALESCE(v_event.is_locked, false) = true THEN
      RAISE EXCEPTION 'Event % is locked by administration. Link submissions are not permitted.', COALESCE(v_event.item_code, NEW.item_id::text)
        USING ERRCODE = '23514';
    END IF;

    -- 2. Check college institutional lock
    IF EXISTS (
      SELECT 1 FROM public.colleges
      WHERE affl_no = NEW.college_affl_no AND manual_lock_override = false
    ) THEN
      RAISE EXCEPTION 'Your institution (#%) is locked by administration. Link submissions are not permitted.', NEW.college_affl_no
        USING ERRCODE = '23514';
    END IF;

    -- 3. Check matrix entry lock
    IF EXISTS (
      SELECT 1 FROM public.entry_locks
      WHERE item_id = NEW.item_id AND college_affl_no = NEW.college_affl_no AND is_open = false
    ) THEN
      RAISE EXCEPTION 'Event % is locked for college #%. Link submissions are not permitted.', COALESCE(v_event.item_code, NEW.item_id::text), NEW.college_affl_no
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_role IS NULL OR v_role NOT IN ('admin'::user_role, 'convenor'::user_role) OR NEW.status IS NULL THEN
    SELECT * INTO v_settings FROM public.fest_settings LIMIT 1;
    v_reg_deadline := COALESCE(v_event.reg_deadline, v_settings.reg_deadline);
    v_fine_deadline := COALESCE(v_event.fine_deadline, v_settings.fine_deadline);

    IF v_fine_deadline IS NOT NULL AND now() > v_fine_deadline THEN
      NEW.status := 'late'::public.submission_status;
    ELSIF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline THEN
      NEW.status := 'fine'::public.submission_status;
    ELSE
      NEW.status := 'on_time'::public.submission_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.validate_prefest_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role public.user_role;
  v_reg RECORD;
  v_settings RECORD;
  v_event RECORD;
BEGIN
  -- 1. Fetch and verify parent registration
  SELECT * INTO v_reg FROM public.prefest_registrations WHERE id = NEW.registration_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated pre-fest registration does not exist.' USING ERRCODE = '23503';
  END IF;

  -- Populate consistent foreign keys
  NEW.college_id := v_reg.college_id;
  NEW.college_affl_no := v_reg.college_affl_no;
  NEW.event_id := v_reg.event_id;

  -- Fetch associated event
  SELECT * INTO v_event FROM public.events
  WHERE id::text = v_reg.event_id::text OR item_id::text = v_reg.event_id::text
  LIMIT 1;

  -- 2. Validate YouTube submission deadline & Event Locks
  BEGIN
    v_role := (SELECT public.auth_user_role());
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  IF v_role IS DISTINCT FROM 'admin'::public.user_role THEN
    -- Check event global lock
    IF v_event.id IS NOT NULL AND COALESCE(v_event.is_locked, false) = true THEN
      RAISE EXCEPTION 'Event % is locked by administration. Link submissions are not permitted.', COALESCE(v_event.item_code, v_reg.event_id::text)
        USING ERRCODE = '23514';
    END IF;

    -- Check college institutional lock
    IF EXISTS (
      SELECT 1 FROM public.colleges
      WHERE affl_no = v_reg.college_affl_no AND manual_lock_override = false
    ) THEN
      RAISE EXCEPTION 'Your institution (#%) is locked by administration. Link submissions are not permitted.', v_reg.college_affl_no
        USING ERRCODE = '23514';
    END IF;

    -- Check matrix entry lock
    IF v_event.item_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.entry_locks
      WHERE item_id = v_event.item_id AND college_affl_no = v_reg.college_affl_no AND is_open = false
    ) THEN
      RAISE EXCEPTION 'Event % is locked for your college. Link submissions are not permitted.', COALESCE(v_event.item_code, v_reg.event_id::text)
        USING ERRCODE = '23514';
    END IF;

    -- Validate YouTube submission deadline
    SELECT * INTO v_settings FROM public.prefest_registration_settings WHERE event_type = v_reg.event_type;
    IF NOT FOUND OR NOT v_settings.youtube_submission_enabled THEN
      RAISE EXCEPTION 'YouTube submissions for % events are currently disabled.', v_reg.event_type
        USING ERRCODE = '23514';
    END IF;

    IF v_settings.youtube_submission_opens_at IS NOT NULL AND now() < v_settings.youtube_submission_opens_at THEN
      RAISE EXCEPTION 'YouTube submissions for % events have not opened yet.', v_reg.event_type
        USING ERRCODE = '23514';
    END IF;

    IF v_settings.youtube_submission_closes_at IS NOT NULL AND now() > v_settings.youtube_submission_closes_at THEN
      RAISE EXCEPTION 'YouTube submission deadline for % events has expired.', v_reg.event_type
        USING ERRCODE = '23514';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
