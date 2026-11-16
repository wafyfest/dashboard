-- Migration: 20261116050000_sync_deadlines_from_admin_control.sql
-- Description:
--   1. Fix PL/pgSQL composite-null check on v_dl record in register_college_for_item_tx
--      and sync_all_late_registrations (v_dl.id IS NOT NULL instead of v_dl IS NOT NULL).
--   2. Synchronize events table reg_deadline and fine_deadline with event_deadline_settings
--      for screening events.
--   3. Purge erroneous late_registrations rows for screening events registered before the Nov 22 cutoff.
--   4. Re-evaluate colleges.fine_status.

BEGIN;

-- 1. Synchronize screening events deadlines directly in events table
UPDATE public.events
SET 
  reg_deadline = '2026-11-22T16:30:00.000Z',
  fine_deadline = '2026-11-24T16:30:00.000Z'
WHERE is_screening = true;

-- 2. Purge erroneous late registrations for screening events registered on or before free cutoff
DELETE FROM public.late_registrations lr
USING public.events e
WHERE lr.item_id = e.item_id
  AND e.is_screening = true
  AND lr.registered_at <= '2026-11-22T16:30:00.000Z';

-- 3. Re-evaluate colleges fine_status for all colleges
UPDATE public.colleges c
SET fine_status = EXISTS (
  SELECT 1 FROM public.late_registrations lr
  WHERE lr.college_affl_no = c.affl_no
    AND COALESCE(lr.is_waived, false) = false
)
WHERE c.affl_no > 0;

