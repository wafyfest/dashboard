-- ====================================================================
-- Migration: Add missing is_locked column to items, deduplicate & set composite PK to entry_locks,
-- scoped RLS, and profile trigger
-- ====================================================================

-- 1. Ensure auth helper functions exist
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.auth_user_affl_no()
RETURNS INT AS $$
  SELECT college_affl_no FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- 2. Ensure is_locked column exists on items table
ALTER TABLE public.items 
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- 3. Ensure college_affl_no column exists on entry_locks table
ALTER TABLE public.entry_locks 
  ADD COLUMN IF NOT EXISTS college_affl_no INT REFERENCES public.colleges(affl_no) ON DELETE CASCADE;

-- 4. Clean up invalid/null rows and deduplicate entry_locks table
DELETE FROM public.entry_locks WHERE item_id IS NULL OR college_affl_no IS NULL;

DELETE FROM public.entry_locks e1
USING public.entry_locks e2
WHERE e1.item_id = e2.item_id
  AND e1.college_affl_no = e2.college_affl_no
  AND e1.ctid < e2.ctid;

-- 5. Dynamically drop any existing PK/unique constraints on entry_locks and set composite PK (item_id, college_affl_no)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.entry_locks'::regclass 
      AND contype IN ('p', 'u')
  LOOP
    EXECUTE 'ALTER TABLE public.entry_locks DROP CONSTRAINT ' || quote_ident(rec.conname);
  END LOOP;

  ALTER TABLE public.entry_locks ADD PRIMARY KEY (item_id, college_affl_no);
END $$;

-- 6. Replace RLS SELECT policy with scoped policy
ALTER TABLE public.entry_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entry locks readable by admin or college" ON public.entry_locks;
CREATE POLICY "Entry locks readable by admin or college"
  ON public.entry_locks FOR SELECT
  TO authenticated
  USING (
    public.auth_user_role() = 'admin' 
    OR college_affl_no = public.auth_user_affl_no()
  );

DROP POLICY IF EXISTS "Entry locks managed by admin" ON public.entry_locks;
CREATE POLICY "Entry locks managed by admin"
  ON public.entry_locks FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

-- 7. Create restrict_profile_updates function and bind trigger to profiles table
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

DROP TRIGGER IF EXISTS trg_restrict_profile_updates ON public.profiles;

CREATE TRIGGER trg_restrict_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_profile_updates();

-- 8. Reload Supabase PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
