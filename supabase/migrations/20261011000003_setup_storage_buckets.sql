-- ====================================================================
-- MIGRATION: 20261011000003_setup_storage_buckets.sql
-- ====================================================================

-- 1. Private Receipts Bucket (ON CONFLICT DO UPDATE guarantees correct settings)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fest-receipts',
  'fest-receipts',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'];

DROP POLICY IF EXISTS "receipts_upload_scoped" ON storage.objects;
CREATE POLICY "receipts_upload_scoped"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fest-receipts'
    AND (
      (SELECT public.auth_user_role()) = 'admin'::user_role
      OR (
        (SELECT public.auth_user_role()) = 'college'::user_role
        AND (storage.foldername(name))[1] = (SELECT public.auth_user_affl_no())::text
      )
    )
  );

DROP POLICY IF EXISTS "receipts_select_scoped" ON storage.objects;
CREATE POLICY "receipts_select_scoped"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fest-receipts'
    AND (
      (SELECT public.auth_user_role()) = 'admin'::user_role
      OR (
        (SELECT public.auth_user_role()) = 'college'::user_role
        AND (storage.foldername(name))[1] = (SELECT public.auth_user_affl_no())::text
      )
    )
  );

-- 2. Public Guidelines Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fest-public-docs',
  'fest-public-docs',
  true,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

DROP POLICY IF EXISTS "public_docs_read_all" ON storage.objects;
CREATE POLICY "public_docs_read_all"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'fest-public-docs');

DROP POLICY IF EXISTS "public_docs_manage_admin" ON storage.objects;
CREATE POLICY "public_docs_manage_admin"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'fest-public-docs'
    AND (SELECT public.auth_user_role()) = 'admin'::user_role
  )
  WITH CHECK (
    bucket_id = 'fest-public-docs'
    AND (SELECT public.auth_user_role()) = 'admin'::user_role
  );
