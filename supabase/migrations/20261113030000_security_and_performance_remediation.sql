-- ====================================================================
-- Migration: 20261113030000_security_and_performance_remediation.sql
-- Description:
-- 1. [PERF-01] Drop duplicate redundant unique indexes on public.chest_no
-- 2. [SEC-04] Revoke EXECUTE on internal trigger functions from PUBLIC/anon
-- 3. [SEC-02] Secure system_audit_logs RLS (eliminate anon insertion)
-- 4. [SEC-07] Scope registrations SELECT policy (prevent cross-college scraping)
-- 5. [SEC-03] Ensure quota trigger fires on registrations updates/replacements
-- 6. [SEC-05] Pin search_path = '' across all remaining elevated functions
-- ====================================================================

BEGIN;

-- 1. Drop duplicate indexes on chest_no
DROP INDEX IF EXISTS public.idx_chest_no_chest_no_unique;
DROP INDEX IF EXISTS public.idx_chest_no_cic_no_unique;

-- 2. Revoke execute on internal trigger functions from PUBLIC, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.assign_chest_no_on_registration() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_registration_quota() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_group_submission_entries() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_unused_chest_no_on_reg_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_submission_entry() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_system_event_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_profile_updates() FROM PUBLIC, anon, authenticated;

-- Grant execution to internal database and service roles
GRANT EXECUTE ON FUNCTION public.assign_chest_no_on_registration() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.check_registration_quota() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_group_submission_entries() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_unused_chest_no_on_reg_change() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.validate_submission_entry() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.log_system_event_trigger() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.restrict_profile_updates() TO postgres, service_role;

-- 3. Secure system_audit_logs: Remove public/anon insertion & enforce append-only policies
DROP POLICY IF EXISTS "Allow insertion of system_audit_logs" ON public.system_audit_logs;
DROP POLICY IF EXISTS "audit_logs_update_admin" ON public.system_audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete_admin" ON public.system_audit_logs;

-- Allow manual logging ONLY from authenticated admins; triggers run under SECURITY DEFINER as postgres
CREATE POLICY "audit_logs_insert_admin"
  ON public.system_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_user_role() = 'admin'::public.user_role);

-- 4. Restrict registrations SELECT to own college or authorized staff roles
DROP POLICY IF EXISTS "registrations_select_authenticated" ON public.registrations;

CREATE POLICY "registrations_select_scoped"
  ON public.registrations
  FOR SELECT
  TO authenticated
  USING (
    public.auth_user_role() = ANY(ARRAY[
      'admin'::public.user_role,
      'convenor'::public.user_role,
      'stage_controller'::public.user_role,
      'result_entry'::public.user_role
    ])
    OR (
      public.auth_user_role() = 'college'::public.user_role 
      AND college_affl_no = public.auth_user_affl_no()
    )
  );

-- 5. Extend quota trigger to cover chest_no, item_id, and college_affl_no updates (e.g. replacements)
DROP TRIGGER IF EXISTS trg_enforce_student_quota ON public.registrations;
CREATE TRIGGER trg_enforce_student_quota
  BEFORE INSERT OR UPDATE OF item_id, chest_no, college_affl_no ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_registration_quota();

-- 6. Pin search_path = '' across remaining elevated SECURITY DEFINER functions
ALTER FUNCTION public.allocate_numeric_chest_numbers(boolean, boolean) SET search_path = '';
ALTER FUNCTION public.assign_chest_no_on_registration() SET search_path = '';
ALTER FUNCTION public.cleanup_group_submission_entries() SET search_path = '';
ALTER FUNCTION public.cleanup_unused_chest_no_on_reg_change() SET search_path = '';
ALTER FUNCTION public.ensure_student_chest_no(bigint, integer) SET search_path = '';
ALTER FUNCTION public.get_fest_leaderboard() SET search_path = '';
ALTER FUNCTION public.log_system_event_trigger() SET search_path = '';
ALTER FUNCTION public.register_college_for_item_tx(integer, integer, text[]) SET search_path = '';
ALTER FUNCTION public.resolve_student_cic_no(text, integer) SET search_path = '';
ALTER FUNCTION public.review_replacement_tx(uuid, text, text) SET search_path = '';
ALTER FUNCTION public.validate_submission_entry() SET search_path = '';

COMMIT;
