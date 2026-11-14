-- Migration: 20261115001000_add_fine_waiver_and_manual_amount.sql
-- Description: Adds itemized waiver tracking to public.late_registrations and
--              explicit manual fine amount & reason to public.colleges.

BEGIN;

-- 1. Add waiver tracking columns to public.late_registrations
ALTER TABLE public.late_registrations
  ADD COLUMN IF NOT EXISTS is_waived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS waived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waived_by UUID;

CREATE INDEX IF NOT EXISTS idx_late_registrations_waiver
  ON public.late_registrations(college_affl_no, is_waived);

-- 2. Add manual administrative fine tracking to public.colleges
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS manual_fine_amount INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fine_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'colleges_manual_fine_amount_check'
      AND conrelid = 'public.colleges'::regclass
  ) THEN
    ALTER TABLE public.colleges
      ADD CONSTRAINT colleges_manual_fine_amount_check
      CHECK (manual_fine_amount >= 0);
  END IF;
END $$;

-- 3. Function to compute net fine for a college:
--    Sum of all active (unwaived) late registration fines + manual administrative fine
CREATE OR REPLACE FUNCTION public.get_college_net_fine(p_affl_no INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_late_fines INT := 0;
  v_manual_fine INT := 0;
BEGIN
  SELECT COALESCE(SUM(fine_amount), 0) INTO v_late_fines
  FROM public.late_registrations
  WHERE college_affl_no = p_affl_no
    AND is_waived IS FALSE;

  SELECT COALESCE(manual_fine_amount, 0) INTO v_manual_fine
  FROM public.colleges
  WHERE affl_no = p_affl_no;

  RETURN v_late_fines + v_manual_fine;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_college_net_fine(INT) TO authenticated, service_role, anon;

COMMIT;
