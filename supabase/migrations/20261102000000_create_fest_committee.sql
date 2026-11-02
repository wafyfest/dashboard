-- ====================================================================
-- MIGRATION: 20261102000000_create_fest_committee.sql
-- Festival Committee Members table + committee-photos storage bucket + 14th Fest Seed
-- ====================================================================

-- 1. Create fest_committee table
CREATE TABLE IF NOT EXISTS public.fest_committee (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  position       TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'fest_convenor',
  campus         TEXT,
  photo_url      TEXT,
  display_order  INT NOT NULL DEFAULT 999,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 2. Ensure campus column exists if table was previously created without it
ALTER TABLE public.fest_committee ADD COLUMN IF NOT EXISTS campus TEXT;

-- 3. Enable RLS
ALTER TABLE public.fest_committee ENABLE ROW LEVEL SECURITY;

-- 4. Public read access (anon + authenticated can read active members)
DROP POLICY IF EXISTS "committee_public_select" ON public.fest_committee;
CREATE POLICY "committee_public_select"
  ON public.fest_committee
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- 5. Admin-only write access
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

-- 6. Performance index
CREATE INDEX IF NOT EXISTS idx_fest_committee_order
  ON public.fest_committee (display_order ASC, category ASC);

-- 7. Enable realtime replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.fest_committee;

-- 8. committee-photos storage bucket (public)
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

-- 9. Storage RLS: public select (anyone can view committee photos)
DROP POLICY IF EXISTS "committee_photos_public_select" ON storage.objects;
CREATE POLICY "committee_photos_public_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'committee-photos');

-- 10. Storage RLS: admin upload only
DROP POLICY IF EXISTS "committee_photos_admin_insert" ON storage.objects;
CREATE POLICY "committee_photos_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'committee-photos'
    AND (SELECT public.auth_user_role()) = 'admin'::user_role
  );

-- 11. Seed the official 14th State Wafy Fest Committee Leaders
DELETE FROM public.fest_committee
WHERE category IN (
  'apex_leadership',
  'apex_chair',
  'convenors',
  'executive_officers',
  'technical_team',
  'general_convenor',
  'fest_convenor',
  'technical_convenor',
  'wsf_exec'
);

INSERT INTO public.fest_committee (name, position, category, campus, display_order, is_active)
VALUES
  -- ── Apex Leadership (Row 1 of Poster) ──
  ('Alfaz Kothamangalam', 'Chairman', 'apex_chair', 'Wafy Campus Kalikavu', 1, true),
  ('Aboobacker Jiyad', 'General Convenor', 'general_convenor', 'Wafy Campus Kalikavu', 2, true),
  ('Rizal Abdul Samad', 'Vice Chairman', 'apex_chair', 'Wafy Campus Kalikavu', 3, true),
  ('Shahzad Aman', 'Vice Chairman', 'apex_chair', 'Majma'' Kavanur', 4, true),
  ('Fazil Pattambi', 'Deputy Convenor', 'general_convenor', 'Wafy Campus Kalikavu', 5, true),

  -- ── Main Convenors ──
  ('Swalih Mannarkad', 'Convenor', 'fest_convenor', 'Wafy Campus Kalikavu', 6, true),
  ('Shamil Usman', 'Convenor', 'fest_convenor', 'MTM Chokli', 7, true),
  ('La Al Miras', 'Convenor', 'fest_convenor', 'Wafy Campus Kalikavu', 8, true),
  ('Shadi Athavanad', 'Convenor', 'fest_convenor', 'Majma'' Kavanur', 9, true),
  ('Adhil Sali', 'Convenor', 'fest_convenor', 'PMSA Kadakkangal', 10, true),
  ('Munavir Thirunavaya', 'Technical Convenor', 'fest_convenor', 'Darul Uloom Thootha', 11, true),

  -- ── Functional Directorate & Technical Team ──
  ('Ibrahim Badhusha', 'Finance Secretary', 'executive_officers', 'Wafy Campus Kalikavu', 12, true),
  ('Fahad K', 'Media Director', 'executive_officers', 'Wafy Campus Kalikavu', 13, true),
  ('Shuhair Neduvode', 'Volunteer Captain', 'executive_officers', 'Wafy Campus Kalikavu', 14, true),
  ('Salih Mavoor', 'Asst. Technical Convenor', 'technical_team', 'Wafy Campus Kalikavu', 15, true),
  ('Ahmad Adil', 'Asst. Technical Convenor', 'technical_team', 'Wafy Campus Kalikavu', 16, true),
  ('Sabir Melattur', 'Asst. Technical Convenor', 'technical_team', 'Majlis Puramannur', 17, true),
  ('Naji Malayamma', 'Asst. Technical Convenor', 'technical_team', 'Wafy Campus Kalikavu', 18, true);
