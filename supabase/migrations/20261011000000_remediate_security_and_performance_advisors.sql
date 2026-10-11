-- ====================================================================
-- Migration: Remediate Security & Performance Advisories
-- 1. Covering Indexes for Unindexed Foreign Keys
-- 2. Auth RLS InitPlan Optimization ((SELECT auth.uid()))
-- 3. Restrict Anon Execution on Security Definer Functions
-- 4. RLS Policies for chest_no
-- 5. Clean up redundant permissive policies on replacements
-- ====================================================================

-- 1. Performance: Covering Indexes for Unindexed Foreign Keys
CREATE INDEX IF NOT EXISTS idx_appeals_item_id_covering 
  ON public.appeals(item_id);

CREATE INDEX IF NOT EXISTS idx_code_letters_item_id_covering 
  ON public.code_letters(item_id);

CREATE INDEX IF NOT EXISTS idx_code_letters_college_affl_covering 
  ON public.code_letters(college_affl_no);

CREATE INDEX IF NOT EXISTS idx_profiles_college_affl_covering 
  ON public.profiles(college_affl_no);

CREATE INDEX IF NOT EXISTS idx_registration_logs_item_covering 
  ON public.registration_logs(item_id);

CREATE INDEX IF NOT EXISTS idx_registrations_college_affl_covering 
  ON public.registrations(college_affl_no);

CREATE INDEX IF NOT EXISTS idx_replacements_registration_id 
  ON public.replacements(registration_id);

CREATE INDEX IF NOT EXISTS idx_replacements_original_student 
  ON public.replacements(original_student_id);

CREATE INDEX IF NOT EXISTS idx_replacements_replacement_student 
  ON public.replacements(replacement_student_id);

CREATE INDEX IF NOT EXISTS idx_results_college_affl_covering 
  ON public.results(college_affl_no);

CREATE INDEX IF NOT EXISTS idx_results_item_covering 
  ON public.results(item_id);

CREATE INDEX IF NOT EXISTS idx_schedules_item_covering 
  ON public.schedules(item_id);

CREATE INDEX IF NOT EXISTS idx_schedules_stage_number_covering 
  ON public.schedules(stage_number);

CREATE INDEX IF NOT EXISTS idx_submission_entries_college_affl_covering 
  ON public.submission_entries(college_affl_no);

CREATE INDEX IF NOT EXISTS idx_submission_entries_item_covering 
  ON public.submission_entries(item_id);

-- 2. Performance: Auth RLS InitPlan Optimization
DROP POLICY IF EXISTS "Profiles readable by owner or admin" ON public.profiles;
CREATE POLICY "Profiles readable by owner or admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.auth_user_role()) = 'admin');

DROP POLICY IF EXISTS "Profiles updatable by owner or admin" ON public.profiles;
CREATE POLICY "Profiles updatable by owner or admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.auth_user_role()) = 'admin')
  WITH CHECK (id = (SELECT auth.uid()) OR (SELECT public.auth_user_role()) = 'admin');

DROP POLICY IF EXISTS "write_fest_settings" ON public.fest_settings;
CREATE POLICY "write_fest_settings"
  ON public.fest_settings FOR ALL
  TO authenticated
  USING ((SELECT public.auth_user_role()) = 'admin')
  WITH CHECK ((SELECT public.auth_user_role()) = 'admin');

-- 3. Security: Revoke anon execution on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.auth_user_affl_no() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_user_role() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restrict_profile_updates() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.auth_user_affl_no() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated;

-- 4. Security: Add RLS policy for chest_no
DROP POLICY IF EXISTS "Chest numbers readable by authenticated" ON public.chest_no;
CREATE POLICY "Chest numbers readable by authenticated"
  ON public.chest_no FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Chest numbers managed by admin" ON public.chest_no;
CREATE POLICY "Chest numbers managed by admin"
  ON public.chest_no FOR ALL
  TO authenticated
  USING ((SELECT public.auth_user_role()) = 'admin')
  WITH CHECK ((SELECT public.auth_user_role()) = 'admin');

-- 5. Performance: Clean up redundant permissive policies on replacements
DROP POLICY IF EXISTS "Allow public select replacements" ON public.replacements;
DROP POLICY IF EXISTS "Allow public insert replacements" ON public.replacements;
DROP POLICY IF EXISTS "Allow public update replacements" ON public.replacements;

DROP POLICY IF EXISTS "Replacements readable by authenticated" ON public.replacements;
CREATE POLICY "Replacements readable by authenticated"
  ON public.replacements FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Replacements insertable by authenticated" ON public.replacements;
CREATE POLICY "Replacements insertable by authenticated"
  ON public.replacements FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Replacements updatable by admin" ON public.replacements;
CREATE POLICY "Replacements updatable by admin"
  ON public.replacements FOR UPDATE
  TO authenticated
  USING ((SELECT public.auth_user_role()) = 'admin')
  WITH CHECK ((SELECT public.auth_user_role()) = 'admin');
