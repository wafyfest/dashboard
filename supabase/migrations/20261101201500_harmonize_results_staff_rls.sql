-- Migration: 20261101201500_harmonize_results_staff_rls.sql
-- Description: Ensure result_entry, convenor, and admin have full access to select, insert, update (including publishing), and delete results.

-- 1. Select Staff Policy
DROP POLICY IF EXISTS "results_select_staff" ON public.results;
CREATE POLICY "results_select_staff"
  ON public.results FOR SELECT
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) IN ('admin'::user_role, 'result_entry'::user_role, 'convenor'::user_role)
  );

-- 2. Insert Staff Policy
DROP POLICY IF EXISTS "results_insert_staff" ON public.results;
CREATE POLICY "results_insert_staff"
  ON public.results FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.auth_user_role()) IN ('admin'::user_role, 'result_entry'::user_role, 'convenor'::user_role)
  );

-- 3. Update Staff Policy (including draft score updates and toggle publishing)
DROP POLICY IF EXISTS "results_update_admin" ON public.results;
DROP POLICY IF EXISTS "results_update_staff" ON public.results;
CREATE POLICY "results_update_staff"
  ON public.results FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) IN ('admin'::user_role, 'result_entry'::user_role, 'convenor'::user_role)
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) IN ('admin'::user_role, 'result_entry'::user_role, 'convenor'::user_role)
  );

-- 4. Delete Staff Policy (clean up duplicates and allow resubmissions)
DROP POLICY IF EXISTS "results_delete_draft_staff" ON public.results;
DROP POLICY IF EXISTS "results_delete_staff" ON public.results;
CREATE POLICY "results_delete_staff"
  ON public.results FOR DELETE
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) IN ('admin'::user_role, 'result_entry'::user_role, 'convenor'::user_role)
  );
