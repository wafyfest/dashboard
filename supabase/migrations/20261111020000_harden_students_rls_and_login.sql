-- ============================================================================
-- Migration: 20261111010000_harden_students_rls_and_login.sql
-- Description:
--   1. Revoke anonymous/public SELECT access on public.students by replacing
--      any open "students_select_all" policy with a scoped authenticated policy.
--   2. Provide a server-safe SECURITY DEFINER RPC `verify_student_login` that
--      verifies student credentials inside Postgres without exposing the
--      students table, password column, or phone numbers via the Data API.
-- ============================================================================

-- 1. Harden students SELECT RLS policy (idempotent replacement)
DROP POLICY IF EXISTS "Students readable by all" ON public.students;
DROP POLICY IF EXISTS "Students readable by admin or owning college" ON public.students;
DROP POLICY IF EXISTS "students_select_all" ON public.students;
DROP POLICY IF EXISTS "students_select_staff" ON public.students;
DROP POLICY IF EXISTS "students_select_scoped" ON public.students;

CREATE POLICY "students_select_scoped"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.auth_user_role()) IN ('admin'::public.user_role, 'stage_controller'::public.user_role, 'convenor'::public.user_role, 'result_entry'::public.user_role))
    OR (college_affl_no = (SELECT public.auth_user_affl_no()))
  );

-- 2. Credential-verifying login helper (returns only non-sensitive identity
--    fields on exact password match; returns 0 rows otherwise)
CREATE OR REPLACE FUNCTION public.verify_student_login(
  p_identifier TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  cic_no TEXT,
  college_affl_no INT,
  class TEXT,
  phase TEXT,
  chest_no TEXT,
  college_name TEXT,
  college_short_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clean_id TEXT;
  v_clean_pw TEXT;
  v_stu RECORD;
  v_stu_json JSONB;
  v_cic_text TEXT;
  v_stored_pw TEXT;
  v_expected_pw TEXT;
BEGIN
  v_clean_id := regexp_replace(TRIM(COALESCE(p_identifier, '')), '^(ST-|CH-)', '', 'i');
  v_clean_pw := TRIM(COALESCE(p_password, ''));

  IF v_clean_id = '' OR v_clean_pw = '' THEN
    RETURN;
  END IF;

  SELECT s.*, c.name AS col_name, c.short_name AS col_short_name
  INTO v_stu
  FROM public.students s
  LEFT JOIN public.colleges c ON c.affl_no = s.college_affl_no
  WHERE (
    v_clean_id ~ '^\d+$'
    AND (
      (to_jsonb(s)->>'cic_no') = v_clean_id
      OR (to_jsonb(s)->>'admission_no') = v_clean_id
      OR UPPER(COALESCE(s.chest_no, '')) = UPPER('ST-' || v_clean_id)
    )
  )
  OR (
    NOT (v_clean_id ~ '^\d+$')
    AND (
      UPPER(COALESCE(s.chest_no, '')) = UPPER('ST-' || v_clean_id)
      OR UPPER(COALESCE(s.chest_no, '')) = UPPER(v_clean_id)
      OR (to_jsonb(s)->>'admission_no') = v_clean_id
    )
  )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_stu_json := to_jsonb(v_stu);
  v_cic_text := COALESCE(
    NULLIF(TRIM(COALESCE(v_stu_json->>'cic_no', '')), ''),
    NULLIF(TRIM(COALESCE(v_stu_json->>'admission_no', '')), ''),
    v_clean_id
  );
  v_stored_pw := NULLIF(TRIM(COALESCE(v_stu_json->>'password', '')), '');
  v_expected_pw := COALESCE(
    v_stored_pw,
    v_cic_text || '@' || COALESCE(v_stu.college_affl_no::text, '')
  );

  IF v_clean_pw IS DISTINCT FROM v_expected_pw THEN
    RETURN;
  END IF;

  id := v_stu.id;
  name := v_stu.name;
  cic_no := v_cic_text;
  college_affl_no := v_stu.college_affl_no;
  class := v_stu.class;
  phase := v_stu.phase;
  chest_no := COALESCE(NULLIF(TRIM(COALESCE(v_stu.chest_no, '')), ''), 'ST-' || v_cic_text);
  college_name := COALESCE(v_stu.col_name, '');
  college_short_name := COALESCE(v_stu.col_short_name, '');
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_student_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_student_login(TEXT, TEXT) TO anon, authenticated, service_role;
