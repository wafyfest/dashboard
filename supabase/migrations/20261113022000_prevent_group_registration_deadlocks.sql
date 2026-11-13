-- Migration: 20261113022000_prevent_group_registration_deadlocks.sql
-- Description: Enforce deterministic ascending chest_no ordering in register_college_for_item_tx
-- to mathematically eliminate cross-transaction AB-BA deadlocks during concurrent group event registrations.

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
  IF v_role = 'admin'::user_role THEN
    -- Admin authorized for all colleges and bypasses lock checks
  ELSIF v_role = 'college'::user_role AND (v_affl IS NOT NULL AND v_affl = p_college_affl_no) THEN
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
$$;

REVOKE EXECUTE ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) TO authenticated, service_role;

COMMENT ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) IS
  'Registers college entries with deterministic ORDER BY chest_no ASC to prevent concurrent group registration deadlocks.';
