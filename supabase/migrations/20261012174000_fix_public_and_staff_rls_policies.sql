-- ====================================================================
-- Migration: 20261012174000_fix_public_and_staff_rls_policies.sql
-- Description: Cleanly scope policies to authenticated for internal tables,
--              and allow public access to published results without permission errors.
-- ====================================================================

-- 1. Results Policies
DROP POLICY IF EXISTS "Results readable if published or staff" ON public.results;
DROP POLICY IF EXISTS "Results insertable by result entry or admin" ON public.results;
DROP POLICY IF EXISTS "Results updatable by admin only" ON public.results;
DROP POLICY IF EXISTS "results_select_published" ON public.results;
DROP POLICY IF EXISTS "results_select_staff" ON public.results;
DROP POLICY IF EXISTS "results_insert_staff" ON public.results;
DROP POLICY IF EXISTS "results_update_admin" ON public.results;

CREATE POLICY "results_select_published"
  ON public.results FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE POLICY "results_select_staff"
  ON public.results FOR SELECT
  TO authenticated
  USING ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'result_entry'::user_role));

CREATE POLICY "results_insert_staff"
  ON public.results FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'result_entry'::user_role));

CREATE POLICY "results_update_admin"
  ON public.results FOR UPDATE
  TO authenticated
  USING ((SELECT public.auth_user_role()) = 'admin'::user_role)
  WITH CHECK ((SELECT public.auth_user_role()) = 'admin'::user_role);

-- 2. Code Letters Policies (Internal only)
DROP POLICY IF EXISTS "Code letters managed by stage controller or admin" ON public.code_letters;
DROP POLICY IF EXISTS "Code letters readable by admin and stage controller" ON public.code_letters;
DROP POLICY IF EXISTS "code_letters_select_staff" ON public.code_letters;
DROP POLICY IF EXISTS "code_letters_modify_staff" ON public.code_letters;

CREATE POLICY "code_letters_select_staff"
  ON public.code_letters FOR SELECT
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) IN ('admin'::user_role, 'stage_controller'::user_role)
    OR college_affl_no = (SELECT public.auth_user_affl_no())
  );

CREATE POLICY "code_letters_modify_staff"
  ON public.code_letters FOR ALL
  TO authenticated
  USING ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'stage_controller'::user_role))
  WITH CHECK ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'stage_controller'::user_role));

-- 3. Registration Logs Policies (Internal only)
DROP POLICY IF EXISTS "Registration logs readable by admin or owning college" ON public.registration_logs;
DROP POLICY IF EXISTS "Registration logs insertable by college or admin" ON public.registration_logs;
DROP POLICY IF EXISTS "registration_logs_select_scoped" ON public.registration_logs;
DROP POLICY IF EXISTS "registration_logs_insert_scoped" ON public.registration_logs;

CREATE POLICY "registration_logs_select_scoped"
  ON public.registration_logs FOR SELECT
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR college_affl_no = (SELECT public.auth_user_affl_no())
  );

CREATE POLICY "registration_logs_insert_scoped"
  ON public.registration_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR college_affl_no = (SELECT public.auth_user_affl_no())
  );

-- 4. Submission Entries Policies (Internal only)
DROP POLICY IF EXISTS "Submissions viewable by owning college or admin" ON public.submission_entries;
DROP POLICY IF EXISTS "Submissions insertable by owning college" ON public.submission_entries;
DROP POLICY IF EXISTS "submission_entries_select_scoped" ON public.submission_entries;
DROP POLICY IF EXISTS "submission_entries_insert_scoped" ON public.submission_entries;

CREATE POLICY "submission_entries_select_scoped"
  ON public.submission_entries FOR SELECT
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR college_affl_no = (SELECT public.auth_user_affl_no())
  );

CREATE POLICY "submission_entries_insert_scoped"
  ON public.submission_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR college_affl_no = (SELECT public.auth_user_affl_no())
  );
