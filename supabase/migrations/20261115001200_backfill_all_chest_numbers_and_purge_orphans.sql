-- Migration: 20261115001200_backfill_all_chest_numbers_and_purge_orphans.sql
-- Description:
--   1. Harden resolve_student_cic_no to NEVER return phantom cic_no numbers if no student exists.
--   2. Purge orphaned test rows in late_registrations and registrations where student doesn't exist.
--   3. Backfill server-assigned numeric chest numbers (101+) for all remaining students.
--   4. Synchronize registrations and late_registrations chest_no with public.chest_no.

BEGIN;

-- 1. Harden resolve_student_cic_no so it only returns cic_no for REAL students
CREATE OR REPLACE FUNCTION public.resolve_student_cic_no(
  p_identifier TEXT,
  p_college_affl_no INT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw TEXT;
  v_upper TEXT;
  v_digits TEXT;
  v_cic_no BIGINT;
BEGIN
  v_raw := TRIM(COALESCE(p_identifier, ''));
  IF v_raw = '' THEN
    RETURN NULL;
  END IF;
  v_upper := UPPER(v_raw);

  -- a) Direct match against assigned numeric chest_no ('101', '102', ...) in public.chest_no
  IF v_raw ~ '^[1-9][0-9]*$' AND length(v_raw) <= 18 THEN
    SELECT cn.cic_no INTO v_cic_no
    FROM public.chest_no cn
    WHERE cn.chest_no = v_raw::BIGINT
    LIMIT 1;
  END IF;

  IF v_cic_no IS NOT NULL THEN
    RETURN v_cic_no;
  END IF;

  -- b) Match student record directly in public.students
  SELECT s.cic_no
  INTO v_cic_no
  FROM public.students s
  WHERE s.id::text = v_raw
     OR s.cic_no::text = v_raw
     OR UPPER(TRIM(COALESCE(s.chest_no, ''))) = v_upper
     OR 'ST-' || s.cic_no::text = v_upper
     OR 'CH-' || s.cic_no::text = v_upper
  ORDER BY
    CASE WHEN p_college_affl_no IS NOT NULL AND s.college_affl_no = p_college_affl_no THEN 0 ELSE 1 END,
    s.cic_no ASC
  LIMIT 1;

  IF v_cic_no IS NOT NULL THEN
    RETURN v_cic_no;
  END IF;

  -- c) Digits fallback ONLY if the student actually exists in public.students
  v_digits := regexp_replace(v_raw, '\D', '', 'g');
  IF v_digits <> '' AND length(v_digits) <= 18 THEN
    SELECT s.cic_no INTO v_cic_no
    FROM public.students s
    WHERE s.cic_no = v_digits::BIGINT
    LIMIT 1;

    IF v_cic_no IS NOT NULL THEN
      RETURN v_cic_no;
    END IF;

    -- Also check if v_digits is a chest_no in public.chest_no
    SELECT cn.cic_no INTO v_cic_no
    FROM public.chest_no cn
    WHERE cn.chest_no = v_digits::BIGINT
    LIMIT 1;

    IF v_cic_no IS NOT NULL THEN
      RETURN v_cic_no;
    END IF;
  END IF;

  -- Student not found anywhere
  RETURN NULL;
END;
$$;

-- 2. Purge orphaned test rows in late_registrations where cic_no is not a real student
DELETE FROM public.late_registrations lr
WHERE lr.cic_no IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM public.students s
     WHERE s.cic_no = lr.cic_no
   );

-- Also specifically clean test rows for College 76 with chest_no '1113' or cic_no 1113
DELETE FROM public.late_registrations
WHERE college_affl_no = 76
  AND (chest_no = '1113' OR cic_no = 1113);

-- Purge any orphaned registrations if student does not exist
DELETE FROM public.registrations r
WHERE r.cic_no IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM public.students s
     WHERE s.cic_no = r.cic_no
   );

-- 3. Backfill all remaining students with 101+ numeric chest numbers
DO $$
DECLARE
  r_student RECORD;
  v_assigned TEXT;
BEGIN
  PERFORM set_config('app.skip_chest_trigger', 'on', true);

  FOR r_student IN
    SELECT s.cic_no, s.college_affl_no
    FROM public.students s
    LEFT JOIN public.chest_no cn ON cn.cic_no = s.cic_no
    WHERE cn.cic_no IS NULL
    ORDER BY s.college_affl_no ASC, s.cic_no ASC
  LOOP
    v_assigned := public.ensure_student_chest_no(r_student.cic_no, r_student.college_affl_no);
  END LOOP;
END $$;

-- 4. Synchronize registrations & late_registrations to strictly match public.chest_no
UPDATE public.registrations r
SET chest_no = cn.chest_no::TEXT
FROM public.chest_no cn
WHERE r.cic_no = cn.cic_no
  AND TRIM(r.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

UPDATE public.late_registrations lr
SET chest_no = cn.chest_no::TEXT
FROM public.chest_no cn
WHERE lr.cic_no = cn.cic_no
  AND TRIM(lr.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

COMMIT;
