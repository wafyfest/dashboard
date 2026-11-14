-- Migration: 20261115001700_enforce_event_category_active_locks.sql
-- Description: Enforce category active state (is_active), universal deadline tiers
--              from event_deadline_settings in register_college_for_item_tx,
--              ensure late registrations and fine_status are strictly persisted,
--              and provide sync_all_late_registrations() to keep late_registrations
--              synchronized across all events and institutions.

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
  v_dl RECORD;
  v_event_kind TEXT;
  v_reg_deadline TIMESTAMPTZ;
  v_fine_end TIMESTAMPTZ;
  v_super_fine_end TIMESTAMPTZ;
  v_has_override BOOLEAN := false;
  v_entry_lock_open BOOLEAN;
  v_entry_lock_updated TIMESTAMPTZ;
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

  -- 1. Lock & fetch Event from public.events
  SELECT * INTO v_item
  FROM public.events
  WHERE item_id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event % not found', p_item_id;
  END IF;

  -- 2. Lock & fetch College
  SELECT * INTO v_college
  FROM public.colleges
  WHERE affl_no = p_college_affl_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'College % not found', p_college_affl_no;
  END IF;

  -- 3. Fetch Fest Settings
  SELECT * INTO v_settings
  FROM public.fest_settings
  LIMIT 1;

  -- 4. Fetch Entry Lock for this college and event
  SELECT is_open, updated_at INTO v_entry_lock_open, v_entry_lock_updated
  FROM public.entry_locks
  WHERE item_id = p_item_id AND college_affl_no = p_college_affl_no;

  -- 5. Determine event kind and load schedule from event_deadline_settings
  IF COALESCE(v_item.is_screening, false) = true OR COALESCE(v_item.mode::text, '') = 'screening' THEN
    v_event_kind := 'screening';
  ELSIF COALESCE(v_item.is_submission, false) = true OR COALESCE(v_item.mode::text, '') = 'submission' THEN
    v_event_kind := 'submission';
  ELSIF LOWER(COALESCE(v_item.mode::text, '')) IN ('onstage', 'on_stage', 'on stage') THEN
    v_event_kind := 'onstage';
  ELSIF LOWER(COALESCE(v_item.mode::text, '')) IN ('offstage', 'off_stage', 'off stage') THEN
    v_event_kind := 'offstage';
  ELSE
    v_event_kind := 'general';
  END IF;

  SELECT * INTO v_dl
  FROM public.event_deadline_settings
  WHERE event_kind = v_event_kind
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_dl
    FROM public.event_deadline_settings
    WHERE event_kind = 'general'
    LIMIT 1;
  END IF;

  -- Resolve deadlines safely
  v_reg_deadline := COALESCE(v_dl.no_fine_deadline, v_item.reg_deadline, v_settings.reg_deadline);
  v_fine_end := COALESCE(v_dl.fine_deadline, v_item.fine_deadline, v_settings.fine_deadline);
  v_super_fine_end := CASE
    WHEN COALESCE(v_dl.has_super_fine, true) THEN COALESCE(v_dl.super_fine_deadline, v_fine_end)
    ELSE v_fine_end
  END;

  IF v_role::text = 'admin' THEN
    NULL;
  ELSIF v_role::text = 'college' THEN
    IF v_affl IS NULL OR v_affl <> p_college_affl_no THEN
      RAISE EXCEPTION 'Access denied: not authorized for college %', p_college_affl_no;
    END IF;

    v_has_override := COALESCE(v_college.manual_lock_override, false);

    -- Strict College Lock Check:
    IF NOT v_has_override THEN
      RAISE EXCEPTION 'Registration locked: Your institution (#%) has been locked by fest administration', p_college_affl_no
        USING ERRCODE = 'P0005';
    END IF;

    -- Strict Category Active Check:
    -- If this kind of event is disabled by admin, block registration for all events of this kind.
    IF COALESCE(v_dl.is_active, true) = false THEN
      RAISE EXCEPTION 'Registration disabled: Registrations for % events are currently disabled by fest administration', v_event_kind
        USING ERRCODE = 'P0004';
    END IF;

    -- Check if registration has opened yet
    IF v_dl.start_time IS NOT NULL AND now() < v_dl.start_time THEN
      RAISE EXCEPTION 'Registration not open: Registrations for % events have not opened yet', v_event_kind
        USING ERRCODE = 'P0006';
    END IF;

    -- Check Deadlines and Evaluate Late Fine Status
    IF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline THEN
      IF v_fine_end IS NOT NULL AND now() <= v_fine_end THEN
        v_is_late := true;
        v_fine_tier := 'fine';
        v_fine_amount := COALESCE(v_dl.fine_amount, v_settings.fine_amount, 500);
        v_late_reason := 'Fine Period (₹' || v_fine_amount || ') — within fine window';
      ELSIF v_super_fine_end IS NOT NULL AND now() <= v_super_fine_end AND COALESCE(v_dl.has_super_fine, true) = true THEN
        v_is_late := true;
        v_fine_tier := 'super_fine';
        v_fine_amount := COALESCE(v_dl.super_fine_amount, v_settings.super_fine_amount, 1000);
        v_late_reason := 'Super Fine Period (₹' || v_fine_amount || ') — super fine window';
      ELSE
        -- Past super fine deadline:
        -- Since college is manually unlocked by fest administration (manual_lock_override = true),
        -- permit registration with super fine rather than throwing a hard exception
        v_is_late := true;
        v_fine_tier := 'super_fine';
        v_fine_amount := COALESCE(v_dl.super_fine_amount, v_settings.super_fine_amount, 1000);
        v_late_reason := 'Late entry permitted under manual administrative unlock';
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

    -- Re-evaluate college fine status
    UPDATE public.colleges c
    SET fine_status = EXISTS (
      SELECT 1 FROM public.late_registrations lr
      WHERE lr.college_affl_no = p_college_affl_no
        AND COALESCE(lr.is_waived, false) = false
    )
    WHERE c.affl_no = p_college_affl_no;

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

    -- Update fine_status on college
    UPDATE public.colleges
    SET fine_status = true
    WHERE affl_no = p_college_affl_no;
  ELSE
    -- Re-evaluate college fine status if not late
    UPDATE public.colleges c
    SET fine_status = EXISTS (
      SELECT 1 FROM public.late_registrations lr
      WHERE lr.college_affl_no = p_college_affl_no
        AND COALESCE(lr.is_waived, false) = false
    )
    WHERE c.affl_no = p_college_affl_no;
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

