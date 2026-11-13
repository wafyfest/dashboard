-- ====================================================================
-- Migration: 20261113220000_allow_result_entry_read_code_letters.sql
-- Description:
--   Allow users with role 'result_entry' and 'convenor' to SELECT from
--   public.code_letters table alongside 'stage_controller' and 'admin'
--   so judges/tabulators can see anonymous allocated letters (A, B, C...)
--   for event score entry.
-- ====================================================================

BEGIN;

DROP POLICY IF EXISTS "Code letters viewable by stage controller, admin, or owning college" ON public.code_letters;
DROP POLICY IF EXISTS "Code letters viewable by authorized fest officials" ON public.code_letters;

CREATE POLICY "Code letters viewable by authorized fest officials"
  ON public.code_letters FOR SELECT
  USING (
    public.auth_user_role() IN ('admin', 'stage_controller', 'result_entry', 'convenor')
    OR college_affl_no = public.auth_user_affl_no()
  );

COMMIT;
