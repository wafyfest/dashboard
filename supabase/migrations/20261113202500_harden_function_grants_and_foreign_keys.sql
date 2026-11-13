-- Migration: 20261113202500_harden_function_grants_and_foreign_keys.sql
-- Description: Revoke public execution privileges from internal trigger functions
--              and index the foreign key on prefest_registration_settings.

BEGIN;

-- 1. Index foreign key on prefest_registration_settings(updated_by)
CREATE INDEX IF NOT EXISTS idx_prefest_settings_updated_by 
  ON public.prefest_registration_settings(updated_by);

-- 2. Revoke execute privileges on internal trigger functions from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.validate_prefest_registration() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_prefest_submission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_special_event_registration() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_special_event_submission() FROM PUBLIC, anon, authenticated;

-- 3. Optimize audit_logs RLS policy to resolve auth_rls_initplan advisor notice
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.system_audit_logs;
CREATE POLICY "audit_logs_select_admin"
  ON public.system_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    OR ((SELECT public.auth_user_role()) = 'admin'::public.user_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::public.user_role
    )
  );

COMMIT;
