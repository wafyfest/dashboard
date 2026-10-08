-- ====================================================================
-- Security Fix: Prevent role escalation, scope student access, tighten result access
-- ====================================================================

-- 1. Profiles: Prevent users from updating their own 'role' or 'college_affl_no'
CREATE OR REPLACE FUNCTION restrict_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF (auth_user_role() != 'admin') THEN
    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.college_affl_no IS DISTINCT FROM OLD.college_affl_no) THEN
      RAISE EXCEPTION 'Not authorized to change role or college affiliation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_restrict_profile_updates ON profiles;
CREATE TRIGGER trg_restrict_profile_updates
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION restrict_profile_updates();

-- 2. Students: Narrow read access so only admin and the owning college can read full rows.
DROP POLICY IF EXISTS "Students readable by all" ON students;
CREATE POLICY "Students readable by admin or owning college"
  ON students FOR SELECT
  USING (auth_user_role() = 'admin' OR college_affl_no = auth_user_affl_no());

-- 3. Registrations: Narrow read access
DROP POLICY IF EXISTS "Registrations readable by all authenticated" ON registrations;
CREATE POLICY "Registrations readable by admin or owning college"
  ON registrations FOR SELECT
  USING (auth_user_role() = 'admin' OR college_affl_no = auth_user_affl_no());

-- 4. Results: Make sure unpublished results are only readable by admin/result_entry
DROP POLICY IF EXISTS "Results readable if published or staff" ON results;
CREATE POLICY "Results readable if published or staff"
  ON results FOR SELECT
  USING (published = true OR auth_user_role() IN ('admin', 'result_entry'));