-- 4. Update register_college_for_item_tx with robust v_dl.id IS NOT NULL check
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
  v_blocked_name TEXT;
  v_blocked_reason TEXT;
  v_is_special_group BOOLEAN := false;
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

  -- Robust check on v_dl.id to avoid composite-null pitfalls
  IF v_dl.id IS NOT NULL THEN
    v_reg_deadline := v_dl.no_fine_deadline;
    v_fine_end := v_dl.fine_deadline;
    v_super_fine_end := v_dl.super_fine_deadline;
  ELSE
    v_reg_deadline := COALESCE(v_item.reg_deadline, v_settings.reg_deadline);
    v_fine_end := COALESCE(v_item.fine_deadline, v_settings.fine_deadline);
    v_super_fine_end := NULL;
  END IF;

  -- Fallback to item reg_deadline if v_reg_deadline is somehow still null
  v_reg_deadline := COALESCE(v_reg_deadline, v_item.reg_deadline, v_settings.reg_deadline);

  -- Check admin override: college manual unlock or explicit entry_lock cell
  IF COALESCE(v_college.manual_lock_override, false) = true THEN
    v_has_override := true;
  ELSIF v_entry_lock_open = true AND v_entry_lock_updated IS NOT NULL THEN
    IF v_reg_deadline IS NOT NULL AND v_entry_lock_updated > v_reg_deadline THEN
      v_has_override := true;
    END IF;
  END IF;

  -- 6. Role-based Authorization & Deadline Lock Validation
  IF v_role = 'college' THEN
    IF v_affl IS NULL OR v_affl <> p_college_affl_no THEN
      RAISE EXCEPTION 'Access denied: college account % cannot register for college affiliation %',
        COALESCE(v_affl::text, 'none'), p_college_affl_no;
    END IF;

    IF COALESCE(v_college.manual_lock_override, false) = false THEN
      RAISE EXCEPTION 'Registration locked: Your institution (#%) has been locked by fest administration.',
        p_college_affl_no;
    END IF;

    IF v_entry_lock_open = false OR COALESCE(v_item.is_locked, false) = true THEN
      RAISE EXCEPTION 'Registration for event % is locked', p_item_id;
    END IF;

    IF v_dl.id IS NOT NULL AND COALESCE(v_dl.is_active, true) = false THEN
      RAISE EXCEPTION 'Registration disabled: % events registration is currently closed by administration',
        v_event_kind;
    END IF;

    IF NOT v_has_override THEN
      IF v_super_fine_end IS NOT NULL AND now() > v_super_fine_end THEN
        RAISE EXCEPTION 'Registration deadline passed (super fine closed) for event %', p_item_id;
      ELSIF v_fine_end IS NOT NULL AND now() > v_fine_end THEN
        RAISE EXCEPTION 'Registration deadline passed (fine closed) for event %', p_item_id;
      ELSIF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline THEN
        RAISE EXCEPTION 'Registration deadline passed for event %', p_item_id;
      END IF;
    END IF;
  ELSIF v_role NOT IN ('admin', 'convenor') THEN
    RAISE EXCEPTION 'Unauthorized role for registration';
  END IF;

  -- 7. Determine late registration tier and fine amount
  IF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline THEN
    v_is_late := true;
    IF v_super_fine_end IS NOT NULL AND now() > v_fine_end THEN
      v_fine_tier := 'super_fine';
      v_fine_amount := COALESCE(v_dl.super_fine_amount, 200);
      v_late_reason := 'Late Registration (Super Fine Tier)';
    ELSE
      v_fine_tier := 'fine';
      v_fine_amount := COALESCE(v_dl.fine_amount, 100);
      v_late_reason := 'Late Registration (Standard Fine Tier)';
    END IF;
  ELSE
    v_is_late := false;
  END IF;

  -- Check if target event is a Special Group Event (e.g. SE090 Campaign Setting, SE091 Moral Video Making)
  v_is_special_group := (
    COALESCE(v_item.point_type::text, '') = 'group' AND (
      COALESCE(v_item.phase::text, '') ILIKE 'special%' OR
      UPPER(TRIM(COALESCE(v_item.category::text, ''))) = 'D' OR
      COALESCE(v_item.item_code::text, '') ~* '^SE[0-9]+'
    )
  );

  -- 8. Participant Resolution, College Affiliation & BLOCKLIST VALIDATION
  IF p_chest_nos IS NOT NULL AND array_length(p_chest_nos, 1) > 0 THEN
    -- If this is an institutional delegation registration for a special group event,
    -- or if explicit college entry marker is passed:
    IF v_is_special_group OR (
      p_chest_nos[1] ILIKE 'COL-%' OR
      p_chest_nos[1] ILIKE 'COLLEGE%'
    ) THEN
      v_normalized_cics := ARRAY[NULL::BIGINT];
      v_normalized_chests := ARRAY['COL-' || p_college_affl_no::text];
    ELSE
      FOREACH v_raw_id IN ARRAY p_chest_nos LOOP
        v_raw_trimmed := TRIM(COALESCE(v_raw_id, ''));
        IF v_raw_trimmed = '' OR v_raw_trimmed IN ('—', '-', 'null', 'undefined') THEN
          CONTINUE;
        END IF;

        v_raw_bigint := CASE
          WHEN v_raw_trimmed ~ '^[1-9][0-9]*$' AND length(v_raw_trimmed) <= 18 THEN v_raw_trimmed::BIGINT
          ELSE NULL
        END;

        v_cic := NULL;
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

        -- BLOCKLIST CHECK: Check if student is active in public.blocked_students
        IF EXISTS (
          SELECT 1 FROM public.blocked_students bs
          WHERE bs.cic_no = v_cic AND bs.is_active = true
        ) THEN
          SELECT s.name, COALESCE(bs.reason, 'Administrative Block')
          INTO v_blocked_name, v_blocked_reason
          FROM public.blocked_students bs
          JOIN public.students s ON s.id = bs.student_id
          WHERE bs.cic_no = v_cic AND bs.is_active = true
          LIMIT 1;

          RAISE EXCEPTION 'Student % (CIC %) is blocked from festival participation (Reason: %)',
            COALESCE(v_blocked_name, 'Participant'), v_cic, COALESCE(v_blocked_reason, 'Administrative Block');
        END IF;

        v_assigned := public.ensure_student_chest_no(v_cic, p_college_affl_no);
        IF v_assigned IS NOT NULL AND NOT (v_cic = ANY(v_normalized_cics)) THEN
          v_normalized_cics := array_append(v_normalized_cics, v_cic);
          v_normalized_chests := array_append(v_normalized_chests, v_assigned);
        END IF;
      END LOOP;
    END IF;
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

  -- Insert into public.registrations
  RETURN QUERY
  INSERT INTO public.registrations (
    item_id,
    college_affl_no,
    cic_no,
    chest_no,
    created_at
  )
  SELECT
    p_item_id,
    p_college_affl_no,
    p.cic_no,
    p.chest_no,
    now()
  FROM (
    SELECT unnest(v_normalized_cics) AS cic_no, unnest(v_normalized_chests) AS chest_no
  ) p
  ORDER BY p.chest_no ASC
  RETURNING *;
END;
$function$;

-- 5. Update sync_all_late_registrations with robust v_dl.id IS NOT NULL check
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
      e.fine_deadline AS item_fine_deadline
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

    IF v_dl.id IS NOT NULL THEN
      v_reg_deadline := v_dl.no_fine_deadline;
      v_fine_end := v_dl.fine_deadline;
      v_super_fine_end := CASE
        WHEN COALESCE(v_dl.has_super_fine, true) THEN COALESCE(v_dl.super_fine_deadline, v_fine_end)
        ELSE v_fine_end
      END;
    ELSE
      v_reg_deadline := COALESCE(v_rec.item_reg_deadline, v_settings.reg_deadline);
      v_fine_end := COALESCE(v_rec.item_fine_deadline, v_settings.fine_deadline);
      v_super_fine_end := v_fine_end;
    END IF;

    v_reg_deadline := COALESCE(v_reg_deadline, v_rec.item_reg_deadline, v_settings.reg_deadline);

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
  )
  WHERE c.affl_no > 0;

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
