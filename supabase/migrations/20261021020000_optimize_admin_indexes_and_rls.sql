-- Migration: 20261021020000_optimize_admin_indexes_and_rls.sql
-- Optimizations from Admin Panel Audit:
-- 1. Covering index for system_audit_logs.item_id foreign key
-- 2. Consolidate overlapping permissive RLS policies on colleges, items, and students into single-action policies
-- 3. Cache auth_user_role() and auth_user_affl_no() in InitPlan subqueries
-- 4. Create archive_old_audit_logs maintenance procedure

-- ── 1. COVERING INDEX ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_item_id 
ON public.system_audit_logs (item_id);

-- ── 2. COLLEGES RLS CONSOLIDATION ────────────────────────────────────
DROP POLICY IF EXISTS "Colleges managed by admin" ON public.colleges;
DROP POLICY IF EXISTS "Colleges readable by all authenticated" ON public.colleges;
DROP POLICY IF EXISTS "Colleges update own contact info" ON public.colleges;
DROP POLICY IF EXISTS "colleges_select_all" ON public.colleges;
DROP POLICY IF EXISTS "colleges_insert_admin" ON public.colleges;
DROP POLICY IF EXISTS "colleges_update_admin_or_owner" ON public.colleges;
DROP POLICY IF EXISTS "colleges_delete_admin" ON public.colleges;

CREATE POLICY "colleges_select_all"
  ON public.colleges
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "colleges_insert_admin"
  ON public.colleges
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.auth_user_role()) = 'admin'::user_role));

CREATE POLICY "colleges_update_admin_or_owner"
  ON public.colleges
  FOR UPDATE
  TO authenticated
  USING (
    ((SELECT public.auth_user_role()) = 'admin'::user_role)
    OR (affl_no = (SELECT public.auth_user_affl_no()))
  )
  WITH CHECK (
    ((SELECT public.auth_user_role()) = 'admin'::user_role)
    OR (affl_no = (SELECT public.auth_user_affl_no()))
  );

CREATE POLICY "colleges_delete_admin"
  ON public.colleges
  FOR DELETE
  TO authenticated
  USING (((SELECT public.auth_user_role()) = 'admin'::user_role));

-- ── 3. ITEMS RLS CONSOLIDATION ───────────────────────────────────────
DROP POLICY IF EXISTS "Items managed by admin" ON public.items;
DROP POLICY IF EXISTS "Items readable by everyone" ON public.items;
DROP POLICY IF EXISTS "items_select_all" ON public.items;
DROP POLICY IF EXISTS "items_insert_admin" ON public.items;
DROP POLICY IF EXISTS "items_update_admin" ON public.items;
DROP POLICY IF EXISTS "items_delete_admin" ON public.items;

CREATE POLICY "items_select_all"
  ON public.items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "items_insert_admin"
  ON public.items
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT public.auth_user_role()) = 'admin'::user_role));

CREATE POLICY "items_update_admin"
  ON public.items
  FOR UPDATE
  TO authenticated
  USING (((SELECT public.auth_user_role()) = 'admin'::user_role))
  WITH CHECK (((SELECT public.auth_user_role()) = 'admin'::user_role));

CREATE POLICY "items_delete_admin"
  ON public.items
  FOR DELETE
  TO authenticated
  USING (((SELECT public.auth_user_role()) = 'admin'::user_role));

-- ── 4. STUDENTS RLS CONSOLIDATION ────────────────────────────────────
DROP POLICY IF EXISTS "Students managed by admin or owning college" ON public.students;
DROP POLICY IF EXISTS "Students readable by all" ON public.students;
DROP POLICY IF EXISTS "students_select_all" ON public.students;
DROP POLICY IF EXISTS "students_insert_scoped" ON public.students;
DROP POLICY IF EXISTS "students_update_scoped" ON public.students;
DROP POLICY IF EXISTS "students_delete_scoped" ON public.students;

CREATE POLICY "students_select_all"
  ON public.students
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "students_insert_scoped"
  ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((SELECT public.auth_user_role()) = 'admin'::user_role)
    OR (college_affl_no = (SELECT public.auth_user_affl_no()))
  );

CREATE POLICY "students_update_scoped"
  ON public.students
  FOR UPDATE
  TO authenticated
  USING (
    ((SELECT public.auth_user_role()) = 'admin'::user_role)
    OR (college_affl_no = (SELECT public.auth_user_affl_no()))
  )
  WITH CHECK (
    ((SELECT public.auth_user_role()) = 'admin'::user_role)
    OR (college_affl_no = (SELECT public.auth_user_affl_no()))
  );

CREATE POLICY "students_delete_scoped"
  ON public.students
  FOR DELETE
  TO authenticated
  USING (
    ((SELECT public.auth_user_role()) = 'admin'::user_role)
    OR (college_affl_no = (SELECT public.auth_user_affl_no()))
  );

-- ── 5. SYSTEM AUDIT LOGS RLS CONSOLIDATION ───────────────────────────
DROP POLICY IF EXISTS "Admins full access to system_audit_logs" ON public.system_audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.system_audit_logs;
DROP POLICY IF EXISTS "audit_logs_update_admin" ON public.system_audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete_admin" ON public.system_audit_logs;

CREATE POLICY "audit_logs_select_admin"
  ON public.system_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    OR ((SELECT public.auth_user_role()) = 'admin'::user_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role
    )
  );

CREATE POLICY "audit_logs_update_admin"
  ON public.system_audit_logs
  FOR UPDATE
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

CREATE POLICY "audit_logs_delete_admin"
  ON public.system_audit_logs
  FOR DELETE
  TO authenticated
  USING (
    ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    OR ((SELECT public.auth_user_role()) = 'admin'::user_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role
    )
  );

-- ── 6. AUDIT LOGS ARCHIVAL PROCEDURE ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.archive_old_audit_logs(days_to_keep INT DEFAULT 90)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count INT;
BEGIN
  IF (SELECT public.auth_user_role()) != 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  DELETE FROM public.system_audit_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archive_old_audit_logs(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_old_audit_logs(INT) TO authenticated;
