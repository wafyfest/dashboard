-- Migration: 20261115000900_align_cic_no_and_chest_no_architecture.sql
-- Description: Establish clean dual-identity architecture:
--   1. Add cic_no BIGINT to public.registrations & public.late_registrations.
--   2. Drop destructive deletion trigger trg_cleanup_unused_chest_no_on_reg_change so
--      once allocated in public.chest_no, a student's 101+ badge is permanent.
--   3. Smart backfill:
--      - Purge dummy placeholders (e.g. '—').
--      - When registrations.chest_no contains a student's cic_no, assign to registrations.cic_no.
--      - When registrations.chest_no contains an allocated badge in public.chest_no, populate cic_no.
--      - Ensure every registered student has an allocated 101+ badge in public.chest_no.
--      - Synchronize registrations.chest_no to match the allocated badge.
--   4. Update register_college_for_item_tx, ensure_student_chest_no, and
--      assign_chest_no_on_registration to maintain both cic_no and chest_no.

BEGIN;

-- 1. Schema Alterations
ALTER TABLE public.registrations 
  ADD COLUMN IF NOT EXISTS cic_no BIGINT;

ALTER TABLE public.late_registrations 
  ADD COLUMN IF NOT EXISTS cic_no BIGINT;

CREATE INDEX IF NOT EXISTS idx_registrations_cic_no 
  ON public.registrations(cic_no);

CREATE INDEX IF NOT EXISTS idx_registrations_item_college_cic 
  ON public.registrations(item_id, college_affl_no, cic_no);

CREATE INDEX IF NOT EXISTS idx_late_registrations_cic_no 
  ON public.late_registrations(cic_no);

-- 2. Drop Destructive Trigger
DROP TRIGGER IF EXISTS trg_cleanup_unused_chest_no_on_reg_change ON public.registrations;
DROP FUNCTION IF EXISTS public.cleanup_unused_chest_no_on_reg_change();

-- 3. Data Cleanup & Smart Backfill
-- a) Purge invalid dummy placeholders
DELETE FROM public.registrations 
WHERE TRIM(COALESCE(chest_no, '')) IN ('—', '-', '', 'null', 'undefined')
   OR chest_no IS NULL;

DELETE FROM public.late_registrations 
WHERE TRIM(COALESCE(chest_no, '')) IN ('—', '-', '', 'null', 'undefined')
   OR chest_no IS NULL;

-- b) Resolve cic_no when registrations.chest_no holds a cic_no directly (or 'ST-<cic>')
UPDATE public.registrations r
SET cic_no = s.cic_no
FROM public.students s
WHERE r.cic_no IS NULL
  AND (
    TRIM(r.chest_no) = s.cic_no::text 
    OR TRIM(r.chest_no) = ('ST-' || s.cic_no::text)
    OR r.chest_no = s.id::text
  );

UPDATE public.late_registrations lr
SET cic_no = s.cic_no
FROM public.students s
WHERE lr.cic_no IS NULL
  AND (
    TRIM(lr.chest_no) = s.cic_no::text 
    OR TRIM(lr.chest_no) = ('ST-' || s.cic_no::text)
    OR lr.chest_no = s.id::text
  );

-- c) Resolve cic_no when registrations.chest_no holds a valid 101+ badge matching public.chest_no
UPDATE public.registrations r
SET cic_no = cn.cic_no
FROM public.chest_no cn
WHERE r.cic_no IS NULL
  AND TRIM(r.chest_no) ~ '^[1-9][0-9]*$'
  AND TRIM(r.chest_no)::bigint = cn.chest_no;

UPDATE public.late_registrations lr
SET cic_no = cn.cic_no
FROM public.chest_no cn
WHERE lr.cic_no IS NULL
  AND TRIM(lr.chest_no) ~ '^[1-9][0-9]*$'
  AND TRIM(lr.chest_no)::bigint = cn.chest_no;

-- d) Fallback resolution using resolve_student_cic_no for any remaining
UPDATE public.registrations r
SET cic_no = public.resolve_student_cic_no(r.chest_no, r.college_affl_no)
WHERE r.cic_no IS NULL;

UPDATE public.late_registrations lr
SET cic_no = public.resolve_student_cic_no(lr.chest_no, lr.college_affl_no)
WHERE lr.cic_no IS NULL;

-- e) Remove any unresolvable orphaned registrations
DELETE FROM public.registrations WHERE cic_no IS NULL;
DELETE FROM public.late_registrations WHERE cic_no IS NULL;

-- f) Ensure every student in registrations has an allocated 101+ badge in public.chest_no
DO $$
DECLARE
  r_stu RECORD;
BEGIN
  PERFORM set_config('app.skip_chest_trigger', 'on', true);

  FOR r_stu IN
    SELECT DISTINCT r.cic_no, r.college_affl_no
    FROM public.registrations r
    LEFT JOIN public.chest_no cn ON cn.cic_no = r.cic_no
    WHERE r.cic_no IS NOT NULL AND cn.cic_no IS NULL
    ORDER BY r.college_affl_no ASC, r.cic_no ASC
  LOOP
    PERFORM public.ensure_student_chest_no(r_stu.cic_no, r_stu.college_affl_no);
  END LOOP;
