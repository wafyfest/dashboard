-- ====================================================================
-- MIGRATION: 20261102000000_create_fest_committee.sql
-- Festival Committee Members table + committee-photos storage bucket
-- ====================================================================

-- 1. Create fest_committee table
CREATE TABLE IF NOT EXISTS public.fest_committee (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  position       TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'committee',
  -- categories: 'chief_patron' | 'patron' | 'organizing_committee' | 'technical_team' | 'volunteer_lead'
  photo_url      TEXT,
  display_order  INT NOT NULL DEFAULT 999,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.fest_committee ENABLE ROW LEVEL SECURITY;

-- 3. Public read access (anon + authenticated can read active members)
DROP POLICY IF EXISTS "committee_public_select" ON public.fest_committee;
CREATE POLICY "committee_public_select"
  ON public.fest_committee
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- 4. Admin-only write access
DROP POLICY IF EXISTS "committee_admin_insert" ON public.fest_committee;
CREATE POLICY "committee_admin_insert"
  ON public.fest_committee
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.auth_user_role()) = 'admin'::user_role);

DROP POLICY IF EXISTS "committee_admin_update" ON public.fest_committee;
CREATE POLICY "committee_admin_update"
  ON public.fest_committee
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.auth_user_role()) = 'admin'::user_role);

DROP POLICY IF EXISTS "committee_admin_delete" ON public.fest_committee;
CREATE POLICY "committee_admin_delete"
  ON public.fest_committee
  FOR DELETE
  TO authenticated
  USING ((SELECT public.auth_user_role()) = 'admin'::user_role);

-- 5. Performance index
CREATE INDEX IF NOT EXISTS idx_fest_committee_order
  ON public.fest_committee (display_order ASC, category ASC);

-- 6. Enable realtime replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.fest_committee;

-- 7. committee-photos storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'committee-photos',
  'committee-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public          = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 8. Storage RLS: public select (anyone can view committee photos)
DROP POLICY IF EXISTS "committee_photos_public_select" ON storage.objects;
CREATE POLICY "committee_photos_public_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'committee-photos');

-- 9. Storage RLS: admin upload only
DROP POLICY IF EXISTS "committee_photos_admin_insert" ON storage.objects;
CREATE POLICY "committee_photos_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'committee-photos'
    AND (SELECT public.auth_user_role()) = 'admin'::user_role
  );
