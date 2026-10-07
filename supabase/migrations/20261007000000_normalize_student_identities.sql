-- ====================================================================
-- Data Identity Normalization & Self-Healing Migration
-- Fixes legacy registrations containing raw student UUIDs or Admission Nos
-- ====================================================================

-- 1. Ensure all students have a valid, non-null chest_no
UPDATE public.students
SET chest_no = CASE
  WHEN admission_no IS NOT NULL AND admission_no <> '' THEN 'ST-' || admission_no
  ELSE 'CH-' || SUBSTRING(id FROM 1 FOR 6)
END
WHERE chest_no IS NULL OR chest_no = '' OR chest_no ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Clean up registrations where chest_no was stored as student UUID
UPDATE public.registrations r
SET chest_no = s.chest_no
FROM public.students s
WHERE (r.chest_no = s.id OR r.chest_no = s.admission_no)
  AND s.chest_no IS NOT NULL
  AND s.chest_no <> '';

-- 3. Clean up results where chest_no was stored as student UUID
UPDATE public.results r
SET chest_no = s.chest_no
FROM public.students s
WHERE (r.chest_no = s.id OR r.chest_no = s.admission_no)
  AND s.chest_no IS NOT NULL
  AND s.chest_no <> '';

-- 4. Clean up submission entries where chest_no was stored as student UUID
UPDATE public.submission_entries sub
SET chest_no = s.chest_no
FROM public.students s
WHERE (sub.chest_no = s.id OR sub.chest_no = s.admission_no)
  AND s.chest_no IS NOT NULL
  AND s.chest_no <> '';

-- 5. Add compound index for fast student registration lookups
CREATE INDEX IF NOT EXISTS idx_registrations_item_college_chest
  ON public.registrations(item_id, college_affl_no, chest_no);
