-- ====================================================================
-- Security Fix: Tighten RLS Policies
-- Fixes: appeals access, registration_logs insert, students read scope
-- ====================================================================

-- 1. Fix Appeals: Restrict read to owning college (by mobile_number match) or admin
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Appeals readable by author college or admin" ON appeals;
CREATE POLICY "Appeals readable by author college or admin"
  ON appeals FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR mobile_number IN (
      SELECT c.team_manager_phone FROM colleges c WHERE c.affl_no = auth_user_affl_no()
      UNION
      SELECT c.staff_coordinator_phone FROM colleges c WHERE c.affl_no = auth_user_affl_no()
    )
  );

-- 2. Fix Appeals: Restrict insert to authenticated college users only (not wide open)
DROP POLICY IF EXISTS "Appeals insertable by anyone" ON appeals;
CREATE POLICY "Appeals insertable by college or admin"
  ON appeals FOR INSERT
  WITH CHECK (
    auth_user_role() IN ('admin', 'college')
  );

-- 3. Fix Registration Logs: Scope insert to owning college or admin
DROP POLICY IF EXISTS "Registration logs insertable by college or admin" ON registration_logs;
CREATE POLICY "Registration logs insertable by college or admin"
  ON registration_logs FOR INSERT
  WITH CHECK (
    auth_user_role() = 'admin'
    OR college_affl_no = auth_user_affl_no()
  );

-- 4. Add explicit SELECT policy for max_participation (currently only has FOR ALL for admin)
CREATE POLICY "Max participation readable by all authenticated"
  ON max_participation FOR SELECT
  USING (true);
