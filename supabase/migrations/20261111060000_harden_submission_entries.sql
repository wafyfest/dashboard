-- ============================================================================
-- Migration: 20261111060000_harden_submission_entries.sql
-- Description:
--   Hardens server-side handling for pre-fest submission & screening links:
--     1. BEFORE INSERT/UPDATE trigger on `public.submission_entries`:
--        - Validates `file_url` is an http(s) URL
--        - Verifies `public.events` requires pre-fest link (`is_submission` or
--          `is_screening` or legacy `mode = 'submission'`)
--        - Verifies an active registration exists in `public.registrations` for
--          the student + college + event and resolves `chest_no` to the exact
--          `public.students.chest_no` FK value (avoiding 23503 mismatches)
--        - Server-computes `submitted_at` and `status` (`on_time`/`fine`/`late`)
--          from event/fest deadlines for college callers
--     2. AFTER INSERT/UPDATE trigger to keep at most 1 active link per
--        `(item_id, college_affl_no)` on Group events atomically on the server
--     3. Updates `register_college_for_item_tx` to clean up orphaned
--        `submission_entries` on unregistration or individual roster swaps,
--        and re-point team links on Group roster edits
--     4. Ensures `public.submission_entries` is in `supabase_realtime`
-- ============================================================================

BEGIN;

-- 1. Ensure submission_entries emits Realtime changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'submission_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.submission_entries;
  END IF;
END $$;

ALTER TABLE public.submission_entries REPLICA IDENTITY FULL;

-- 2. Server-side validation & canonical identity trigger for submission_entries
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

  v_clean_input := UPPER(TRIM(COALESCE(NEW.chest_no, '')));
  IF v_clean_input = '' THEN
    RAISE EXCEPTION 'Participant chest number is required for submission links.'
      USING ERRCODE = '23514';
  END IF;

  -- Verify active registration & resolve canonical chest_no without assuming students.chest_no exists
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

DROP TRIGGER IF EXISTS trg_validate_submission_entry ON public.submission_entries;
CREATE TRIGGER trg_validate_submission_entry
  BEFORE INSERT OR UPDATE ON public.submission_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_submission_entry();

-- 3. Keep at most one active submission link per college team on Group events
CREATE OR REPLACE FUNCTION public.cleanup_group_submission_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_point_type TEXT;
BEGIN
  SELECT point_type::text INTO v_point_type
  FROM public.events
  WHERE item_id = NEW.item_id;

  IF v_point_type = 'group' THEN
    DELETE FROM public.submission_entries
    WHERE item_id = NEW.item_id
      AND college_affl_no = NEW.college_affl_no
      AND id <> NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_group_submission_entries ON public.submission_entries;
CREATE TRIGGER trg_cleanup_group_submission_entries
  AFTER INSERT OR UPDATE ON public.submission_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_group_submission_entries();

-- 4. Update register_college_for_item_tx to clean up / re-point submission_entries atomically
CREATE OR REPLACE FUNCTION public.register_college_for_item_tx(
  p_item_id INT,
  p_college_affl_no INT,
  p_chest_nos TEXT[]
)
RETURNS SETOF public.registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_affl INT;
  v_item RECORD;
  v_college RECORD;
  v_settings RECORD;
  v_reg_deadline TIMESTAMPTZ;
  v_fine_deadline TIMESTAMPTZ;
  v_has_override BOOLEAN := false;
  v_entry_lock_open BOOLEAN;
  v_is_late BOOLEAN := false;
  v_late_reason TEXT := 'Late Registration';
  v_first_group_chest TEXT;
