-- ============================================================================
-- Migration: 20261111050000_add_screening_workflow.sql
-- Description:
--   Adds pre-fest screening support:
--     1. `public.events.is_screening` flag (marks the 13 official screening events)
--     2. `public.registrations.screening_status`, `screening_remarks`,
--        and `screening_updated_at` for shortlist tracking ('pending' | 'qualified' | 'eliminated')
--     3. Deduplicates and indexes `public.submission_entries(item_id, chest_no)` for
--        upserting pre-fest video/file submission links + opens college/staff RLS
--     4. Short-circuits quota trigger when updating non-identity registration fields
-- ============================================================================

BEGIN;

-- 1. Events: screening flag
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_screening BOOLEAN NOT NULL DEFAULT false;

UPDATE public.events
SET is_screening = (item_code IN (
  -- Thamheediyya (5)
  'TN026', -- Speech Malayalam
  'TN027', -- Speech Arabic
  'TN028', -- Impact Talk
  'TN035', -- Lecturing
  'TN036', -- Song Malayalam
  -- Aliya (7)
  'AN054', -- Speech Malayalam
  'AN055', -- Speech Arabic
  'AN056', -- Impact Talk
  'AN057', -- Speech Urdu
  'AN059', -- Encounter
  'AN060', -- Spot Translation (A-M)
  'AN066', -- Song Malayalam
  -- General (1)
  'GN089'  -- Mashup
));

-- 2. Registrations: screening shortlist status
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS screening_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS screening_remarks TEXT,
  ADD COLUMN IF NOT EXISTS screening_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registrations_screening_status_check'
      AND conrelid = 'public.registrations'::regclass
  ) THEN
    ALTER TABLE public.registrations
      ADD CONSTRAINT registrations_screening_status_check
      CHECK (screening_status IN ('pending', 'qualified', 'eliminated'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_registrations_item_screening
  ON public.registrations(item_id, screening_status);

-- 3. Submission Entries: unique (item_id, chest_no) so digital/video link upserts work cleanly
DELETE FROM public.submission_entries a
USING public.submission_entries b
WHERE a.ctid < b.ctid
  AND a.item_id = b.item_id
  AND a.chest_no = b.chest_no;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_entries_item_chest_unique
  ON public.submission_entries(item_id, chest_no);

-- Refresh submission_entries RLS so colleges manage their own submission links
-- and staff/convenors/result_entry/stage_controller can review them
DROP POLICY IF EXISTS "submission_entries_select_scoped" ON public.submission_entries;
DROP POLICY IF EXISTS "submission_entries_insert_scoped" ON public.submission_entries;
DROP POLICY IF EXISTS "submission_entries_update_scoped" ON public.submission_entries;
DROP POLICY IF EXISTS "submission_entries_delete_scoped" ON public.submission_entries;

CREATE POLICY "submission_entries_select_scoped"
  ON public.submission_entries FOR SELECT
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) IN ('admin'::user_role, 'convenor'::user_role, 'result_entry'::user_role, 'stage_controller'::user_role)
    OR college_affl_no = (SELECT public.auth_user_affl_no())
  );

CREATE POLICY "submission_entries_insert_scoped"
  ON public.submission_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.auth_user_role()) IN ('admin'::user_role, 'convenor'::user_role)
    OR college_affl_no = (SELECT public.auth_user_affl_no())
  );

CREATE POLICY "submission_entries_update_scoped"
  ON public.submission_entries FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) IN ('admin'::user_role, 'convenor'::user_role)
    OR college_affl_no = (SELECT public.auth_user_affl_no())
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) IN ('admin'::user_role, 'convenor'::user_role)
    OR college_affl_no = (SELECT public.auth_user_affl_no())
  );

CREATE POLICY "submission_entries_delete_scoped"
  ON public.submission_entries FOR DELETE
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) IN ('admin'::user_role, 'convenor'::user_role)
    OR college_affl_no = (SELECT public.auth_user_affl_no())
  );

-- 4. Allow convenor alongside admin & stage_controller to update screening shortlist / code letters
DROP POLICY IF EXISTS "registrations_update_scoped" ON public.registrations;
CREATE POLICY "registrations_update_scoped"
  ON public.registrations FOR UPDATE
  TO authenticated
  USING (
    ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'convenor'::user_role, 'stage_controller'::user_role))
    OR (((SELECT public.auth_user_role()) = 'college'::user_role) AND (college_affl_no = (SELECT public.auth_user_affl_no())))
  )
  WITH CHECK (
    ((SELECT public.auth_user_role()) IN ('admin'::user_role, 'convenor'::user_role, 'stage_controller'::user_role))
    OR (((SELECT public.auth_user_role()) = 'college'::user_role) AND (college_affl_no = (SELECT public.auth_user_affl_no())))
  );

-- 5. Only run quota/eligibility trigger on INSERT or when item_id / chest_no changes
--    (updating screening_status, screening_remarks, or code_letter skips quota check)
DROP TRIGGER IF EXISTS trg_enforce_student_quota ON public.registrations;
CREATE TRIGGER trg_enforce_student_quota
  BEFORE INSERT OR UPDATE OF item_id, chest_no ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_registration_quota();

COMMIT;
