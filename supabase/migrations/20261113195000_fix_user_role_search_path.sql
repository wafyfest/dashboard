-- Migration: 20261113195000_fix_user_role_search_path.sql
-- Description: Fix "type user_role does not exist" error (42704) in register_college_for_item_tx,
--              review_replacement_tx, and validate_submission_entry by qualifying public.user_role
--              and establishing search_path = public, pg_temp.

BEGIN;

-- 1. register_college_for_item_tx
CREATE OR REPLACE FUNCTION public.register_college_for_item_tx(
  p_item_id integer,
  p_college_affl_no integer,
  p_chest_nos text[]
)
RETURNS SETOF public.registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role public.user_role;
  v_affl INT;
  v_item RECORD;
  v_college RECORD;
  v_settings RECORD;
  v_reg_deadline TIMESTAMPTZ;
  v_fine_end TIMESTAMPTZ;
  v_super_fine_end TIMESTAMPTZ;
  v_has_override BOOLEAN := false;
  v_entry_lock_open BOOLEAN;
  v_is_late BOOLEAN := false;
  v_fine_tier TEXT := 'fine';
  v_fine_amount INT := 0;
  v_late_reason TEXT := 'Late Registration';
  v_first_group_chest TEXT;
  v_normalized_chests TEXT[] := ARRAY[]::TEXT[];
  v_raw_id TEXT;
  v_raw_trimmed TEXT;
  v_raw_bigint BIGINT;
  v_cic BIGINT;
  v_assigned TEXT;
