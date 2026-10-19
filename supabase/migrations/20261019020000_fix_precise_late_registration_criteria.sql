-- ====================================================================
-- Migration: Fix register_college_for_item_tx to strictly mark late entries based on timestamp
-- ====================================================================

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
  v_item RECORD;
  v_college RECORD;
  v_settings RECORD;
  v_reg_deadline TIMESTAMPTZ;
  v_fine_deadline TIMESTAMPTZ;
  v_has_override BOOLEAN := false;
  v_entry_lock_open BOOLEAN;
  v_is_late BOOLEAN := false;
  v_late_reason TEXT := 'Late Registration';
BEGIN
  -- 1. Explicit Fail-Closed Authorization
  v_role := (SELECT public.auth_user_role());
  v_affl := (SELECT public.auth_user_affl_no());

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_item FROM public.items WHERE item_id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item with ID % does not exist', p_item_id;
  END IF;

  SELECT * INTO v_college FROM public.colleges WHERE affl_no = p_college_affl_no;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'College with Affiliation No % does not exist', p_college_affl_no;
  END IF;

  SELECT * INTO v_settings FROM public.fest_settings LIMIT 1;
  v_has_override := COALESCE(v_college.manual_lock_override, false);

  v_reg_deadline := COALESCE(v_item.reg_deadline, v_settings.reg_deadline);
  v_fine_deadline := COALESCE(v_item.fine_deadline, v_settings.fine_deadline);

  -- Determine if this registration is genuinely late:
  -- Only when the actual registration time (now()) is past the regular registration deadline!
  IF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline THEN
    v_is_late := true;
    IF v_fine_deadline IS NOT NULL AND now() > v_fine_deadline THEN
      v_late_reason := 'Registered Past Final Deadline (Admin Override)';
    ELSE
      v_late_reason := 'Registered In Late Fine Window';
    END IF;
  END IF;

  IF v_role = 'admin'::user_role THEN
    -- Admin authorized for all colleges and bypasses lock checks
  ELSIF v_role = 'college'::user_role AND v_affl = p_college_affl_no THEN
    -- College authorized strictly for own affiliation

    -- Enforce Event Locks (Unless college has active administrative lock override)
    IF NOT v_has_override THEN
      -- A. Global Event Lock
      IF COALESCE(v_item.is_locked, false) THEN
        RAISE EXCEPTION 'Registration closed: Event % is locked by fest administration', COALESCE(v_item.item_code, p_item_id::text);
      END IF;

      -- B. 2D Entry Lock Matrix Check
      SELECT is_open INTO v_entry_lock_open
      FROM public.entry_locks
      WHERE item_id = p_item_id AND college_affl_no = p_college_affl_no;

      IF v_entry_lock_open IS NOT NULL AND NOT v_entry_lock_open THEN
        RAISE EXCEPTION 'Registration closed: Registration for event % is locked for your institution', COALESCE(v_item.item_code, p_item_id::text);
      END IF;

      -- C. Absolute Deadline Check (Registration is completely closed past fine deadline)
      IF now() > v_fine_deadline THEN
        RAISE EXCEPTION 'Registration deadline has passed for event %', COALESCE(v_item.item_code, p_item_id::text);
      END IF;
    END IF;

    -- Apply Fine Across Server:
    -- If registering after the regular registration deadline (either during the fine period
    -- or when using an administrative lock override), automatically flag late fine on college!
    IF now() > v_reg_deadline AND array_length(p_chest_nos, 1) > 0 THEN
      UPDATE public.colleges
      SET fine_status = true
      WHERE affl_no = p_college_affl_no;
    END IF;

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
        WHERE s.chest_no = c.chest_no
          AND s.college_affl_no = p_college_affl_no
      )
    ) THEN
      RAISE EXCEPTION 'All participants must belong to college affiliation %', p_college_affl_no;
    END IF;
  END IF;

  -- 3. Atomic Replacement of Existing Registrations for this event
  DELETE FROM public.registrations
  WHERE item_id = p_item_id
    AND college_affl_no = p_college_affl_no;

  DELETE FROM public.late_registrations
  WHERE item_id = p_item_id
    AND college_affl_no = p_college_affl_no;

  IF array_length(p_chest_nos, 1) > 0 THEN
    -- If this entry is late, also insert into late_registrations table!
    IF v_is_late THEN
      INSERT INTO public.late_registrations (
        item_id,
        college_affl_no,
        chest_no,
        late_reason,
        effective_deadline,
        registered_at
      )
      SELECT
        p_item_id,
        p_college_affl_no,
        c.chest_no,
        v_late_reason,
        v_reg_deadline,
        now()
      FROM unnest(p_chest_nos) AS c(chest_no)
      ON CONFLICT (item_id, chest_no) DO UPDATE
      SET
        late_reason = EXCLUDED.late_reason,
        effective_deadline = EXCLUDED.effective_deadline,
        registered_at = EXCLUDED.registered_at;
    END IF;

    RETURN QUERY
    INSERT INTO public.registrations (item_id, college_affl_no, chest_no)
    SELECT p_item_id, p_college_affl_no, c.chest_no
    FROM unnest(p_chest_nos) AS c(chest_no)
    RETURNING *;
  ELSE
    RETURN;
  END IF;
END;
$$;
