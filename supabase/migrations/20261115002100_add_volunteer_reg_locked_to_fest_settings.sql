-- ====================================================================
-- Migration: 20261115002100_add_volunteer_reg_locked_to_fest_settings.sql
-- Description: Add single universal lock/unlock switch for volunteer registration across all colleges
-- ====================================================================

-- 1. Add volunteer_reg_locked column to fest_settings
ALTER TABLE public.fest_settings
ADD COLUMN IF NOT EXISTS volunteer_reg_locked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.fest_settings.volunteer_reg_locked IS 'Global single lock switch for volunteer registration across all colleges';

-- 2. Update volunteers INSERT RLS Policy to enforce lock for college users
DROP POLICY IF EXISTS "volunteers_insert_scoped" ON public.volunteers;
CREATE POLICY "volunteers_insert_scoped"
  ON public.volunteers FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR (
      (SELECT public.auth_user_role()) = 'college'::user_role 
      AND college_affl_no = (SELECT public.auth_user_affl_no())
      AND NOT EXISTS (SELECT 1 FROM public.fest_settings WHERE volunteer_reg_locked = true)
    )
    OR (SELECT public.auth_user_role()) IS NULL
  );

-- 3. Update volunteers UPDATE RLS Policy to enforce lock for college users
DROP POLICY IF EXISTS "volunteers_update_scoped" ON public.volunteers;
CREATE POLICY "volunteers_update_scoped"
  ON public.volunteers FOR UPDATE
  TO authenticated, anon
  USING (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR (
      (SELECT public.auth_user_role()) = 'college'::user_role 
      AND college_affl_no = (SELECT public.auth_user_affl_no())
      AND NOT EXISTS (SELECT 1 FROM public.fest_settings WHERE volunteer_reg_locked = true)
    )
    OR (SELECT public.auth_user_role()) IS NULL
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR (
      (SELECT public.auth_user_role()) = 'college'::user_role 
      AND college_affl_no = (SELECT public.auth_user_affl_no())
      AND NOT EXISTS (SELECT 1 FROM public.fest_settings WHERE volunteer_reg_locked = true)
    )
    OR (SELECT public.auth_user_role()) IS NULL
  );

-- 4. Update volunteers DELETE RLS Policy to enforce lock for college users
DROP POLICY IF EXISTS "volunteers_delete_scoped" ON public.volunteers;
CREATE POLICY "volunteers_delete_scoped"
  ON public.volunteers FOR DELETE
  TO authenticated, anon
  USING (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR (
      (SELECT public.auth_user_role()) = 'college'::user_role 
      AND college_affl_no = (SELECT public.auth_user_affl_no())
      AND NOT EXISTS (SELECT 1 FROM public.fest_settings WHERE volunteer_reg_locked = true)
    )
    OR (SELECT public.auth_user_role()) IS NULL
  );