END $$;

-- g) Synchronize registrations.chest_no and late_registrations.chest_no to match public.chest_no
-- Deduplicate first to prevent 23505 unique constraint collisions
DELETE FROM public.registrations r
USING public.chest_no cn
WHERE r.cic_no = cn.cic_no
  AND TRIM(r.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
  AND EXISTS (
    SELECT 1 FROM public.registrations r2
    WHERE r2.item_id = r.item_id
      AND TRIM(r2.chest_no) = cn.chest_no::TEXT
  );

UPDATE public.registrations r
SET chest_no = cn.chest_no::TEXT
FROM public.chest_no cn
WHERE r.cic_no = cn.cic_no
  AND TRIM(r.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

DELETE FROM public.late_registrations lr
USING public.chest_no cn
WHERE lr.cic_no = cn.cic_no
  AND TRIM(lr.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
  AND EXISTS (
    SELECT 1 FROM public.late_registrations lr2
    WHERE lr2.item_id = lr.item_id
      AND TRIM(lr2.chest_no) = cn.chest_no::TEXT
  );

UPDATE public.late_registrations lr
SET chest_no = cn.chest_no::TEXT
FROM public.chest_no cn
WHERE lr.cic_no = cn.cic_no
  AND TRIM(lr.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

-- 4. Update ensure_student_chest_no
CREATE OR REPLACE FUNCTION public.ensure_student_chest_no(
  p_cic_no BIGINT,
  p_college_affl_no INT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing TEXT;
  v_col INT;
  v_max_chest BIGINT;
  v_next_chest BIGINT;
BEGIN
  IF p_cic_no IS NULL OR p_cic_no <= 0 THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(74829101);

  SELECT chest_no::TEXT INTO v_existing
  FROM public.chest_no
  WHERE cic_no = p_cic_no
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    IF p_college_affl_no IS NOT NULL THEN
      UPDATE public.chest_no
      SET college_affl_no = COALESCE(college_affl_no, p_college_affl_no)
      WHERE cic_no = p_cic_no
        AND college_affl_no IS NULL;
    END IF;
    RETURN v_existing;
  END IF;

  v_col := p_college_affl_no;
  IF v_col IS NULL THEN
    SELECT s.college_affl_no INTO v_col
    FROM public.students s
    WHERE s.cic_no = p_cic_no
    LIMIT 1;
  END IF;

  SELECT COALESCE(MAX(chest_no), 100) INTO v_max_chest
  FROM public.chest_no;

  IF v_max_chest < 100 THEN
    v_max_chest := 100;
  END IF;
  v_next_chest := v_max_chest + 1;

  INSERT INTO public.chest_no (cic_no, chest_no, college_affl_no)
  VALUES (p_cic_no, v_next_chest, v_col)
  ON CONFLICT (cic_no) DO UPDATE
    SET college_affl_no = COALESCE(public.chest_no.college_affl_no, EXCLUDED.college_affl_no)
  RETURNING chest_no::TEXT INTO v_existing;

  RETURN v_existing;
END;
$$;

-- 5. Update assign_chest_no_on_registration Trigger
CREATE OR REPLACE FUNCTION public.assign_chest_no_on_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cic_no BIGINT;
  v_assigned TEXT;
BEGIN
  IF current_setting('app.skip_chest_trigger', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.cic_no IS NOT NULL AND NEW.cic_no > 0 THEN
    v_cic_no := NEW.cic_no;
  ELSE
    v_cic_no := public.resolve_student_cic_no(NEW.chest_no, NEW.college_affl_no);
    IF v_cic_no IS NOT NULL THEN
      NEW.cic_no := v_cic_no;
    END IF;
  END IF;

  IF v_cic_no IS NOT NULL THEN
    v_assigned := public.ensure_student_chest_no(v_cic_no, NEW.college_affl_no);
    IF v_assigned IS NOT NULL THEN
      NEW.chest_no := v_assigned;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_chest_no_on_registration ON public.registrations;
DROP TRIGGER IF EXISTS trg_z_assign_chest_no_on_registration ON public.registrations;
CREATE TRIGGER trg_z_assign_chest_no_on_registration
  BEFORE INSERT OR UPDATE OF chest_no, cic_no
  ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_chest_no_on_registration();

-- 6. Update register_college_for_item_tx to store both cic_no & chest_no
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
  FROM public.events
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
      IF NOT v_has_override THEN
        RAISE EXCEPTION 'Registration locked: Event % is locked by fest administration', COALESCE(v_item.item_code, p_item_id::text)
          USING ERRCODE = 'P0004';
      END IF;
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

  -- Synchronize submission_entries using 101+ chest numbers
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
