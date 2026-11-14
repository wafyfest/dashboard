-- ============================================================================
-- Migration: 20261115002000_fix_resolve_student_cic_no.sql
-- Description:
--   Removes obsolete reference to dropped `s.chest_no` column inside
--   `public.resolve_student_cic_no()` so triggers and queries validating
--   submission entries or registrations do not throw "column s.chest_no does not exist".
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_student_cic_no(
  p_identifier TEXT,
  p_college_affl_no INT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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

  -- b) Match student record directly in public.students (students table only has cic_no, id, etc.)
  SELECT s.cic_no
  INTO v_cic_no
  FROM public.students s
  WHERE s.id::text = v_raw
     OR s.cic_no::text = v_raw
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
