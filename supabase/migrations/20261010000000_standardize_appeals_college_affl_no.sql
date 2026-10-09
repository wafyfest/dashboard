-- ====================================================================
-- Standardize Appeals Table to use college_affl_no Foreign Key
-- 1. Add college_affl_no INT REFERENCES colleges(affl_no)
-- 2. Backfill existing records matching mobile_number
-- 3. Add FK Index on college_affl_no
-- 4. Update Appeals RLS policies to check college_affl_no
-- ====================================================================

-- 1. Add college_affl_no column
ALTER TABLE public.appeals 
  ADD COLUMN IF NOT EXISTS college_affl_no INT REFERENCES public.colleges(affl_no) ON DELETE CASCADE;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_appeals_college_affl_no 
  ON public.appeals(college_affl_no);

-- 3. Backfill existing records in appeals table using phone matching
UPDATE public.appeals a
SET college_affl_no = c.affl_no
FROM public.colleges c
WHERE a.college_affl_no IS NULL
  AND (a.mobile_number = c.team_manager_phone OR a.mobile_number = c.staff_coordinator_phone);

-- 4. Update RLS Policies
DROP POLICY IF EXISTS "College users can read own appeals" ON public.appeals;
CREATE POLICY "College users can read own appeals"
  ON public.appeals FOR SELECT
  TO authenticated
  USING (
    public.auth_user_role() = 'admin' 
    OR college_affl_no = public.auth_user_affl_no()
    OR mobile_number IN (
      SELECT c.team_manager_phone FROM public.colleges c WHERE c.affl_no = public.auth_user_affl_no()
      UNION
      SELECT c.staff_coordinator_phone FROM public.colleges c WHERE c.affl_no = public.auth_user_affl_no()
    )
  );

DROP POLICY IF EXISTS "Appeals insertable by college or admin" ON public.appeals;
CREATE POLICY "Appeals insertable by college or admin"
  ON public.appeals FOR INSERT
  TO authenticated
  WITH CHECK (
    public.auth_user_role() = 'admin'
    OR college_affl_no = public.auth_user_affl_no()
    OR mobile_number IS NOT NULL
  );
