-- ====================================================================
-- MIGRATION: 20261011000002_harden_admin_and_public_rls.sql
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Helper Function Permissions
-- --------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.auth_user_affl_no() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_user_role() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restrict_profile_updates() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.auth_user_affl_no() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated;

-- --------------------------------------------------------------------
-- 2. Item Sequence Setup & Permission Grants
-- --------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.items_item_id_seq;
SELECT setval('public.items_item_id_seq', COALESCE((SELECT MAX(item_id) FROM public.items), 0) + 1, false);
ALTER TABLE public.items ALTER COLUMN item_id SET DEFAULT nextval('public.items_item_id_seq');

GRANT USAGE, SELECT ON SEQUENCE public.items_item_id_seq TO authenticated;

-- --------------------------------------------------------------------
-- 3. Fail-Closed Atomic Registration Function with Roster Validation
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_college_for_item_tx(
  p_item_id INT,
  p_college_affl_no INT,
  p_chest_nos TEXT[]
)
RETURNS SETOF public.registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_affl INT;
BEGIN
  -- 1. Explicit Fail-Closed Authorization
  v_role := (SELECT public.auth_user_role());
  v_affl := (SELECT public.auth_user_affl_no());

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_role = 'admin'::user_role THEN
    -- Admin authorized for all colleges
  ELSIF v_role = 'college'::user_role AND v_affl = p_college_affl_no THEN
    -- College authorized strictly for own affiliation
  ELSE
    RAISE EXCEPTION 'Access denied: not authorized for college %', p_college_affl_no;
  END IF;

  -- 2. Roster Validation: Every chest number must belong to this college
  IF array_length(p_chest_nos, 1) > 0 THEN
    IF EXISTS (
      SELECT 1
      FROM unnest(p_chest_nos) AS c(chest_no)
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.college_affl_no = p_college_affl_no
          AND (
            'ST-' || s.cic_no::text = c.chest_no
            OR s.cic_no::text = c.chest_no
            OR s.id::text = c.chest_no
          )
      )
    ) THEN
      RAISE EXCEPTION 'Validation error: one or more chest numbers do not belong to college %', p_college_affl_no;
    END IF;
  END IF;

  -- 3. Atomic Delete & Insert
  DELETE FROM public.registrations
  WHERE item_id = p_item_id AND college_affl_no = p_college_affl_no;

  IF array_length(p_chest_nos, 1) > 0 THEN
    RETURN QUERY
    INSERT INTO public.registrations (item_id, college_affl_no, chest_no)
    SELECT p_item_id, p_college_affl_no, unnest(p_chest_nos)
    RETURNING *;
  END IF;
END;
$$;

-- Revoke default PUBLIC execution and grant explicitly to authenticated
REVOKE EXECUTE ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) TO authenticated;

-- --------------------------------------------------------------------
-- 4. Transactional Replacement Review Function
-- --------------------------------------------------------------------
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
  v_orig_stu RECORD;
  v_new_stu RECORD;
  v_new_chest_no TEXT;
  v_rows_affected INT;
BEGIN
  -- 1. Admin-Only Gate
  v_role := (SELECT public.auth_user_role());
  IF v_role IS NULL OR v_role != 'admin'::user_role THEN
    RAISE EXCEPTION 'Access denied: executive admin privileges required';
  END IF;

  -- 2. Lock replacement row
  SELECT * INTO v_rep
  FROM public.replacements
  WHERE id = p_replacement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Replacement request % not found', p_replacement_id;
  END IF;

  -- 3. Execution on Approval
  IF p_status = 'Approved' THEN
    -- Verify registration exists
    SELECT * INTO v_reg
    FROM public.registrations
    WHERE id = v_rep.registration_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Target registration % does not exist', v_rep.registration_id;
    END IF;

    -- Verify both students belong to the registered college
    SELECT * INTO v_orig_stu
    FROM public.students
    WHERE id = v_rep.original_student_id AND college_affl_no = v_reg.college_affl_no;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Original student does not belong to college %', v_reg.college_affl_no;
    END IF;

    SELECT * INTO v_new_stu
    FROM public.students
    WHERE id = v_rep.replacement_student_id AND college_affl_no = v_reg.college_affl_no;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Replacement student does not belong to college %', v_reg.college_affl_no;
    END IF;

    v_new_chest_no := 'ST-' || v_new_stu.cic_no::text;

    -- Swap registration roster
    UPDATE public.registrations
    SET chest_no = v_new_chest_no
    WHERE id = v_reg.id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected != 1 THEN
      RAISE EXCEPTION 'Registration roster update failed (expected 1 row, affected %)', v_rows_affected;
    END IF;
  END IF;

  -- 4. Update replacement record
  UPDATE public.replacements
  SET status = p_status
  WHERE id = p_replacement_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Replacement status update failed (expected 1 row, affected %)', v_rows_affected;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_replacement_tx(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_replacement_tx(UUID, TEXT, TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 5. Hardened Registrations Policies (Discrete, Non-Overlapping)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow delete on registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow insert on registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow update on registrations" ON public.registrations;