BEGIN
  v_role := (SELECT public.auth_user_role());
  v_affl := (SELECT public.auth_user_affl_no());

  -- If invoked via service_role key or database admin, treat as admin
  IF v_role IS NULL AND (
    COALESCE(auth.jwt() ->> 'role', '') = 'service_role' OR
    current_user = 'service_role' OR
    current_user = 'postgres'
  ) THEN
    v_role := 'admin'::public.user_role;
  END IF;

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
  v_fine_end := CASE WHEN v_reg_deadline IS NOT NULL THEN v_reg_deadline + INTERVAL '1 hour' ELSE NULL END;
  v_super_fine_end := CASE WHEN v_reg_deadline IS NOT NULL THEN v_reg_deadline + INTERVAL '2 hours' ELSE NULL END;

  IF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline THEN
    v_is_late := true;
    IF v_fine_end IS NOT NULL AND now() <= v_fine_end THEN
      v_fine_tier := 'fine';
      v_fine_amount := 500;
      v_late_reason := 'Fine Period (₹500) — within 1 hr of deadline';
    ELSIF v_super_fine_end IS NOT NULL AND now() <= v_super_fine_end THEN
      v_fine_tier := 'super_fine';
      v_fine_amount := 1000;
      v_late_reason := 'Super Fine Period (₹1,000) — 1 to 2 hrs after deadline';
    ELSE
      v_fine_tier := 'super_fine';
      v_fine_amount := 1000;
      v_late_reason := 'Admin Entry Past Super Fine Cutoff (₹1,000)';
    END IF;
  END IF;

  -- ONLY Admin has admin registration privileges across colleges and bypasses lock checks
  IF v_role = 'admin'::public.user_role THEN
    -- Admin authorized for all colleges and bypasses lock checks
  ELSIF v_role = 'college'::public.user_role AND (v_affl IS NOT NULL AND v_affl = p_college_affl_no) THEN
    -- Absolute complete lockout after the 2-hour Super Fine window for ALL colleges
    IF v_super_fine_end IS NOT NULL AND now() > v_super_fine_end THEN
      RAISE EXCEPTION 'Registration completely locked: normal, ₹500 fine (1h), and ₹1,000 super fine (2h) periods have ended for event %',
        COALESCE(v_item.item_code, p_item_id::text);
    END IF;

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
    END IF;

    IF v_is_late AND COALESCE(array_length(p_chest_nos, 1), 0) > 0 THEN
      UPDATE public.colleges
      SET fine_status = true
      WHERE affl_no = p_college_affl_no;
    END IF;
  ELSE
    RAISE EXCEPTION 'Access denied: not authorized for college %', p_college_affl_no;
  END IF;

  -- Validate every participant belongs to this college & allocate/resolve 101+ chest number
  IF COALESCE(array_length(p_chest_nos, 1), 0) > 0 THEN
    FOREACH v_raw_id IN ARRAY p_chest_nos
    LOOP
      v_raw_trimmed := TRIM(COALESCE(v_raw_id, ''));
      v_raw_bigint := CASE
        WHEN v_raw_trimmed ~ '^[1-9][0-9]*$' AND length(v_raw_trimmed) <= 18 THEN v_raw_trimmed::BIGINT
        ELSE NULL
      END;

      SELECT s.cic_no INTO v_cic
      FROM public.students s
      LEFT JOIN public.chest_no cn ON cn.cic_no = s.cic_no
      WHERE s.college_affl_no = p_college_affl_no
        AND (
          (v_raw_bigint IS NOT NULL AND cn.chest_no = v_raw_bigint)
          OR s.cic_no::text = v_raw_trimmed
          OR 'ST-' || s.cic_no::text = UPPER(v_raw_trimmed)
          OR s.id::text = v_raw_trimmed
        )
      ORDER BY
        CASE
          WHEN v_raw_bigint IS NOT NULL AND cn.chest_no = v_raw_bigint THEN 0
          ELSE 1
        END,
        s.cic_no ASC
      LIMIT 1;

      IF v_cic IS NULL THEN
        RAISE EXCEPTION 'All participants must belong to college affiliation %', p_college_affl_no;
      END IF;

      v_assigned := public.ensure_student_chest_no(v_cic, p_college_affl_no);
      IF v_assigned IS NOT NULL AND NOT (v_assigned = ANY(v_normalized_chests)) THEN
        v_normalized_chests := array_append(v_normalized_chests, v_assigned);
      END IF;
    END LOOP;
  END IF;

  -- Replace existing registrations for this college & event atomically
  DELETE FROM public.registrations
  WHERE item_id = p_item_id
    AND college_affl_no = p_college_affl_no;

  DELETE FROM public.late_registrations
  WHERE item_id = p_item_id
    AND college_affl_no = p_college_affl_no;

  IF COALESCE(array_length(v_normalized_chests, 1), 0) = 0 THEN
    DELETE FROM public.submission_entries
    WHERE item_id = p_item_id
      AND college_affl_no = p_college_affl_no;
    RETURN;
  END IF;

  -- Insert late registrations in deterministic sorted order
  IF v_is_late THEN
    INSERT INTO public.late_registrations (
      item_id,
      college_affl_no,
      chest_no,
      late_reason,
      fine_tier,
      fine_amount,
      effective_deadline,
      registered_at
    )
    SELECT
      p_item_id,
      p_college_affl_no,
      c.chest_no,
      v_late_reason,
      v_fine_tier,
      v_fine_amount,
      v_reg_deadline,
      now()
    FROM unnest(v_normalized_chests) AS c(chest_no)
    ORDER BY c.chest_no ASC
    ON CONFLICT (item_id, chest_no) DO UPDATE
    SET
      late_reason = EXCLUDED.late_reason,
      fine_tier = EXCLUDED.fine_tier,
      fine_amount = EXCLUDED.fine_amount,
      effective_deadline = EXCLUDED.effective_deadline,
      registered_at = EXCLUDED.registered_at;
  END IF;

  -- Insert registrations in deterministic ascending chest_no order to prevent AB-BA deadlocks
  RETURN QUERY
  INSERT INTO public.registrations (item_id, college_affl_no, chest_no, created_at)
  SELECT p_item_id, p_college_affl_no, c.chest_no, now()
  FROM unnest(v_normalized_chests) AS c(chest_no)
  ORDER BY c.chest_no ASC
  RETURNING *;

  -- Synchronize submission_entries using only 101+ chest numbers
  IF COALESCE(v_item.point_type::text, 'individual') = 'group' THEN
    v_first_group_chest := v_normalized_chests[1];
    IF v_first_group_chest IS NOT NULL THEN
      UPDATE public.submission_entries se
      SET chest_no = v_first_group_chest
      WHERE se.item_id = p_item_id
        AND se.college_affl_no = p_college_affl_no
        AND TRIM(se.chest_no) <> ALL(v_normalized_chests)
        AND NOT EXISTS (
          SELECT 1 FROM public.submission_entries other
          WHERE other.item_id = p_item_id AND other.chest_no = v_first_group_chest
        );
    END IF;
  ELSE
    DELETE FROM public.submission_entries se
    WHERE se.item_id = p_item_id
      AND se.college_affl_no = p_college_affl_no
      AND TRIM(se.chest_no) <> ALL(v_normalized_chests);
  END IF;
