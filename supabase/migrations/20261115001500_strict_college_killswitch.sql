-- Migration: 20261115001500_strict_college_killswitch.sql
-- Description: Absolute college-level lock killswitch.
--              When a college has manual_lock_override = false, they are strictly blocked
--              from registering or altering any event rosters.

BEGIN;

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
  v_entry_lock_updated TIMESTAMPTZ;
  v_has_clearance BOOLEAN := false;
  v_is_late BOOLEAN := false;
  v_fine_tier TEXT := 'fine';
  v_fine_amount INT := 0;
  v_late_reason TEXT := 'Late Registration';
  v_first_group_chest TEXT;
  v_normalized_cics BIGINT[] := ARRAY[]::BIGINT[];
  v_normalized_chests TEXT[] := ARRAY[]::TEXT[];
  v_raw_id TEXT;
  v_raw_trimmed TEXT;
  v_raw_bigint BIGINT;
  v_cic BIGINT;
  v_assigned TEXT;
BEGIN
  v_role := (SELECT public.auth_user_role());
  v_affl := (SELECT public.auth_user_affl_no());

  IF v_role IS NULL AND (
    COALESCE(auth.jwt() ->> 'role', '') = 'service_role' OR
    current_user = 'service_role' OR
    current_user = 'postgres'
  ) THEN
    v_role := 'admin'::public.user_role;
  END IF;

  SELECT * INTO v_item
  FROM public.items
  WHERE item_id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event % not found', p_item_id;
  END IF;

  SELECT * INTO v_college
  FROM public.colleges
  WHERE affl_no = p_college_affl_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'College % not found', p_college_affl_no;
  END IF;

  SELECT * INTO v_settings
  FROM public.fest_settings
  LIMIT 1;

  SELECT is_open, updated_at INTO v_entry_lock_open, v_entry_lock_updated
  FROM public.entry_locks
  WHERE item_id = p_item_id AND college_affl_no = p_college_affl_no;

  v_reg_deadline := COALESCE(v_item.reg_deadline, v_settings.reg_deadline);
  v_fine_end := COALESCE(v_item.fine_deadline, v_settings.fine_deadline);
  v_super_fine_end := COALESCE(v_item.super_fine_deadline, v_settings.super_fine_deadline, v_fine_end);

  IF v_role::text = 'admin' THEN
    NULL;
  ELSIF v_role::text = 'college' THEN
    IF v_affl IS NULL OR v_affl <> p_college_affl_no THEN
      RAISE EXCEPTION 'Access denied: not authorized for college %', p_college_affl_no;
    END IF;

    v_has_override := COALESCE(v_college.manual_lock_override, false);

    -- Strict College Lock Check:
    -- If college is locked (manual_lock_override = false), registration is strictly blocked across all events.
    IF NOT v_has_override THEN
      RAISE EXCEPTION 'Registration locked: Your institution (#%) has been locked by fest administration', p_college_affl_no
        USING ERRCODE = 'P0005';
    END IF;

    v_has_clearance := v_has_override OR (
      v_entry_lock_open = true AND (
        v_entry_lock_updated IS NULL OR
        v_reg_deadline IS NULL OR
        v_entry_lock_updated >= v_reg_deadline
      )
    );

    IF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline THEN
      IF NOT v_has_clearance THEN
        IF v_fine_end IS NOT NULL AND now() <= v_fine_end THEN
          v_is_late := true;
          v_fine_tier := 'fine';
          v_fine_amount := COALESCE(v_item.fine_amount, v_settings.fine_amount, 500);
          v_late_reason := 'Registration completed during fine tier window';
        ELSIF v_super_fine_end IS NOT NULL AND now() <= v_super_fine_end THEN
          v_is_late := true;
          v_fine_tier := 'super_fine';
          v_fine_amount := COALESCE(v_item.super_fine_amount, v_settings.super_fine_amount, 1000);
          v_late_reason := 'Registration completed during super fine tier window';
        ELSE
          RAISE EXCEPTION 'Registration closed: Deadline passed for event %', COALESCE(v_item.item_code, p_item_id::text)
            USING ERRCODE = 'P0003';
        END IF;
      END IF;
    END IF;

    IF v_entry_lock_open = false OR (v_entry_lock_open IS NULL AND v_item.is_locked = true) THEN
      RAISE EXCEPTION 'Registration locked: Event % is locked by fest administration', COALESCE(v_item.item_code, p_item_id::text)
        USING ERRCODE = 'P0004';
    END IF;
  ELSE
    RAISE EXCEPTION 'Access denied: not authorized for college %', p_college_affl_no;
  END IF;

  -- Validate participant belong to this college and resolve cic_no + chest_no
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
          OR (v_raw_bigint IS NOT NULL AND s.cic_no = v_raw_bigint)
          OR s.cic_no::text = v_raw_trimmed
          OR 'ST-' || s.cic_no::text = UPPER(v_raw_trimmed)
          OR s.id::text = v_raw_trimmed
        )
      ORDER BY
        CASE
          WHEN v_raw_bigint IS NOT NULL AND s.cic_no = v_raw_bigint THEN 0
          WHEN v_raw_bigint IS NOT NULL AND cn.chest_no = v_raw_bigint THEN 1
          ELSE 2
        END,
        s.cic_no ASC
      LIMIT 1;

      IF v_cic IS NULL THEN
        RAISE EXCEPTION 'All participants must belong to college affiliation %', p_college_affl_no;
      END IF;

      v_assigned := public.ensure_student_chest_no(v_cic, p_college_affl_no);
      IF v_assigned IS NOT NULL AND NOT (v_cic = ANY(v_normalized_cics)) THEN
        v_normalized_cics := array_append(v_normalized_cics, v_cic);
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
      cic_no,
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
      p.cic_no,
      p.chest_no,
      v_late_reason,
      v_fine_tier,
      v_fine_amount,
      v_reg_deadline,
      now()
    FROM (
      SELECT unnest(v_normalized_cics) AS cic_no, unnest(v_normalized_chests) AS chest_no
    ) p
    ORDER BY p.chest_no ASC
    ON CONFLICT (item_id, chest_no) DO UPDATE
    SET
      cic_no = EXCLUDED.cic_no,
      late_reason = EXCLUDED.late_reason,
      fine_tier = EXCLUDED.fine_tier,
      fine_amount = EXCLUDED.fine_amount,
      effective_deadline = EXCLUDED.effective_deadline,
      registered_at = EXCLUDED.registered_at;
  END IF;

  -- Insert registrations with both cic_no and chest_no
  RETURN QUERY
  INSERT INTO public.registrations (item_id, college_affl_no, cic_no, chest_no, created_at)
  SELECT p_item_id, p_college_affl_no, p.cic_no, p.chest_no, now()
  FROM (
    SELECT unnest(v_normalized_cics) AS cic_no, unnest(v_normalized_chests) AS chest_no
  ) p
  ORDER BY p.chest_no ASC
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

COMMIT;
