-- ====================================================================
-- Apply Supabase & Postgres Best Practices
-- 1. Security Definer Search Path Fixes
-- 2. Explicit TO authenticated in RLS
-- 3. WITH CHECK additions on UPDATE policies
-- 4. Correcting invalid index from previous migration
-- 5. Adding missing FK indexes
-- ====================================================================

-- 1. Security Definer Fixes (Prevent search path vulnerabilities)
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.auth_user_affl_no()
RETURNS INT AS $$
  SELECT college_affl_no FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.restrict_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF (public.auth_user_role() != 'admin') THEN
    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.college_affl_no IS DISTINCT FROM OLD.college_affl_no) THEN
      RAISE EXCEPTION 'Not authorized to change role or college affiliation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. Add explicit 'TO authenticated' to policies currently using just USING(true) meant for authenticated users
DROP POLICY IF EXISTS "Colleges readable by all authenticated" ON public.colleges;
CREATE POLICY "Colleges readable by all authenticated"
  ON public.colleges FOR SELECT
  TO authenticated
  USING (true);

-- 3. Add explicit WITH CHECK on UPDATE policies
DROP POLICY IF EXISTS "Profiles updatable by owner or admin" ON public.profiles;
CREATE POLICY "Profiles updatable by owner or admin"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.auth_user_role() = 'admin')
  WITH CHECK (id = auth.uid() OR public.auth_user_role() = 'admin');

DROP POLICY IF EXISTS "Schedules updatable by stage controller or admin" ON public.schedules;
CREATE POLICY "Schedules updatable by stage controller or admin"
  ON public.schedules FOR UPDATE
  USING (public.auth_user_role() IN ('admin', 'stage_controller'))
  WITH CHECK (public.auth_user_role() IN ('admin', 'stage_controller'));

DROP POLICY IF EXISTS "Results updatable by admin only" ON public.results;
CREATE POLICY "Results updatable by admin only"
  ON public.results FOR UPDATE
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

DROP POLICY IF EXISTS "Appeals updatable by admin" ON public.appeals;
CREATE POLICY "Appeals updatable by admin"
  ON public.appeals FOR UPDATE
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

-- 4. Correcting invalid index from previous migration
-- Previous migration tried to index schedules(stage_id) but column is stage_number
DROP INDEX IF EXISTS idx_schedules_stage_status;
CREATE INDEX IF NOT EXISTS idx_schedules_stage_status
  ON public.schedules(stage_number, status);

-- 5. Add missing indexes for Foreign Keys
-- Submission Entries
CREATE INDEX IF NOT EXISTS idx_submission_entries_college
  ON public.submission_entries(college_affl_no);
CREATE INDEX IF NOT EXISTS idx_submission_entries_chest
  ON public.submission_entries(chest_no);
CREATE INDEX IF NOT EXISTS idx_submission_entries_item
  ON public.submission_entries(item_id);

-- Results
CREATE INDEX IF NOT EXISTS idx_results_item
  ON public.results(item_id);
CREATE INDEX IF NOT EXISTS idx_results_college
  ON public.results(college_affl_no);
CREATE INDEX IF NOT EXISTS idx_results_chest
  ON public.results(chest_no);

-- Appeals
CREATE INDEX IF NOT EXISTS idx_appeals_item
  ON public.appeals(item_id);
CREATE INDEX IF NOT EXISTS idx_appeals_chest
  ON public.appeals(chest_no);

-- Registration Logs
CREATE INDEX IF NOT EXISTS idx_registration_logs_item
  ON public.registration_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_registration_logs_college
  ON public.registration_logs(college_affl_no);
CREATE INDEX IF NOT EXISTS idx_registration_logs_chest
  ON public.registration_logs(chest_no);