END;
$function$;

-- 2. review_replacement_tx
CREATE OR REPLACE FUNCTION public.review_replacement_tx(
  p_replacement_id uuid,
  p_status text,
  p_remarks text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role public.user_role;
  v_rep RECORD;
  v_reg RECORD;
  v_event RECORD;
  v_orig_stu RECORD;
  v_new_stu RECORD;
  v_old_chest_no TEXT;
  v_new_chest_no TEXT;
  v_rows_affected INT;
BEGIN
  v_role := (SELECT public.auth_user_role());

  IF v_role IS NULL AND (
    COALESCE(auth.jwt() ->> 'role', '') = 'service_role' OR
    current_user = 'service_role' OR
    current_user = 'postgres'
  ) THEN
    v_role := 'admin'::public.user_role;
  END IF;

  IF v_role IS NULL OR v_role != 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Access denied: executive admin privileges required';
  END IF;

  SELECT * INTO v_rep
  FROM public.replacements
  WHERE id = p_replacement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Replacement request % not found', p_replacement_id;
  END IF;

  IF p_status = 'Approved' THEN
    SELECT * INTO v_reg
    FROM public.registrations
    WHERE id = v_rep.registration_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Target registration % does not exist', v_rep.registration_id;
    END IF;

    v_old_chest_no := TRIM(COALESCE(v_reg.chest_no, ''));

    SELECT * INTO v_orig_stu
    FROM public.students
    WHERE id = v_rep.original_student_id AND college_affl_no = v_reg.college_affl_no;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Original student does not belong to college %', v_reg.college_affl_no;
    END IF;

    SELECT * INTO v_new_stu
    FROM public.students
    WHERE id = v_rep.replacement_student_id AND college_affl_no = v_reg.college_affl_no;

    IF NOT FOUND OR v_new_stu.cic_no IS NULL THEN
      RAISE EXCEPTION 'Replacement student does not belong to college % or is missing CIC number', v_reg.college_affl_no;
    END IF;

    UPDATE public.registrations
    SET chest_no = v_new_stu.cic_no::text
    WHERE id = v_reg.id
    RETURNING chest_no INTO v_new_chest_no;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected != 1 THEN
      RAISE EXCEPTION 'Registration roster update failed (expected 1 row, affected %)', v_rows_affected;
    END IF;

    IF v_old_chest_no <> '' AND v_new_chest_no IS NOT NULL AND v_old_chest_no IS DISTINCT FROM v_new_chest_no THEN
      UPDATE public.late_registrations
      SET chest_no = v_new_chest_no
      WHERE item_id = v_reg.item_id
        AND college_affl_no = v_reg.college_affl_no
        AND TRIM(chest_no) = v_old_chest_no
        AND NOT EXISTS (
          SELECT 1 FROM public.late_registrations other
          WHERE other.item_id = v_reg.item_id AND TRIM(other.chest_no) = v_new_chest_no
        );

      UPDATE public.code_letters
      SET chest_no = v_new_chest_no
      WHERE item_id = v_reg.item_id
        AND college_affl_no = v_reg.college_affl_no
        AND TRIM(chest_no) = v_old_chest_no;

      SELECT * INTO v_event FROM public.events WHERE item_id = v_reg.item_id;
      IF COALESCE(v_event.point_type::text, 'individual') = 'group' THEN
        PERFORM set_config('app.skip_chest_trigger', 'on', true);
        UPDATE public.submission_entries
        SET chest_no = v_new_chest_no
        WHERE item_id = v_reg.item_id
          AND college_affl_no = v_reg.college_affl_no
          AND TRIM(chest_no) = v_old_chest_no
          AND NOT EXISTS (
            SELECT 1 FROM public.submission_entries other
            WHERE other.item_id = v_reg.item_id AND TRIM(other.chest_no) = v_new_chest_no
          );
        PERFORM set_config('app.skip_chest_trigger', 'off', true);
      ELSE
        DELETE FROM public.submission_entries
        WHERE item_id = v_reg.item_id
          AND college_affl_no = v_reg.college_affl_no
          AND TRIM(chest_no) = v_old_chest_no;
      END IF;
    END IF;

    UPDATE public.replacements
    SET
      status = 'Approved',
      admin_remarks = p_remarks,
      reviewed_by = auth.uid(),
      updated_at = now()
    WHERE id = p_replacement_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'Approved',
      'old_chest_no', v_old_chest_no,
      'new_chest_no', v_new_chest_no
    );
  ELSE
    UPDATE public.replacements
    SET
      status = 'Rejected',
      admin_remarks = p_remarks,
      reviewed_by = auth.uid(),
      updated_at = now()
    WHERE id = p_replacement_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'Rejected'
    );
  END IF;
