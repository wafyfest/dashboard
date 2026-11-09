-- ====================================================================
-- Migration: 20261110000000_harden_announcements_rls.sql
-- Description: Harden announcements RLS policies to prevent public/anon
--              privilege escalation and restrict modification to admins.
-- ====================================================================

-- 1. Drop insecure public insert/update/delete policies
DROP POLICY IF EXISTS "announcements_insert_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_select_all" ON public.announcements;

-- 2. Scoped public select for active announcements only
CREATE POLICY "announcements_select_public"
  ON public.announcements FOR SELECT
  TO public
  USING (is_active = true);

-- 3. Restrict creation, mutation, and deletion strictly to admin staff
CREATE POLICY "announcements_modify_admin"
  ON public.announcements FOR ALL
  TO authenticated
  USING ((SELECT public.auth_user_role()) = 'admin'::user_role)
  WITH CHECK ((SELECT public.auth_user_role()) = 'admin'::user_role);