BEGIN
  -- 1. Explicit Fail-Closed Authorization
  v_role := (SELECT public.auth_user_role());
  v_affl := (SELECT public.auth_user_affl_no());

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_item FROM public.events WHERE item_id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event with ID % does not exist', p_item_id;
  END IF;

  SELECT * INTO v_college FROM public.colleges WHERE affl_no = p_college_affl_no;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'College with Affiliation No % does not exist', p_college_affl_no;
  END IF;

  SELECT * INTO v_settings FROM public.fest_settings LIMIT 1;
  v_has_override := COALESCE(v_college.manual_lock_override, false);

  v_reg_deadline := COALESCE(v_item.reg_deadline, v_settings.reg_deadline);
  v_fine_deadline := COALESCE(v_item.fine_deadline, v_settings.fine_deadline);

  IF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline THEN
    v_is_late := true;
    IF v_fine_deadline IS NOT NULL AND now() > v_fine_deadline THEN
      v_late_reason := 'Registered Past Final Deadline (Admin Override)';
    ELSE
      v_late_reason := 'Registered In Late Fine Window';
    END IF;
  END IF;

  IF v_role = 'admin'::user_role THEN
    -- Admin authorized for all colleges and bypasses lock checks
  ELSIF v_role = 'college'::user_role AND v_affl = p_college_affl_no THEN
    IF NOT v_has_override THEN
      IF COALESCE(v_item.is_locked, false) THEN
        RAISE EXCEPTION 'Registration closed: Event % is locked by fest administration', COALESCE(v_item.item_code, p_item_id::text);
      END IF;

      SELECT is_open INTO v_entry_lock_open
      FROM public.entry_locks
      WHERE item_id = p_item_id AND college_affl_no = p_college_affl_no;

      IF v_entry_lock_open IS NOT NULL AND NOT v_entry_lock_open THEN
        RAISE EXCEPTION 'Registration closed: Registration for event % is locked for your institution', COALESCE(v_item.item_code, p_item_id::text);
      END IF;

      IF v_fine_deadline IS NOT NULL AND now() > v_fine_deadline THEN
        RAISE EXCEPTION 'Registration deadline has passed for event %', COALESCE(v_item.item_code, p_item_id::text);
      END IF;
    END IF;

    IF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline AND array_length(p_chest_nos, 1) > 0 THEN
      UPDATE public.colleges
      SET fine_status = true
      WHERE affl_no = p_college_affl_no;
    END IF;
  ELSE
    RAISE EXCEPTION 'Access denied: not authorized for college %', p_college_affl_no;
  END IF;

  -- 2. Roster Validation: Every chest number must belong to this college
  IF array_length(p_chest_nos, 1) > 0 THEN
    IF EXISTS (
      SELECT 1
      FROM unnest(p_chest_nos) AS c(chest_no)
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.college_affl_no = p_college_affl_no
          AND (
            'ST-' || s.cic_no::text = c.chest_no
            OR s.cic_no::text = c.chest_no
            OR s.id::text = c.chest_no
          )
      )
    ) THEN
      RAISE EXCEPTION 'All participants must belong to college affiliation %', p_college_affl_no;
    END IF;
  END IF;

  -- 3. Atomic Replacement of Existing Registrations for this event
  DELETE FROM public.registrations
  WHERE item_id = p_item_id
    AND college_affl_no = p_college_affl_no;

  DELETE FROM public.late_registrations
  WHERE item_id = p_item_id
    AND college_affl_no = p_college_affl_no;

  IF COALESCE(array_length(p_chest_nos, 1), 0) = 0 THEN
    -- Full unregistration: remove all submission links for this college & event
    DELETE FROM public.submission_entries
    WHERE item_id = p_item_id
      AND college_affl_no = p_college_affl_no;
    RETURN;
  END IF;

  IF v_is_late THEN
    INSERT INTO public.late_registrations (
      item_id,
      college_affl_no,
      chest_no,
      late_reason,
      effective_deadline,
      registered_at
    )
    SELECT
      p_item_id,
      p_college_affl_no,
      c.chest_no,
      v_late_reason,
      v_reg_deadline,
      now()
    FROM unnest(p_chest_nos) AS c(chest_no)
    ON CONFLICT (item_id, chest_no) DO UPDATE
    SET
      late_reason = EXCLUDED.late_reason,
      effective_deadline = EXCLUDED.effective_deadline,
      registered_at = EXCLUDED.registered_at;
  END IF;

  -- Insert new registrations first so submission trigger/FK checks always see active rows
  RETURN QUERY
  INSERT INTO public.registrations (item_id, college_affl_no, chest_no)
  SELECT p_item_id, p_college_affl_no, c.chest_no
  FROM unnest(p_chest_nos) AS c(chest_no)
  RETURNING *;

  -- Synchronize submission_entries after registrations are updated
  IF COALESCE(v_item.point_type::text, 'individual') = 'group' THEN
    SELECT COALESCE(
      NULLIF(TRIM(COALESCE(to_jsonb(s)->>'chest_no', '')), ''),
      p_chest_nos[1]
    )
    INTO v_first_group_chest
    FROM public.students s
    WHERE s.college_affl_no = p_college_affl_no
      AND (
        'ST-' || COALESCE(to_jsonb(s)->>'cic_no', to_jsonb(s)->>'admission_no', '') = p_chest_nos[1]
        OR COALESCE(to_jsonb(s)->>'cic_no', to_jsonb(s)->>'admission_no', '') = p_chest_nos[1]
        OR s.id::text = p_chest_nos[1]
        OR COALESCE(to_jsonb(s)->>'chest_no', '') = p_chest_nos[1]
      )
    LIMIT 1;
    v_first_group_chest := COALESCE(v_first_group_chest, p_chest_nos[1]);

    -- Preserve team's existing link if its previous holder was swapped out
    IF v_first_group_chest IS NOT NULL THEN
      UPDATE public.submission_entries se
      SET chest_no = v_first_group_chest
      WHERE se.item_id = p_item_id
        AND se.college_affl_no = p_college_affl_no
        AND NOT EXISTS (
          SELECT 1
          FROM unnest(p_chest_nos) AS c(chest_no)
          LEFT JOIN public.students st
            ON st.college_affl_no = p_college_affl_no
           AND (
             'ST-' || COALESCE(to_jsonb(st)->>'cic_no', to_jsonb(st)->>'admission_no', '') = c.chest_no
             OR COALESCE(to_jsonb(st)->>'cic_no', to_jsonb(st)->>'admission_no', '') = c.chest_no
             OR st.id::text = c.chest_no
             OR COALESCE(to_jsonb(st)->>'chest_no', '') = c.chest_no
           )
          WHERE UPPER(TRIM(COALESCE(NULLIF(TRIM(COALESCE(to_jsonb(st)->>'chest_no', '')), ''), c.chest_no))) = UPPER(TRIM(se.chest_no))
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.submission_entries other
          WHERE other.item_id = p_item_id AND other.chest_no = v_first_group_chest
        );
    END IF;
  ELSE
    -- Individual event: remove stale submission_entries for participants no longer on the roster
    DELETE FROM public.submission_entries se
    WHERE se.item_id = p_item_id
      AND se.college_affl_no = p_college_affl_no
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(p_chest_nos) AS c(chest_no)
        LEFT JOIN public.students st
          ON st.college_affl_no = p_college_affl_no
         AND (
           'ST-' || COALESCE(to_jsonb(st)->>'cic_no', to_jsonb(st)->>'admission_no', '') = c.chest_no
           OR COALESCE(to_jsonb(st)->>'cic_no', to_jsonb(st)->>'admission_no', '') = c.chest_no
           OR st.id::text = c.chest_no
           OR COALESCE(to_jsonb(st)->>'chest_no', '') = c.chest_no
         )
        WHERE UPPER(TRIM(COALESCE(NULLIF(TRIM(COALESCE(to_jsonb(st)->>'chest_no', '')), ''), c.chest_no))) = UPPER(TRIM(se.chest_no))
      );
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) TO authenticated;

COMMIT;