END;
$function$;

-- 3. validate_submission_entry
CREATE OR REPLACE FUNCTION public.validate_submission_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role public.user_role;
  v_event RECORD;
  v_settings RECORD;
  v_reg_chest TEXT;
  v_assigned_chest TEXT;
  v_reg_deadline TIMESTAMPTZ;
  v_fine_deadline TIMESTAMPTZ;
  v_clean_input TEXT;
  v_input_bigint BIGINT;
BEGIN
  IF current_setting('app.skip_chest_trigger', true) = 'on' THEN
    RETURN NEW;
  END IF;

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
  v_input_bigint := CASE
    WHEN v_clean_input ~ '^[1-9][0-9]*$' AND length(v_clean_input) <= 18 THEN v_clean_input::BIGINT
    ELSE NULL
  END;

  SELECT
    r.chest_no,
    cn.chest_no::TEXT
  INTO v_reg_chest, v_assigned_chest
  FROM public.registrations r
  LEFT JOIN public.chest_no cn
    ON cn.chest_no = (
      CASE
        WHEN TRIM(r.chest_no) ~ '^[1-9][0-9]*$' AND length(TRIM(r.chest_no)) <= 18
        THEN TRIM(r.chest_no)::BIGINT
        ELSE NULL
      END
    )
    OR cn.cic_no = public.resolve_student_cic_no(r.chest_no, r.college_affl_no)
  LEFT JOIN public.students s
    ON s.cic_no = cn.cic_no
  WHERE r.item_id = NEW.item_id
    AND r.college_affl_no = NEW.college_affl_no
    AND (
      UPPER(TRIM(r.chest_no)) = v_clean_input
      OR (v_input_bigint IS NOT NULL AND cn.chest_no = v_input_bigint)
      OR COALESCE(s.cic_no::text, '') = TRIM(COALESCE(NEW.chest_no, ''))
      OR 'ST-' || COALESCE(s.cic_no::text, '') = v_clean_input
      OR COALESCE(s.id::text, '') = TRIM(COALESCE(NEW.chest_no, ''))
    )
  LIMIT 1;

  IF v_reg_chest IS NULL THEN
    RAISE EXCEPTION 'Participant % is not actively registered for event %.', NEW.chest_no, COALESCE(v_event.item_code, NEW.item_id::text)
      USING ERRCODE = '23514';
  END IF;

  NEW.chest_no := COALESCE(NULLIF(TRIM(v_assigned_chest), ''), TRIM(v_reg_chest));

  NEW.submitted_at := now();
  BEGIN
    v_role := (SELECT public.auth_user_role());
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  IF v_role IS NULL OR v_role NOT IN ('admin'::public.user_role, 'convenor'::public.user_role) OR NEW.status IS NULL THEN
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
$function$;

COMMIT;
