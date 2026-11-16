-- Migration: 20261116020000_update_fest_committee_with_students.sql
-- Description: Add cic_no, student_id, phone to fest_committee and update with exact student roster names.

BEGIN;

-- 1. Add cic_no, student_id, and phone columns to fest_committee
ALTER TABLE public.fest_committee
  ADD COLUMN IF NOT EXISTS cic_no BIGINT,
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_fest_committee_cic ON public.fest_committee(cic_no);
CREATE INDEX IF NOT EXISTS idx_fest_committee_student ON public.fest_committee(student_id);

-- 2. Clear previous entries and re-insert official 18 Fest Committee leaders
--    using exact full names from the students table
DELETE FROM public.fest_committee;

INSERT INTO public.fest_committee (
  student_id,
  cic_no,
  name,
  position,
  category,
  campus,
  phone,
  display_order,
  is_active
)
SELECT
  s.id AS student_id,
  c.cic_no,
  s.name,
  c.position,
  c.category,
  c.campus,
  c.phone,
  c.display_order,
  true AS is_active
FROM (
  VALUES
    (14051::BIGINT, 'Chairman', 'apex_chair', 'Wafy Campus Kalikavu', '+91 9567624405', 1),
    (17592::BIGINT, 'Vice Chairman', 'apex_chair', 'Wafy Campus Kalikavu', NULL, 2),
    (16425::BIGINT, 'Vice Chairman', 'apex_chair', 'Majma'' Kavanur', NULL, 3),
    (14411::BIGINT, 'General Convenor', 'general_convenor', 'Wafy Campus Kalikavu', '+91 7902700125', 4),
    (14404::BIGINT, 'Deputy Convenor', 'general_convenor', 'Wafy Campus Kalikavu', '+91 9745019789', 5),
    (15164::BIGINT, 'Convenor', 'fest_convenor', 'Wafy Campus Kalikavu', NULL, 6),
    (17981::BIGINT, 'Convenor', 'fest_convenor', 'MTM Chokli', NULL, 7),
    (16401::BIGINT, 'Convenor', 'fest_convenor', 'Wafy Campus Kalikavu', NULL, 8),
    (15205::BIGINT, 'Convenor', 'fest_convenor', 'Majma'' Kavanur', NULL, 9),
    (17600::BIGINT, 'Convenor', 'fest_convenor', 'PMSA Kadakkangal', NULL, 10),
    (18709::BIGINT, 'Technical Convenor', 'fest_convenor', 'Darul Uloom Thootha', '+91 8590826643', 11),
    (15838::BIGINT, 'Asst. Technical Convenor', 'technical_team', 'Wafy Campus Kalikavu', NULL, 12),
    (17243::BIGINT, 'Asst. Technical Convenor', 'technical_team', 'Wafy Campus Kalikavu', NULL, 13),
    (20532::BIGINT, 'Asst. Technical Convenor', 'technical_team', 'Majlis Puramannur', NULL, 14),
    (16481::BIGINT, 'Asst. Technical Convenor', 'technical_team', 'Wafy Campus Kalikavu', NULL, 15),
    (13245::BIGINT, 'Finance Secretary', 'executive_officers', 'Wafy Campus Kalikavu', '+91 8606378371', 16),
    (13757::BIGINT, 'Media Director', 'executive_officers', 'Wafy Campus Kalikavu', '+91 8304045581', 17),
    (13259::BIGINT, 'Volunteer Captain', 'executive_officers', 'Wafy Campus Kalikavu', '+91 9544157991', 18)
) AS c(cic_no, position, category, campus, phone, display_order)
JOIN public.students s ON s.cic_no = c.cic_no;

-- 3. Sync into blocked_students table with reason = 'Fest Committee'
INSERT INTO public.blocked_students (
  student_id,
  cic_no,
  college_affl_no,
  reason,
  notes,
  is_active,
  blocked_by,
  blocked_at
)
SELECT
  fc.student_id,
  fc.cic_no,
  s.college_affl_no,
  'Fest Committee',
  fc.position || ' (' || COALESCE(fc.campus, '') || ')',
  true,
  'Official Fest Committee Roster',
  now()
FROM public.fest_committee fc
JOIN public.students s ON s.id = fc.student_id
WHERE fc.student_id IS NOT NULL
ON CONFLICT (student_id) DO UPDATE
SET
  reason = 'Fest Committee',
  notes = EXCLUDED.notes,
  is_active = true,
  updated_at = now();

COMMIT;
