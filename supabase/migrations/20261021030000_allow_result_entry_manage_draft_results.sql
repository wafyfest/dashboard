-- Migration: 20261021030000_allow_result_entry_manage_draft_results.sql
-- Description:
-- Allow result_entry and admin roles to DELETE and UPDATE draft (unpublished) results in public.results.
-- This ensures that correcting and re-submitting score sheets does not silently fail under RLS.

-- 1. Results DELETE policy for draft scores
DROP POLICY IF EXISTS "results_delete_draft_staff" ON public.results;
CREATE POLICY "results_delete_draft_staff"
  ON public.results FOR DELETE
  TO authenticated
  USING (
    ((SELECT public.auth_user_role()) = 'admin'::user_role)
    OR (((SELECT public.auth_user_role()) = 'result_entry'::user_role) AND published = false)
  );

-- 2. Results UPDATE policy: allow result_entry to update draft scores, and admin to update any (including publish)
DROP POLICY IF EXISTS "results_update_admin" ON public.results;
DROP POLICY IF EXISTS "results_update_staff" ON public.results;

CREATE POLICY "results_update_staff"
  ON public.results FOR UPDATE
  TO authenticated
  USING (
    ((SELECT public.auth_user_role()) = 'admin'::user_role)
    OR (((SELECT public.auth_user_role()) = 'result_entry'::user_role) AND published = false)
  )
  WITH CHECK (
    ((SELECT public.auth_user_role()) = 'admin'::user_role)
    OR (((SELECT public.auth_user_role()) = 'result_entry'::user_role) AND published = false)
  );