DROP POLICY IF EXISTS "Registrations managed by admin or owning college" ON public.registrations;
DROP POLICY IF EXISTS "Registrations readable by all authenticated" ON public.registrations;

CREATE POLICY "registrations_select_authenticated"
  ON public.registrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "registrations_insert_scoped"
  ON public.registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR (
      (SELECT public.auth_user_role()) = 'college'::user_role
      AND college_affl_no = (SELECT public.auth_user_affl_no())
    )
  );

CREATE POLICY "registrations_update_scoped"
  ON public.registrations FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR (
      (SELECT public.auth_user_role()) = 'college'::user_role
      AND college_affl_no = (SELECT public.auth_user_affl_no())
    )
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR (
      (SELECT public.auth_user_role()) = 'college'::user_role
      AND college_affl_no = (SELECT public.auth_user_affl_no())
    )
  );

CREATE POLICY "registrations_delete_scoped"
  ON public.registrations FOR DELETE
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR (
      (SELECT public.auth_user_role()) = 'college'::user_role
      AND college_affl_no = (SELECT public.auth_user_affl_no())
    )
  );

-- --------------------------------------------------------------------
-- 6. Hardened Replacements Policies (Strictly Scoped Ownership)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "write_replacements" ON public.replacements;
DROP POLICY IF EXISTS "read_replacements" ON public.replacements;
DROP POLICY IF EXISTS "Replacements insertable by authenticated" ON public.replacements;
DROP POLICY IF EXISTS "Replacements readable by authenticated" ON public.replacements;
DROP POLICY IF EXISTS "Replacements updatable by admin" ON public.replacements;

CREATE POLICY "replacements_select_scoped"
  ON public.replacements FOR SELECT
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = registration_id
        AND r.college_affl_no = (SELECT public.auth_user_affl_no())
    )
  );

CREATE POLICY "replacements_insert_scoped"
  ON public.replacements FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR (
      (SELECT public.auth_user_role()) = 'college'::user_role
      AND EXISTS (
        SELECT 1 FROM public.registrations r
        WHERE r.id = registration_id
          AND r.college_affl_no = (SELECT public.auth_user_affl_no())
      )
    )
  );

CREATE POLICY "replacements_update_admin"
  ON public.replacements FOR UPDATE
  TO authenticated
  USING ((SELECT public.auth_user_role()) = 'admin'::user_role)
  WITH CHECK ((SELECT public.auth_user_role()) = 'admin'::user_role);

-- --------------------------------------------------------------------
-- 7. Hardened Appeals Policies
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Appeals insertable by anyone" ON public.appeals;
DROP POLICY IF EXISTS "Appeals insertable by college or admin" ON public.appeals;
DROP POLICY IF EXISTS "Appeals readable by author college or admin" ON public.appeals;
DROP POLICY IF EXISTS "Appeals updatable by admin" ON public.appeals;
DROP POLICY IF EXISTS "College users can read own appeals" ON public.appeals;

CREATE POLICY "appeals_select_scoped"
  ON public.appeals FOR SELECT
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR (
      (SELECT public.auth_user_role()) = 'college'::user_role
      AND college_affl_no = (SELECT public.auth_user_affl_no())
    )
  );

CREATE POLICY "appeals_insert_scoped"
  ON public.appeals FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR (
      (SELECT public.auth_user_role()) = 'college'::user_role
      AND college_affl_no = (SELECT public.auth_user_affl_no())
    )
  );

CREATE POLICY "appeals_update_admin"
  ON public.appeals FOR UPDATE
  TO authenticated
  USING ((SELECT public.auth_user_role()) = 'admin'::user_role)
  WITH CHECK ((SELECT public.auth_user_role()) = 'admin'::user_role);
