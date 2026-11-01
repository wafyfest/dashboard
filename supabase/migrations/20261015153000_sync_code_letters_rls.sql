-- Migration: 20261015153000_sync_code_letters_rls.sql
-- Description: Expand students, code_letters, and results access to all staff roles and allow stage_controller/result_entry

-- 1. Students Table Access for Staff
DROP POLICY IF EXISTS "students_select_staff" ON public.students;
DROP POLICY IF EXISTS "Students readable by admin or owning college" ON public.students;
CREATE POLICY "students_select_staff"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'stage_controller'::user_role, 'convenor'::user_role, 'result_entry'::user_role))
    OR college_affl_no = (SELECT public.auth_user_affl_no())
  );

-- 2. Chest_no Table Access (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chest_no') THEN
    EXECUTE 'ALTER TABLE public.chest_no ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'DROP POLICY IF EXISTS "chest_no_select_staff" ON public.chest_no;';
    EXECUTE 'CREATE POLICY "chest_no_select_staff" ON public.chest_no FOR SELECT TO authenticated USING (true);';
  END IF;
END $$;

-- 3. Code Letters Policies
DROP POLICY IF EXISTS "code_letters_select_staff" ON public.code_letters;
CREATE POLICY "code_letters_select_staff"
  ON public.code_letters FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'stage_controller'::user_role, 'convenor'::user_role, 'result_entry'::user_role))
    OR college_affl_no = (SELECT public.auth_user_affl_no())
  );

DROP POLICY IF EXISTS "code_letters_modify_staff" ON public.code_letters;
CREATE POLICY "code_letters_modify_staff"
  ON public.code_letters FOR ALL
  TO authenticated
  USING ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'stage_controller'::user_role))
  WITH CHECK ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'stage_controller'::user_role));

-- 4. Registrations Update Policy (allow stage_controller to sync code_letters)
DROP POLICY IF EXISTS "registrations_update_scoped" ON public.registrations;
CREATE POLICY "registrations_update_scoped"
  ON public.registrations FOR UPDATE
  TO authenticated
  USING (
    ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'stage_controller'::user_role))
    OR (((SELECT public.auth_user_role()) = 'college'::user_role) AND (college_affl_no = (SELECT public.auth_user_affl_no())))
  )
  WITH CHECK (
    ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'stage_controller'::user_role))
    OR (((SELECT public.auth_user_role()) = 'college'::user_role) AND (college_affl_no = (SELECT public.auth_user_affl_no())))
  );

-- 5. Results Policies: Allow result_entry and admin to update and delete for score entries & publishing
DROP POLICY IF EXISTS "results_update_admin" ON public.results;
DROP POLICY IF EXISTS "results_update_staff" ON public.results;
CREATE POLICY "results_update_staff"
  ON public.results FOR UPDATE
  TO authenticated
  USING ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'result_entry'::user_role, 'convenor'::user_role))
  WITH CHECK ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'result_entry'::user_role, 'convenor'::user_role));

DROP POLICY IF EXISTS "results_delete_staff" ON public.results;
CREATE POLICY "results_delete_staff"
  ON public.results FOR DELETE
  TO authenticated
  USING ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'result_entry'::user_role, 'convenor'::user_role));

-- 6. Backfill existing code_letters into registrations
UPDATE public.registrations r
SET code_letter = TRIM(cl.code_letter)
FROM public.code_letters cl
WHERE r.item_id = cl.item_id 
  AND UPPER(TRIM(r.chest_no)) = UPPER(TRIM(cl.chest_no));
