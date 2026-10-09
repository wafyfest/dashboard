-- ====================================================================
-- Ensure entry_locks table has college_affl_no column
-- ====================================================================

-- 1. Create table if not exists or add missing college_affl_no column
CREATE TABLE IF NOT EXISTS public.entry_locks (
  item_id INT REFERENCES public.items(item_id) ON DELETE CASCADE,
  college_affl_no INT REFERENCES public.colleges(affl_no) ON DELETE CASCADE,
  is_open BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (item_id, college_affl_no)
);

ALTER TABLE public.entry_locks 
  ADD COLUMN IF NOT EXISTS college_affl_no INT REFERENCES public.colleges(affl_no) ON DELETE CASCADE;

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_entry_locks_college 
  ON public.entry_locks(college_affl_no);

-- 3. Update RLS policies
ALTER TABLE public.entry_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entry locks readable by admin or college" ON public.entry_locks;
CREATE POLICY "Entry locks readable by admin or college"
  ON public.entry_locks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Entry locks managed by admin" ON public.entry_locks;
CREATE POLICY "Entry locks managed by admin"
  ON public.entry_locks FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin');
