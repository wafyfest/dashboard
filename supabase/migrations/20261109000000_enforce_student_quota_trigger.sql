-- Migration: Server-Side Student Quota Validation Guard
-- Enforces max_participation quotas directly in PostgreSQL on public.registrations

CREATE OR REPLACE FUNCTION public.check_registration_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_cic_no BIGINT;
  v_student_phase TEXT;
  v_target_mode TEXT;
  v_target_point_type TEXT;
  v_target_item_id INT;
  
  v_on_max INT;
  v_off_max INT;
  v_total_max INT;
  v_group_max INT;
  
  v_current_total INT := 0;
  v_current_on INT := 0;
  v_current_off INT := 0;
  v_current_group INT := 0;
BEGIN
  -- 1. Extract numeric cic_no from NEW.chest_no (e.g. 'ST-24261' -> 24261)
  IF NEW.chest_no IS NULL OR TRIM(NEW.chest_no) = '' THEN
    RETURN NEW; -- Skip if no chest_no
  END IF;

  BEGIN
    v_cic_no := regexp_replace(NEW.chest_no, '\D', '', 'g')::BIGINT;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  -- 2. Lookup student's phase from students table
  SELECT phase INTO v_student_phase 
  FROM public.students 
  WHERE cic_no = v_cic_no
  LIMIT 1;

  IF v_student_phase IS NULL THEN
    -- Fallback: check by id if chest_no is UUID
    SELECT phase, cic_no INTO v_student_phase, v_cic_no
    FROM public.students
    WHERE id::text = NEW.chest_no
    LIMIT 1;
  END IF;

  IF v_student_phase IS NULL THEN
    v_student_phase := 'General';
  END IF;

  -- 3. Lookup target item details
  SELECT mode::text, point_type::text, item_id 
  INTO v_target_mode, v_target_point_type, v_target_item_id
  FROM public.items 
  WHERE item_id = NEW.item_id 
  LIMIT 1;

  IF v_target_item_id IS NULL THEN
    RETURN NEW; -- Item not found, let foreign key or application handle
  END IF;

  -- 4. Lookup quota rules from max_participation for this phase
  SELECT 
    COALESCE(on_max, 99), 
    COALESCE(off_max, 99), 
    COALESCE(total_max, 99), 
    COALESCE(group_max, 99)
  INTO v_on_max, v_off_max, v_total_max, v_group_max
  FROM public.max_participation
  WHERE LOWER(phase) = LOWER(v_student_phase)
  LIMIT 1;

  -- Fallback to 'General' quota if phase not matched
  IF NOT FOUND THEN
    SELECT 
      COALESCE(on_max, 99), 
      COALESCE(off_max, 99), 
      COALESCE(total_max, 99), 
      COALESCE(group_max, 99)
    INTO v_on_max, v_off_max, v_total_max, v_group_max
    FROM public.max_participation
    WHERE LOWER(phase) = 'general'
    LIMIT 1;
  END IF;

  -- Default safety caps if max_participation is empty
  IF v_total_max IS NULL THEN
    v_on_max := 3;
    v_off_max := 4;
    v_total_max := 5;
    v_group_max := 3;
  END IF;

  -- 5. Calculate student's existing registrations (excluding current record on UPDATE)
  SELECT 
    COUNT(DISTINCT r.item_id),
    COUNT(DISTINCT CASE WHEN i.mode::text = 'onstage' THEN r.item_id END),
    COUNT(DISTINCT CASE WHEN i.mode::text != 'onstage' THEN r.item_id END),
    COUNT(DISTINCT CASE WHEN i.point_type::text = 'group' THEN r.item_id END)
  INTO 
    v_current_total,
    v_current_on,
    v_current_off,
    v_current_group
  FROM public.registrations r
  JOIN public.items i ON i.item_id = r.item_id
  WHERE (
    regexp_replace(COALESCE(r.chest_no, ''), '\D', '', 'g') = v_cic_no::text
    OR r.chest_no = NEW.chest_no
  )
  AND (TG_OP = 'INSERT' OR r.id != NEW.id)
  AND r.item_id != NEW.item_id;

  -- 6. Enforce Quotas
  -- Total Max Check
  IF (v_current_total + 1) > v_total_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed total events for phase % is % (currently registered for %).',
      v_student_phase, v_total_max, v_current_total
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  -- Onstage Max Check
  IF v_target_mode = 'onstage' AND (v_current_on + 1) > v_on_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed onstage events for phase % is % (currently registered for %).',
      v_student_phase, v_on_max, v_current_on
      USING ERRCODE = '23514';
  END IF;

  -- Offstage Max Check
  IF v_target_mode != 'onstage' AND (v_current_off + 1) > v_off_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed offstage events for phase % is % (currently registered for %).',
      v_student_phase, v_off_max, v_current_off
      USING ERRCODE = '23514';
  END IF;

  -- Group Max Check
  IF v_target_point_type = 'group' AND (v_current_group + 1) > v_group_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed group events for phase % is % (currently registered for %).',
      v_student_phase, v_group_max, v_current_group
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if present to ensure clean idempotency
DROP TRIGGER IF EXISTS trg_enforce_student_quota ON public.registrations;

-- Bind Trigger to registrations table BEFORE INSERT OR UPDATE
CREATE TRIGGER trg_enforce_student_quota
BEFORE INSERT OR UPDATE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.check_registration_quota();

