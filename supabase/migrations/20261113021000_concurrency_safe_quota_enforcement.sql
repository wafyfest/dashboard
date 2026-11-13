-- Migration: 20261113021000_concurrency_safe_quota_enforcement.sql
-- Description: Concurrency-safe student registration quota enforcement with transaction-scoped advisory locks
-- Pattern: 64-bit namespaced advisory lock on (namespace || student_cic) before quota aggregation
-- Status: PREPARED (Unapplied to production per strict audit instructions)

CREATE OR REPLACE FUNCTION public.check_registration_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cic_no BIGINT;
  v_assigned_chest TEXT;
  v_student_phase TEXT;
  v_norm_stu_phase TEXT;
  v_target_mode TEXT;
  v_target_point_type TEXT;
  v_target_item_id INT;
  v_target_phase TEXT;
  v_norm_target_phase TEXT;
  v_target_category TEXT;
  v_target_item_code TEXT;

  v_on_max INT;
  v_off_max INT;
  v_total_max INT;
  v_group_max INT;

  v_current_total INT := 0;
  v_current_on INT := 0;
  v_current_off INT := 0;
  v_current_group INT := 0;

  v_lock_key BIGINT;
BEGIN
  IF current_setting('app.skip_chest_trigger', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.chest_no IS NULL OR TRIM(NEW.chest_no) = '' THEN
    RETURN NEW;
  END IF;

  v_cic_no := public.resolve_student_cic_no(NEW.chest_no, NEW.college_affl_no);
  IF v_cic_no IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cn.chest_no::TEXT INTO v_assigned_chest
  FROM public.chest_no cn
  WHERE cn.cic_no = v_cic_no
  LIMIT 1;

  SELECT phase INTO v_student_phase
  FROM public.students
  WHERE cic_no = v_cic_no
  LIMIT 1;

  IF v_student_phase IS NULL THEN
    v_student_phase := 'General';
  END IF;

  SELECT mode::text, point_type::text, item_id, phase, category::text, item_code
  INTO v_target_mode, v_target_point_type, v_target_item_id, v_target_phase, v_target_category, v_target_item_code
  FROM public.events
  WHERE item_id = NEW.item_id
  LIMIT 1;

  IF v_target_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_norm_stu_phase := LOWER(TRIM(COALESCE(v_student_phase, '')));
  v_norm_target_phase := LOWER(TRIM(COALESCE(v_target_phase, '')));

  IF v_norm_target_phase = 'general' THEN
    IF v_norm_stu_phase NOT IN ('thamheediyya', 'thamheediya', 'thamheed', 'th', 'junior', 'aliya', 'al', 'senior') THEN
      RAISE EXCEPTION 'Phase eligibility error: Only Thamheediyya and Aliya students can participate in General events (student phase: %).',
        v_student_phase
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_norm_target_phase IN ('special - foundation', 'special_foundation', 'foundation') THEN
    IF v_norm_stu_phase NOT IN ('foundation', 'fd', 'pre foundation', 'pre_foundation', 'pfd', 'pfd1', 'sub_junior', 'sub junior', 'sub-junior') THEN
      RAISE EXCEPTION 'Phase eligibility error: Only Foundation students can participate in % events (student phase: %).',
        v_target_phase, v_student_phase
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_norm_target_phase = 'thamheediyya' THEN
    IF v_norm_stu_phase NOT IN ('thamheediyya', 'thamheediya', 'thamheed', 'th', 'junior') THEN
      RAISE EXCEPTION 'Phase eligibility error: Only Thamheediyya students can participate in Thamheediyya events (student phase: %).',
        v_student_phase
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_norm_target_phase = 'aliya' THEN
    IF v_norm_stu_phase NOT IN ('aliya', 'al', 'senior') THEN
      RAISE EXCEPTION 'Phase eligibility error: Only Aliya students can participate in Aliya events (student phase: %).',
        v_student_phase
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_norm_target_phase = 'pg' THEN
    IF v_norm_stu_phase != 'pg' THEN
      RAISE EXCEPTION 'Phase eligibility error: Only PG students can participate in PG events (student phase: %).',
        v_student_phase
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Exempt Special / Category D / SE-numbered events from student max_participation quotas
  IF v_norm_target_phase LIKE 'special%'
     OR UPPER(TRIM(COALESCE(v_target_category, ''))) = 'D'
     OR UPPER(TRIM(COALESCE(v_target_item_code, ''))) ~ '^SE[0-9]+' THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(on_max, 99),
    COALESCE(off_max, 99),
    COALESCE(total_max, 99),
    COALESCE(group_max, 99)
  INTO v_on_max, v_off_max, v_total_max, v_group_max
  FROM public.max_participation
  WHERE (
    CASE
      WHEN LOWER(TRIM(phase)) IN ('foundation', 'fd', 'pre foundation', 'pre_foundation', 'pfd', 'pfd1', 'sub_junior', 'sub junior', 'sub-junior') THEN 'foundation'
      WHEN LOWER(TRIM(phase)) IN ('thamheediyya', 'thamheediya', 'thamheed', 'th', 'junior') THEN 'thamheediyya'
      WHEN LOWER(TRIM(phase)) IN ('aliya', 'al', 'senior') THEN 'aliya'
      ELSE LOWER(TRIM(phase))
    END
  ) = (
    CASE
      WHEN v_norm_stu_phase IN ('foundation', 'fd', 'pre foundation', 'pre_foundation', 'pfd', 'pfd1', 'sub_junior', 'sub junior', 'sub-junior') THEN 'foundation'
      WHEN v_norm_stu_phase IN ('thamheediyya', 'thamheediya', 'thamheed', 'th', 'junior') THEN 'thamheediyya'
      WHEN v_norm_stu_phase IN ('aliya', 'al', 'senior') THEN 'aliya'
      ELSE v_norm_stu_phase
    END
  )
  LIMIT 1;

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

  IF v_total_max IS NULL THEN
    v_on_max := 3;
    v_off_max := 4;
    v_total_max := 5;
    v_group_max := 3;
  END IF;

  -- CONCURRENCY GUARD:
  -- Acquire transaction-scoped advisory lock on namespaced student CIC.
  -- Serializes simultaneous registration requests for the same student while
  -- allowing independent students and colleges to execute completely in parallel.
  v_lock_key := ((hashtext('wafy_student_quota')::bigint & 4294967295::bigint) << 32)
                | (v_cic_no & 4294967295::bigint);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Count existing registrations across all events for this student
  -- (Under READ COMMITTED, statement snapshot sees all transactions committed prior to acquiring lock)
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
  JOIN public.events i ON i.item_id = r.item_id
  WHERE (
    (v_assigned_chest IS NOT NULL AND TRIM(r.chest_no) = v_assigned_chest)
    OR (TRIM(r.chest_no) ~* '^(ST-|CH-)' AND regexp_replace(r.chest_no, '\D', '', 'g') = v_cic_no::text)
    OR TRIM(r.chest_no) = TRIM(NEW.chest_no)
  )
  AND (TG_OP = 'INSERT' OR r.id != NEW.id)
  AND r.item_id != NEW.item_id
  AND LOWER(TRIM(COALESCE(i.phase, ''))) NOT LIKE 'special%'
  AND UPPER(TRIM(COALESCE(i.category::text, ''))) <> 'D'
  AND UPPER(TRIM(COALESCE(i.item_code, ''))) !~ '^SE[0-9]+';

  IF (v_current_total + 1) > v_total_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed total events for phase % is % (currently registered for %).',
      v_student_phase, v_total_max, v_current_total
      USING ERRCODE = '23514';
  END IF;

  IF v_target_mode = 'onstage' AND (v_current_on + 1) > v_on_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed onstage events for phase % is % (currently registered for %).',
      v_student_phase, v_on_max, v_current_on
      USING ERRCODE = '23514';
  END IF;

  IF v_target_mode != 'onstage' AND (v_current_off + 1) > v_off_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed offstage events for phase % is % (currently registered for %).',
      v_student_phase, v_off_max, v_current_off
      USING ERRCODE = '23514';
  END IF;

  IF v_target_point_type = 'group' AND (v_current_group + 1) > v_group_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed group events for phase % is % (currently registered for %).',
      v_student_phase, v_group_max, v_current_group
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_registration_quota() IS
  'Concurrency-hardened registration quota trigger function using 64-bit namespaced pg_advisory_xact_lock.';
