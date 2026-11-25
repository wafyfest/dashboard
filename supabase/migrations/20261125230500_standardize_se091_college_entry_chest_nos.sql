-- Migration: 20261125230500_standardize_se091_college_entry_chest_nos.sql
-- Description: 1. Guard assign_chest_no_on_registration() against resolving 'COL-%' entries as student chest numbers.
--              2. Standardize SE091 (Moral Video Making) institutional registrations to COL-<affl_no>.

BEGIN;

-- 1. Guard assign_chest_no_on_registration trigger against resolving COL-% as student chest numbers
CREATE OR REPLACE FUNCTION public.assign_chest_no_on_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cic_no BIGINT;
  v_assigned TEXT;
BEGIN
  IF current_setting('app.skip_chest_trigger', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Institutional / College Entry (e.g. 'COL-117', 'COL-134'):
  -- Do not resolve to individual students or overwrite with student chest numbers!
  IF NEW.chest_no ILIKE 'COL-%' OR NEW.chest_no ILIKE 'COLLEGE%' THEN
    NEW.cic_no := NULL;
    RETURN NEW;
  END IF;

  IF NEW.cic_no IS NOT NULL AND NEW.cic_no > 0 THEN
    v_cic_no := NEW.cic_no;
  ELSE
    v_cic_no := public.resolve_student_cic_no(NEW.chest_no, NEW.college_affl_no);
    IF v_cic_no IS NOT NULL THEN
      NEW.cic_no := v_cic_no;
    END IF;
  END IF;

  IF v_cic_no IS NOT NULL THEN
    v_assigned := public.ensure_student_chest_no(v_cic_no, NEW.college_affl_no);
    IF v_assigned IS NOT NULL THEN
      NEW.chest_no := v_assigned;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Standardize SE091 institutional registrations to COL-<affl_no>
UPDATE public.registrations
SET
  chest_no = 'COL-' || college_affl_no::text,
  cic_no = NULL
WHERE item_id = 91;

UPDATE public.late_registrations
SET
  chest_no = 'COL-' || college_affl_no::text,
  cic_no = NULL
WHERE item_id = 91;

COMMIT;
