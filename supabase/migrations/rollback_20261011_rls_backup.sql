-- ====================================================================
-- ROLLBACK SCRIPT: Exact Pre-Migration State Restoration
-- ====================================================================

-- 1. Drop new functions
DROP FUNCTION IF EXISTS public.register_college_for_item_tx(INT, INT, TEXT[]);
DROP FUNCTION IF EXISTS public.review_replacement_tx(UUID, TEXT, TEXT);

-- 2. Drop sequence and revert column default
ALTER TABLE public.items ALTER COLUMN item_id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.items_item_id_seq;

-- 3. Drop storage policies and buckets
DROP POLICY IF EXISTS "receipts_upload_scoped" ON storage.objects;
DROP POLICY IF EXISTS "receipts_select_scoped" ON storage.objects;
DROP POLICY IF EXISTS "public_docs_read_all" ON storage.objects;
DROP POLICY IF EXISTS "public_docs_manage_admin" ON storage.objects;
DELETE FROM storage.buckets WHERE id IN ('fest-receipts', 'fest-public-docs');

-- 4. Re-grant public execute on original helpers
GRANT EXECUTE ON FUNCTION public.auth_user_affl_no() TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_user_role() TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restrict_profile_updates() TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO PUBLIC, anon;

-- 5. Drop new table policies
DROP POLICY IF EXISTS "registrations_select_authenticated" ON public.registrations;
DROP POLICY IF EXISTS "registrations_insert_scoped" ON public.registrations;
DROP POLICY IF EXISTS "registrations_update_scoped" ON public.registrations;
DROP POLICY IF EXISTS "registrations_delete_scoped" ON public.registrations;

DROP POLICY IF EXISTS "replacements_select_scoped" ON public.replacements;
DROP POLICY IF EXISTS "replacements_insert_scoped" ON public.replacements;
DROP POLICY IF EXISTS "replacements_update_admin" ON public.replacements;

DROP POLICY IF EXISTS "appeals_select_scoped" ON public.appeals;
DROP POLICY IF EXISTS "appeals_insert_scoped" ON public.appeals;
DROP POLICY IF EXISTS "appeals_update_admin" ON public.appeals;

-- 6. Restore verbatim pre-migration policies
CREATE POLICY "Allow delete on registrations" ON public.registrations FOR DELETE TO public USING (true);
CREATE POLICY "Allow insert on registrations" ON public.registrations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on registrations" ON public.registrations FOR UPDATE TO public USING (true);
CREATE POLICY "Registrations managed by admin or owning college" ON public.registrations FOR ALL TO public
  USING (((auth_user_role() = 'admin'::user_role) OR (college_affl_no = auth_user_affl_no())))
  WITH CHECK (((auth_user_role() = 'admin'::user_role) OR (college_affl_no = auth_user_affl_no())));
CREATE POLICY "Registrations readable by all authenticated" ON public.registrations FOR SELECT TO public USING (true);

CREATE POLICY "write_replacements" ON public.replacements FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "read_replacements" ON public.replacements FOR SELECT TO public USING (true);
CREATE POLICY "Replacements insertable by authenticated" ON public.replacements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Replacements readable by authenticated" ON public.replacements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Replacements updatable by admin" ON public.replacements FOR UPDATE TO authenticated
  USING ((( SELECT auth_user_role() AS auth_user_role) = 'admin'::user_role))
  WITH CHECK ((( SELECT auth_user_role() AS auth_user_role) = 'admin'::user_role));

CREATE POLICY "Appeals insertable by anyone" ON public.appeals FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Appeals insertable by college or admin" ON public.appeals FOR INSERT TO authenticated
  WITH CHECK (((auth_user_role() = 'admin'::user_role) OR (college_affl_no = auth_user_affl_no()) OR (mobile_number IS NOT NULL)));
CREATE POLICY "Appeals readable by author college or admin" ON public.appeals FOR SELECT TO public
  USING (((auth_user_role() = 'admin'::user_role) OR (mobile_number IS NOT NULL)));
CREATE POLICY "Appeals updatable by admin" ON public.appeals FOR UPDATE TO public USING ((auth_user_role() = 'admin'::user_role));
CREATE POLICY "College users can read own appeals" ON public.appeals FOR SELECT TO authenticated
  USING (((auth_user_role() = 'admin'::user_role) OR (college_affl_no = auth_user_affl_no()) OR (mobile_number IN ( SELECT c.team_manager_phone FROM colleges c WHERE (c.affl_no = auth_user_affl_no()) UNION SELECT c.staff_coordinator_phone FROM colleges c WHERE (c.affl_no = auth_user_affl_no())))));
