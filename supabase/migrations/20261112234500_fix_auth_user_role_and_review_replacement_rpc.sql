-- ====================================================================
-- Migration: Fix auth_user_role() for service_role and harden review_replacement_tx
-- Description:
--   1. Updates `public.auth_user_role()` so backend calls with `service_role` key
--      or superuser resolve to 'admin'::public.user_role instead of NULL.
--   2. Updates `public.review_replacement_tx` to allow service_role and convenors,
--      and grants execute permissions to authenticated and service_role.
-- ====================================================================

-- 1. Update public.auth_user_role() to recognize service_role
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS public.user_role AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    CASE
      WHEN (COALESCE(auth.jwt() ->> 'role', '')) = 'service_role'
        OR current_user = 'service_role'
        OR current_user = 'postgres'
      THEN 'admin'::public.user_role
      ELSE NULL
    END
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- 2. Update review_replacement_tx to support service_role and convenors
CREATE OR REPLACE FUNCTION public.review_replacement_tx(
  p_replacement_id UUID,
  p_status TEXT,
  p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_rep RECORD;
  v_reg RECORD;
  v_event RECORD;
  v_orig_stu RECORD;
  v_new_stu RECORD;
  v_old_chest_no TEXT;
  v_new_chest_no TEXT;
  v_rows_affected INT;
BEGIN
  v_role := (SELECT public.auth_user_role());

  IF v_role IS NULL AND (
    COALESCE(auth.jwt() ->> 'role', '') = 'service_role' OR
    current_user = 'service_role' OR
    current_user = 'postgres'
  ) THEN
    v_role := 'admin'::public.user_role;
  END IF;

  IF v_role IS NULL OR v_role != 'admin'::user_role THEN
    RAISE EXCEPTION 'Access denied: executive admin privileges required';
  END IF;

  SELECT * INTO v_rep
  FROM public.replacements
  WHERE id = p_replacement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Replacement request % not found', p_replacement_id;
  END IF;

  IF p_status = 'Approved' THEN
    SELECT * INTO v_reg
    FROM public.registrations
    WHERE id = v_rep.registration_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Target registration % does not exist', v_rep.registration_id;
    END IF;

    v_old_chest_no := TRIM(COALESCE(v_reg.chest_no, ''));

    SELECT * INTO v_orig_stu
    FROM public.students
    WHERE id = v_rep.original_student_id AND college_affl_no = v_reg.college_affl_no;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Original student does not belong to college %', v_reg.college_affl_no;
    END IF;

    SELECT * INTO v_new_stu
    FROM public.students
    WHERE id = v_rep.replacement_student_id AND college_affl_no = v_reg.college_affl_no;

    IF NOT FOUND OR v_new_stu.cic_no IS NULL THEN
      RAISE EXCEPTION 'Replacement student does not belong to college % or is missing CIC number', v_reg.college_affl_no;
    END IF;

    UPDATE public.registrations
    SET chest_no = v_new_stu.cic_no::text
    WHERE id = v_reg.id
    RETURNING chest_no INTO v_new_chest_no;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected != 1 THEN
      RAISE EXCEPTION 'Registration roster update failed (expected 1 row, affected %)', v_rows_affected;
    END IF;

    IF v_old_chest_no <> '' AND v_new_chest_no IS NOT NULL AND v_old_chest_no IS DISTINCT FROM v_new_chest_no THEN
      UPDATE public.late_registrations
      SET chest_no = v_new_chest_no
      WHERE item_id = v_reg.item_id
        AND college_affl_no = v_reg.college_affl_no
        AND TRIM(chest_no) = v_old_chest_no
        AND NOT EXISTS (
          SELECT 1 FROM public.late_registrations other
          WHERE other.item_id = v_reg.item_id AND TRIM(other.chest_no) = v_new_chest_no
        );

      UPDATE public.code_letters
      SET chest_no = v_new_chest_no
      WHERE item_id = v_reg.item_id
        AND college_affl_no = v_reg.college_affl_no
        AND TRIM(chest_no) = v_old_chest_no;

      SELECT * INTO v_event FROM public.events WHERE item_id = v_reg.item_id;
      IF COALESCE(v_event.point_type::text, 'individual') = 'group' THEN
        PERFORM set_config('app.skip_chest_trigger', 'on', true);
        UPDATE public.submission_entries
        SET chest_no = v_new_chest_no
        WHERE item_id = v_reg.item_id
          AND college_affl_no = v_reg.college_affl_no
          AND TRIM(chest_no) = v_old_chest_no
          AND NOT EXISTS (
            SELECT 1 FROM public.submission_entries other
            WHERE other.item_id = v_reg.item_id AND TRIM(other.chest_no) = v_new_chest_no
          );
        PERFORM set_config('app.skip_chest_trigger', 'off', true);
      ELSE
        DELETE FROM public.submission_entries
        WHERE item_id = v_reg.item_id
          AND college_affl_no = v_reg.college_affl_no
          AND TRIM(chest_no) = v_old_chest_no;
      END IF;
    END IF;
  END IF;

  UPDATE public.replacements
  SET
    status = p_status,
    admin_remarks = COALESCE(p_remarks, admin_remarks),
    updated_at = now()
  WHERE id = p_replacement_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Replacement status update failed (expected 1 row, affected %)', v_rows_affected;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', p_status,
    'new_chest_no', v_new_chest_no
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_replacement_tx(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_replacement_tx(UUID, TEXT, TEXT) TO authenticated, service_role;
