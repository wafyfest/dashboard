-- Migration: 20261113201000_audit_remediation_prefest_and_chest_numbers.sql
-- Description: Comprehensive database audit fixes:
--   1. Fix 42P01 error in allocate_numeric_chest_numbers by ensuring tmp_old_chest_map
--      is always present for query planning and binding search_path = public, pg_temp.
--   2. Fix triggers validate_prefest_registration and validate_prefest_submission to
--      query prefest_registration_settings and prefest_registrations instead of legacy tables.
--   3. Modernize prefest RLS policies with InitPlan-cached auth functions and clean naming.

BEGIN;

-- ====================================================================
-- 1. FIX allocate_numeric_chest_numbers (Missing tmp_old_chest_map)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.allocate_numeric_chest_numbers(
  p_only_registered boolean DEFAULT true,
  p_reset boolean DEFAULT false
)
RETURNS TABLE(total_assigned bigint, newly_assigned bigint, min_chest_no bigint, max_chest_no bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_before_count BIGINT := 0;
  v_after_count BIGINT := 0;
  v_min BIGINT;
  v_max BIGINT;
  r_target RECORD;
BEGIN
  IF (SELECT public.auth_user_role())::text <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can allocate or renumber chest numbers.'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(74829101);
  PERFORM set_config('app.skip_chest_trigger', 'on', true);

  -- Always ensure temporary map table exists in pg_temp so query planner never fails on 42P01
  CREATE TEMP TABLE IF NOT EXISTS tmp_old_chest_map (
    old_chest_no TEXT,
    cic_no BIGINT,
    college_affl_no INT
  ) ON COMMIT DROP;

  TRUNCATE tmp_old_chest_map;

  IF COALESCE(p_reset, false) THEN
    -- Snapshot old chest_no -> cic_no before wiping so existing registrations/results remap accurately
    INSERT INTO tmp_old_chest_map (old_chest_no, cic_no, college_affl_no)
    SELECT
      old_cn.chest_no::TEXT,
      old_cn.cic_no,
      old_cn.college_affl_no
    FROM public.chest_no old_cn;

    DELETE FROM public.chest_no;
  END IF;

  SELECT COUNT(*) INTO v_before_count FROM public.chest_no;

  IF COALESCE(p_only_registered, true) THEN
    FOR r_target IN
      WITH reg_students AS (
        SELECT DISTINCT
          COALESCE(
            CASE WHEN COALESCE(p_reset, false) THEN (
              SELECT om.cic_no FROM tmp_old_chest_map om WHERE om.old_chest_no = TRIM(reg.chest_no) LIMIT 1
            ) END,
            public.resolve_student_cic_no(reg.chest_no, reg.college_affl_no)
          ) AS cic_no,
          reg.college_affl_no AS reg_college
        FROM public.registrations reg
      )
      SELECT
        rs.cic_no,
        COALESCE(s.college_affl_no, rs.reg_college) AS college_affl_no
      FROM reg_students rs
      LEFT JOIN public.students s ON s.cic_no = rs.cic_no
      LEFT JOIN public.chest_no cn ON cn.cic_no = rs.cic_no
      WHERE rs.cic_no IS NOT NULL
        AND cn.cic_no IS NULL
      ORDER BY
        COALESCE(s.college_affl_no, rs.reg_college) ASC NULLS LAST,
        s.phase ASC NULLS LAST,
        s.name ASC NULLS LAST,
        rs.cic_no ASC
    LOOP
      PERFORM public.ensure_student_chest_no(r_target.cic_no, r_target.college_affl_no);
    END LOOP;
  ELSE
    FOR r_target IN
      SELECT s.cic_no, s.college_affl_no
      FROM public.students s
      LEFT JOIN public.chest_no cn ON cn.cic_no = s.cic_no
      WHERE s.cic_no IS NOT NULL
        AND cn.cic_no IS NULL
      ORDER BY
        s.college_affl_no ASC NULLS LAST,
        s.phase ASC NULLS LAST,
        s.name ASC NULLS LAST,
        s.cic_no ASC
    LOOP
      PERFORM public.ensure_student_chest_no(r_target.cic_no, r_target.college_affl_no);
    END LOOP;
  END IF;

  -- Cascade new 101+ chest numbers across all tables (two-phase __SWAP__ avoids unique index collisions when numbers swap)
  IF COALESCE(p_reset, false) THEN
    UPDATE public.registrations r
    SET chest_no = '__SWAP__' || TRIM(r.chest_no)
    FROM tmp_old_chest_map om
    WHERE TRIM(r.chest_no) = om.old_chest_no;

    UPDATE public.registrations r
    SET chest_no = new_cn.chest_no::TEXT
    FROM tmp_old_chest_map om
    JOIN public.chest_no new_cn ON new_cn.cic_no = om.cic_no
    WHERE r.chest_no = '__SWAP__' || om.old_chest_no;

    UPDATE public.late_registrations lr
    SET chest_no = '__SWAP__' || TRIM(lr.chest_no)
    FROM tmp_old_chest_map om
    WHERE TRIM(lr.chest_no) = om.old_chest_no;

    UPDATE public.late_registrations lr
    SET chest_no = new_cn.chest_no::TEXT
    FROM tmp_old_chest_map om
    JOIN public.chest_no new_cn ON new_cn.cic_no = om.cic_no
    WHERE lr.chest_no = '__SWAP__' || om.old_chest_no;

    UPDATE public.submission_entries se
    SET chest_no = '__SWAP__' || TRIM(se.chest_no)
    FROM tmp_old_chest_map om
    WHERE TRIM(se.chest_no) = om.old_chest_no;

    UPDATE public.submission_entries se
    SET chest_no = new_cn.chest_no::TEXT
    FROM tmp_old_chest_map om
    JOIN public.chest_no new_cn ON new_cn.cic_no = om.cic_no
    WHERE se.chest_no = '__SWAP__' || om.old_chest_no;

    UPDATE public.code_letters cl
    SET chest_no = '__SWAP__' || TRIM(cl.chest_no)
    FROM tmp_old_chest_map om
    WHERE TRIM(cl.chest_no) = om.old_chest_no;

    UPDATE public.code_letters cl
    SET chest_no = new_cn.chest_no::TEXT
    FROM tmp_old_chest_map om
    JOIN public.chest_no new_cn ON new_cn.cic_no = om.cic_no
    WHERE cl.chest_no = '__SWAP__' || om.old_chest_no;

    UPDATE public.results res
    SET chest_no = '__SWAP__' || TRIM(res.chest_no)
    FROM tmp_old_chest_map om
    WHERE res.chest_no IS NOT NULL
      AND TRIM(res.chest_no) = om.old_chest_no;

    UPDATE public.results res
    SET chest_no = new_cn.chest_no::TEXT
    FROM tmp_old_chest_map om
    JOIN public.chest_no new_cn ON new_cn.cic_no = om.cic_no
    WHERE res.chest_no = '__SWAP__' || om.old_chest_no;

    UPDATE public.appeals ap
    SET chest_no = '__SWAP__' || TRIM(ap.chest_no)
    FROM tmp_old_chest_map om
    WHERE ap.chest_no IS NOT NULL
      AND TRIM(ap.chest_no) = om.old_chest_no;

    UPDATE public.appeals ap
    SET chest_no = new_cn.chest_no::TEXT
    FROM tmp_old_chest_map om
    JOIN public.chest_no new_cn ON new_cn.cic_no = om.cic_no
    WHERE ap.chest_no = '__SWAP__' || om.old_chest_no;
  END IF;

  -- Also normalize any remaining ST-/UUID values directly to their 101+ chest_no (dedupe first to prevent 23505)
  DELETE FROM public.registrations r
  USING public.chest_no cn
  WHERE public.resolve_student_cic_no(r.chest_no, r.college_affl_no) = cn.cic_no
    AND TRIM(r.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
    AND EXISTS (
      SELECT 1 FROM public.registrations r2
      WHERE r2.item_id = r.item_id
        AND TRIM(r2.chest_no) = cn.chest_no::TEXT
    );

  UPDATE public.registrations r
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE public.resolve_student_cic_no(r.chest_no, r.college_affl_no) = cn.cic_no
    AND TRIM(r.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  DELETE FROM public.late_registrations lr
  USING public.chest_no cn
  WHERE public.resolve_student_cic_no(lr.chest_no, lr.college_affl_no) = cn.cic_no
    AND TRIM(lr.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
    AND EXISTS (
      SELECT 1 FROM public.late_registrations lr2
      WHERE lr2.item_id = lr.item_id
        AND TRIM(lr2.chest_no) = cn.chest_no::TEXT
    );

  UPDATE public.late_registrations lr
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE public.resolve_student_cic_no(lr.chest_no, lr.college_affl_no) = cn.cic_no
    AND TRIM(lr.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  DELETE FROM public.submission_entries se
  USING public.chest_no cn
  WHERE public.resolve_student_cic_no(se.chest_no, se.college_affl_no) = cn.cic_no
    AND TRIM(se.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
    AND EXISTS (
      SELECT 1 FROM public.submission_entries se2
      WHERE se2.item_id = se.item_id
        AND TRIM(se2.chest_no) = cn.chest_no::TEXT
    );

  UPDATE public.submission_entries se
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE public.resolve_student_cic_no(se.chest_no, se.college_affl_no) = cn.cic_no
    AND TRIM(se.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  DELETE FROM public.code_letters cl
  USING public.chest_no cn
  WHERE public.resolve_student_cic_no(cl.chest_no, cl.college_affl_no) = cn.cic_no
    AND TRIM(cl.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
    AND EXISTS (
      SELECT 1 FROM public.code_letters cl2
      WHERE cl2.item_id = cl.item_id
        AND TRIM(cl2.chest_no) = cn.chest_no::TEXT
    );

  UPDATE public.code_letters cl
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE public.resolve_student_cic_no(cl.chest_no, cl.college_affl_no) = cn.cic_no
    AND TRIM(cl.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  UPDATE public.results res
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE res.chest_no IS NOT NULL
    AND public.resolve_student_cic_no(res.chest_no, res.college_affl_no) = cn.cic_no
    AND TRIM(res.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  UPDATE public.appeals ap
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE ap.chest_no IS NOT NULL
    AND public.resolve_student_cic_no(ap.chest_no, ap.college_affl_no) = cn.cic_no
    AND TRIM(ap.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  SELECT
    COUNT(*),
    MIN(chest_no),
    MAX(chest_no)
  INTO v_after_count, v_min, v_max
  FROM public.chest_no
  WHERE chest_no >= 101;

  RETURN QUERY
  SELECT
    v_after_count,
    GREATEST(v_after_count - v_before_count, 0),
    v_min,
    v_max;
END;
$function$;


-- ====================================================================
-- 2. REVISE VALIDATION TRIGGERS TO USE PREFEST TABLES
-- ====================================================================

CREATE OR REPLACE FUNCTION public.validate_prefest_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role public.user_role;
  v_event RECORD;
  v_settings RECORD;
  v_college RECORD;
BEGIN
  -- 1. Fetch referenced event
  SELECT * INTO v_event FROM public.events WHERE id = NEW.event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referenced pre-fest event does not exist.' USING ERRCODE = '23503';
  END IF;

  -- 2. Validate event classification matches event_type
  IF NEW.event_type = 'SCREENING' AND NOT COALESCE(v_event.is_screening, false) THEN
    RAISE EXCEPTION 'Event % is not marked as a screening event.', COALESCE(v_event.item_code, v_event.name_eng)
      USING ERRCODE = '23514';
  END IF;

  IF NEW.event_type = 'SUBMISSION' AND NOT COALESCE(v_event.is_submission, false) THEN
    RAISE EXCEPTION 'Event % is not marked as a submission event.', COALESCE(v_event.item_code, v_event.name_eng)
      USING ERRCODE = '23514';
  END IF;

  -- 3. Resolve and verify college_affl_no
  SELECT * INTO v_college FROM public.colleges WHERE id = NEW.college_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referenced college does not exist.' USING ERRCODE = '23503';
  END IF;
  NEW.college_affl_no := v_college.affl_no;

  -- 4. Check user role and deadline enforcement (Admin can override)
  v_role := (SELECT public.auth_user_role());
  IF v_role IS DISTINCT FROM 'admin'::public.user_role THEN
    SELECT * INTO v_settings FROM public.prefest_registration_settings WHERE event_type = NEW.event_type;
    IF NOT FOUND OR NOT v_settings.registration_enabled THEN
      RAISE EXCEPTION 'Registration for % events is currently disabled.', NEW.event_type
        USING ERRCODE = '23514';
    END IF;

    IF v_settings.registration_opens_at IS NOT NULL AND now() < v_settings.registration_opens_at THEN
      RAISE EXCEPTION 'Registration for % events has not opened yet.', NEW.event_type
        USING ERRCODE = '23514';
    END IF;

    IF v_settings.registration_closes_at IS NOT NULL AND now() > v_settings.registration_closes_at THEN
      RAISE EXCEPTION 'Registration deadline for % events has expired.', NEW.event_type
        USING ERRCODE = '23514';
    END IF;

    IF v_settings.disabled_event_ids IS NOT NULL AND NEW.event_id = ANY(v_settings.disabled_event_ids) THEN
      RAISE EXCEPTION 'Registration for event % is individually disabled by the administrator.', COALESCE(v_event.item_code, v_event.name_eng)
        USING ERRCODE = '23514';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_prefest_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role public.user_role;
  v_reg RECORD;
  v_settings RECORD;
BEGIN
  -- 1. Fetch and verify parent registration
  SELECT * INTO v_reg FROM public.prefest_registrations WHERE id = NEW.registration_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated pre-fest registration does not exist.' USING ERRCODE = '23503';
  END IF;

  -- Populate consistent foreign keys
  NEW.college_id := v_reg.college_id;
  NEW.college_affl_no := v_reg.college_affl_no;
  NEW.event_id := v_reg.event_id;

  -- 2. Validate YouTube submission deadline
  v_role := (SELECT public.auth_user_role());
  IF v_role IS DISTINCT FROM 'admin'::public.user_role THEN
    SELECT * INTO v_settings FROM public.prefest_registration_settings WHERE event_type = v_reg.event_type;
    IF NOT FOUND OR NOT v_settings.youtube_submission_enabled THEN
      RAISE EXCEPTION 'YouTube submissions for % events are currently disabled.', v_reg.event_type
        USING ERRCODE = '23514';
    END IF;

    IF v_settings.youtube_submission_opens_at IS NOT NULL AND now() < v_settings.youtube_submission_opens_at THEN
      RAISE EXCEPTION 'YouTube submissions for % events have not opened yet.', v_reg.event_type
        USING ERRCODE = '23514';
    END IF;

    IF v_settings.youtube_submission_closes_at IS NOT NULL AND now() > v_settings.youtube_submission_closes_at THEN
      RAISE EXCEPTION 'YouTube submission deadline for % events has expired.', v_reg.event_type
        USING ERRCODE = '23514';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- Update trigger bindings
DROP TRIGGER IF EXISTS trg_validate_special_event_registration ON public.prefest_registrations;
DROP TRIGGER IF EXISTS trg_validate_prefest_registration ON public.prefest_registrations;
CREATE TRIGGER trg_validate_prefest_registration
  BEFORE INSERT OR UPDATE ON public.prefest_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_prefest_registration();

DROP TRIGGER IF EXISTS trg_validate_special_event_submission ON public.prefest_submissions;
DROP TRIGGER IF EXISTS trg_validate_prefest_submission ON public.prefest_submissions;
CREATE TRIGGER trg_validate_prefest_submission
  BEFORE INSERT OR UPDATE ON public.prefest_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_prefest_submission();

-- Also update the old function names to point to the new implementation for backward compatibility
CREATE OR REPLACE FUNCTION public.validate_special_event_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN public.validate_prefest_registration();
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_special_event_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN public.validate_prefest_submission();
END;
$function$;


-- ====================================================================
-- 3. MODERNIZE PREFEST RLS POLICIES (InitPlan optimized, no collisions)
-- ====================================================================

-- prefest_registration_settings
DROP POLICY IF EXISTS "special_event_settings_read" ON public.prefest_registration_settings;
DROP POLICY IF EXISTS "special_event_settings_admin" ON public.prefest_registration_settings;
DROP POLICY IF EXISTS "prefest_settings_read" ON public.prefest_registration_settings;
DROP POLICY IF EXISTS "prefest_settings_admin" ON public.prefest_registration_settings;

CREATE POLICY "prefest_settings_read"
  ON public.prefest_registration_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "prefest_settings_admin"
  ON public.prefest_registration_settings
  FOR ALL
  TO authenticated
  USING ((SELECT public.auth_user_role()) = 'admin'::public.user_role)
  WITH CHECK ((SELECT public.auth_user_role()) = 'admin'::public.user_role);

-- prefest_registrations
DROP POLICY IF EXISTS "special_event_regs_select" ON public.prefest_registrations;
DROP POLICY IF EXISTS "special_event_regs_insert" ON public.prefest_registrations;
DROP POLICY IF EXISTS "special_event_regs_update" ON public.prefest_registrations;
DROP POLICY IF EXISTS "special_event_regs_delete" ON public.prefest_registrations;
DROP POLICY IF EXISTS "prefest_regs_select" ON public.prefest_registrations;
DROP POLICY IF EXISTS "prefest_regs_insert" ON public.prefest_registrations;
DROP POLICY IF EXISTS "prefest_regs_update" ON public.prefest_registrations;
DROP POLICY IF EXISTS "prefest_regs_delete" ON public.prefest_registrations;

CREATE POLICY "prefest_regs_select"
  ON public.prefest_registrations
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) IN ('admin'::public.user_role, 'convenor'::public.user_role)
    OR (college_affl_no = (SELECT public.auth_user_affl_no()) AND (SELECT public.auth_user_affl_no()) IS NOT NULL)
  );

CREATE POLICY "prefest_regs_insert"
  ON public.prefest_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::public.user_role
    OR (college_affl_no = (SELECT public.auth_user_affl_no()) AND (SELECT public.auth_user_affl_no()) IS NOT NULL)
  );

CREATE POLICY "prefest_regs_update"
  ON public.prefest_registrations
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'::public.user_role
    OR (college_affl_no = (SELECT public.auth_user_affl_no()) AND (SELECT public.auth_user_affl_no()) IS NOT NULL)
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::public.user_role
    OR (college_affl_no = (SELECT public.auth_user_affl_no()) AND (SELECT public.auth_user_affl_no()) IS NOT NULL)
  );

CREATE POLICY "prefest_regs_delete"
  ON public.prefest_registrations
  FOR DELETE
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'::public.user_role
    OR (college_affl_no = (SELECT public.auth_user_affl_no()) AND (SELECT public.auth_user_affl_no()) IS NOT NULL)
  );

-- prefest_submissions
DROP POLICY IF EXISTS "special_event_subs_select" ON public.prefest_submissions;
DROP POLICY IF EXISTS "special_event_subs_insert" ON public.prefest_submissions;
DROP POLICY IF EXISTS "special_event_subs_update" ON public.prefest_submissions;
DROP POLICY IF EXISTS "special_event_subs_delete" ON public.prefest_submissions;
DROP POLICY IF EXISTS "prefest_subs_select" ON public.prefest_submissions;
DROP POLICY IF EXISTS "prefest_subs_insert" ON public.prefest_submissions;
DROP POLICY IF EXISTS "prefest_subs_update" ON public.prefest_submissions;
DROP POLICY IF EXISTS "prefest_subs_delete" ON public.prefest_submissions;

CREATE POLICY "prefest_subs_select"
  ON public.prefest_submissions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) IN ('admin'::public.user_role, 'convenor'::public.user_role)
    OR (college_affl_no = (SELECT public.auth_user_affl_no()) AND (SELECT public.auth_user_affl_no()) IS NOT NULL)
  );

CREATE POLICY "prefest_subs_insert"
  ON public.prefest_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::public.user_role
    OR (college_affl_no = (SELECT public.auth_user_affl_no()) AND (SELECT public.auth_user_affl_no()) IS NOT NULL)
  );

CREATE POLICY "prefest_subs_update"
  ON public.prefest_submissions
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'::public.user_role
    OR (college_affl_no = (SELECT public.auth_user_affl_no()) AND (SELECT public.auth_user_affl_no()) IS NOT NULL)
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::public.user_role
    OR (college_affl_no = (SELECT public.auth_user_affl_no()) AND (SELECT public.auth_user_affl_no()) IS NOT NULL)
  );

CREATE POLICY "prefest_subs_delete"
  ON public.prefest_submissions
  FOR DELETE
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'::public.user_role
    OR (college_affl_no = (SELECT public.auth_user_affl_no()) AND (SELECT public.auth_user_affl_no()) IS NOT NULL)
  );

COMMIT;