-- Synchronization Procedure: sync_all_late_registrations()
CREATE OR REPLACE FUNCTION public.sync_all_late_registrations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $sync$
DECLARE
  v_synced_count INT := 0;
  v_rec RECORD;
  v_kind TEXT;
  v_dl RECORD;
  v_reg_deadline TIMESTAMPTZ;
  v_fine_end TIMESTAMPTZ;
  v_super_fine_end TIMESTAMPTZ;
  v_fine_tier TEXT;
  v_fine_amount INT;
  v_late_reason TEXT;
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.fest_settings LIMIT 1;

  FOR v_rec IN
    SELECT 
      r.id AS reg_id,
      r.item_id,
      r.college_affl_no,
      r.cic_no,
      r.chest_no,
      r.created_at,
      e.mode,
      e.is_screening,
      e.is_submission,
      e.reg_deadline AS item_reg_deadline,
      e.fine_deadline AS item_fine_deadline,
      e.super_fine_deadline AS item_super_fine_deadline
    FROM public.registrations r
    JOIN public.events e ON e.item_id = r.item_id
  LOOP
    -- 1. Determine event kind
    IF COALESCE(v_rec.is_screening, false) = true OR COALESCE(v_rec.mode::text, '') = 'screening' THEN
      v_kind := 'screening';
    ELSIF COALESCE(v_rec.is_submission, false) = true OR COALESCE(v_rec.mode::text, '') = 'submission' THEN
      v_kind := 'submission';
    ELSIF LOWER(COALESCE(v_rec.mode::text, '')) IN ('onstage', 'on_stage', 'on stage') THEN
      v_kind := 'onstage';
    ELSIF LOWER(COALESCE(v_rec.mode::text, '')) IN ('offstage', 'off_stage', 'off stage') THEN
      v_kind := 'offstage';
    ELSE
      v_kind := 'general';
    END IF;

    -- 2. Fetch deadline settings for this kind
    SELECT * INTO v_dl FROM public.event_deadline_settings WHERE event_kind = v_kind LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO v_dl FROM public.event_deadline_settings WHERE event_kind = 'general' LIMIT 1;
    END IF;

    v_reg_deadline := COALESCE(v_dl.no_fine_deadline, v_rec.item_reg_deadline, v_settings.reg_deadline);
    v_fine_end := COALESCE(v_dl.fine_deadline, v_rec.item_fine_deadline, v_settings.fine_deadline);
    v_super_fine_end := CASE
      WHEN COALESCE(v_dl.has_super_fine, true) THEN COALESCE(v_dl.super_fine_deadline, v_fine_end)
      ELSE v_fine_end
    END;

    -- 3. Check if registration created_at was after deadline
    IF v_reg_deadline IS NOT NULL AND v_rec.created_at > v_reg_deadline THEN
      IF v_fine_end IS NOT NULL AND v_rec.created_at <= v_fine_end THEN
        v_fine_tier := 'fine';
        v_fine_amount := COALESCE(v_dl.fine_amount, 500);
        v_late_reason := 'Fine Period (₹' || v_fine_amount || ') — within fine window';
      ELSE
        v_fine_tier := 'super_fine';
        v_fine_amount := COALESCE(v_dl.super_fine_amount, 1000);
        v_late_reason := 'Super Fine Period (₹' || v_fine_amount || ') — super fine window';
      END IF;

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
      VALUES (
        v_rec.item_id,
        v_rec.college_affl_no,
        v_rec.cic_no,
        v_rec.chest_no,
        v_late_reason,
        v_fine_tier,
        v_fine_amount,
        v_reg_deadline,
        v_rec.created_at
      )
      ON CONFLICT (item_id, chest_no) DO UPDATE
      SET
        cic_no = COALESCE(EXCLUDED.cic_no, public.late_registrations.cic_no),
        late_reason = COALESCE(public.late_registrations.late_reason, EXCLUDED.late_reason),
        fine_tier = COALESCE(public.late_registrations.fine_tier, EXCLUDED.fine_tier),
        fine_amount = COALESCE(public.late_registrations.fine_amount, EXCLUDED.fine_amount),
        effective_deadline = COALESCE(public.late_registrations.effective_deadline, EXCLUDED.effective_deadline),
        registered_at = COALESCE(public.late_registrations.registered_at, EXCLUDED.registered_at);

      v_synced_count := v_synced_count + 1;
    END IF;
  END LOOP;

  -- Flag all colleges that have active late entries
  UPDATE public.colleges c
  SET fine_status = EXISTS (
    SELECT 1 FROM public.late_registrations lr
    WHERE lr.college_affl_no = c.affl_no
      AND COALESCE(lr.is_waived, false) = false
  );

  RETURN jsonb_build_object(
    'synced_count', v_synced_count,
    'timestamp', now()
  );
END;
$sync$;

REVOKE EXECUTE ON FUNCTION public.sync_all_late_registrations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_all_late_registrations() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) TO authenticated, service_role;

COMMIT;
