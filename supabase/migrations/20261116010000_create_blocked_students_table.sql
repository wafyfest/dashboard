-- Migration: 20261116010000_create_blocked_students_table.sql
-- Description: Dedicated table public.blocked_students for student blocking and committee exclusions.
--              Enforces student block restrictions inside public.register_college_for_item_tx.

BEGIN;

-- 1. Create blocked_students table
CREATE TABLE IF NOT EXISTS public.blocked_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  cic_no BIGINT NOT NULL,
  college_affl_no INT REFERENCES public.colleges(affl_no) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  blocked_by TEXT,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_blocked_students_student UNIQUE (student_id)
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_blocked_students_active 
  ON public.blocked_students(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_blocked_students_cic 
  ON public.blocked_students(cic_no);

CREATE INDEX IF NOT EXISTS idx_blocked_students_college 
  ON public.blocked_students(college_affl_no);

CREATE INDEX IF NOT EXISTS idx_blocked_students_student_id 
  ON public.blocked_students(student_id);

-- 2. Row Level Security & Realtime
ALTER TABLE public.blocked_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_students REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Admin and convenor full access to blocked_students" ON public.blocked_students;
CREATE POLICY "Admin and convenor full access to blocked_students"
  ON public.blocked_students
  FOR ALL
  TO authenticated
  USING (
    public.auth_user_role() IN ('admin', 'convenor')
    OR current_user IN ('postgres', 'service_role')
  )
  WITH CHECK (
    public.auth_user_role() IN ('admin', 'convenor')
    OR current_user IN ('postgres', 'service_role')
  );

DROP POLICY IF EXISTS "Authenticated users can read blocked_students" ON public.blocked_students;
CREATE POLICY "Authenticated users can read blocked_students"
  ON public.blocked_students
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Update register_college_for_item_tx to strictly reject blocked students
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

  IF v_dl IS NOT NULL THEN
    v_reg_deadline := v_dl.no_fine_deadline;
    v_fine_end := v_dl.fine_deadline;
    v_super_fine_end := v_dl.super_fine_deadline;
  ELSE
    v_reg_deadline := COALESCE(v_item.reg_deadline, v_settings.reg_deadline);
    v_fine_end := COALESCE(v_item.fine_deadline, v_settings.fine_deadline);
    v_super_fine_end := NULL;
  END IF;

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

    IF v_dl IS NOT NULL AND COALESCE(v_dl.is_active, true) = false THEN
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

  -- 8. Participant Resolution, College Affiliation & BLOCKLIST VALIDATION
  IF p_chest_nos IS NOT NULL AND array_length(p_chest_nos, 1) > 0 THEN
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

COMMIT;
