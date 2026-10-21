-- Migration: 20261021010000_fix_audit_logs_user_metadata_rls.sql
-- Fixes Supabase Database Linter error 0015_rls_references_user_metadata:
-- "Table public.system_audit_logs has a row level security policy 'Admins full access to system_audit_logs' that references Supabase Auth user_metadata."
-- user_metadata is user-editable and must never be referenced in security contexts.

DROP POLICY IF EXISTS "Admins full access to system_audit_logs" ON public.system_audit_logs;

CREATE POLICY "Admins full access to system_audit_logs"
  ON public.system_audit_logs
  FOR ALL
  TO authenticated
  USING (
    ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    OR ((SELECT public.auth_user_role()) = 'admin'::user_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role
    )
  )
  WITH CHECK (true);
