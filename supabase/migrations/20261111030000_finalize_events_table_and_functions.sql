-- ============================================================================
-- Migration: 20261111030000_finalize_events_table_and_functions.sql
-- Description:
--   Completes the `items` -> `events` table migration after removing the
--   compatibility view `public.items`:
--   1. Ensures `public.items` view is dropped cleanly in migration history.
--   2. Ensures `events_item_id_seq`, Realtime publication, and replica identity
--      are configured on `public.events`.
--   3. Updates all PostgreSQL functions and triggers (`register_college_for_item_tx`,
--      `log_system_event_trigger`, `check_registration_quota`) to reference
--      `public.events` instead of `public.items`.
-- ============================================================================

-- 1. Drop legacy compatibility view if still present
DROP VIEW IF EXISTS public.items;

-- 2. Ensure sequence and default on public.events.item_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'events_item_id_seq' AND c.relkind = 'S'
  ) THEN
    CREATE SEQUENCE public.events_item_id_seq;
  END IF;
END $$;

SELECT setval('public.events_item_id_seq', COALESCE((SELECT MAX(item_id) FROM public.events), 0) + 1, false);
ALTER TABLE public.events ALTER COLUMN item_id SET DEFAULT nextval('public.events_item_id_seq');
ALTER SEQUENCE public.events_item_id_seq OWNED BY public.events.item_id;
GRANT USAGE, SELECT ON SEQUENCE public.events_item_id_seq TO authenticated;

-- 3. Ensure public.events is in supabase_realtime publication with FULL replica identity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
END $$;

ALTER TABLE public.events REPLICA IDENTITY FULL;

-- 4. Update register_college_for_item_tx to query public.events and students.cic_no
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

  SELECT * INTO v_item FROM public.events WHERE item_id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event with ID % does not exist', p_item_id;
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
  -- Only when the actual registration time (now()) is past the regular registration deadline
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

      -- C. Absolute Deadline Check
      IF v_fine_deadline IS NOT NULL AND now() > v_fine_deadline THEN
        RAISE EXCEPTION 'Registration deadline has passed for event %', COALESCE(v_item.item_code, p_item_id::text);
      END IF;
    END IF;

    -- Flag late fine on college when registering after regular registration deadline
    IF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline AND array_length(p_chest_nos, 1) > 0 THEN
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
        WHERE s.college_affl_no = p_college_affl_no
          AND (
            'ST-' || s.cic_no::text = c.chest_no
            OR s.cic_no::text = c.chest_no
            OR s.id::text = c.chest_no
          )
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

REVOKE EXECUTE ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) TO authenticated;

-- 5. Update log_system_event_trigger to query public.events
CREATE OR REPLACE FUNCTION public.log_system_event_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role text;
  v_item_code text;
  v_col_name text;
  v_item_name text;
BEGIN
  BEGIN
    v_actor_role := (SELECT public.auth_user_role());
  EXCEPTION WHEN OTHERS THEN
    v_actor_role := 'system';
  END;
  IF v_actor_role IS NULL THEN
    v_actor_role := 'system';
  END IF;

  -- 1. REGISTRATIONS
  IF TG_TABLE_NAME = 'registrations' THEN
    IF TG_OP = 'INSERT' THEN
      SELECT item_code, name_eng INTO v_item_code, v_item_name FROM public.events WHERE item_id = NEW.item_id LIMIT 1;
      SELECT short_name INTO v_col_name FROM public.colleges WHERE affl_no = NEW.college_affl_no LIMIT 1;
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        college_affl_no, item_id, target_id, description, details
      ) VALUES (
        'REGISTRATION_ADD',
        'REGISTRATION',
        'success',
        v_actor_role,
        COALESCE(v_col_name, 'Affl ' || NEW.college_affl_no::text),
        NEW.college_affl_no,
        NEW.item_id,
        NEW.chest_no,
        'Registered candidate (Chest: ' || NEW.chest_no || ') for ' || COALESCE(v_item_code, 'Item #' || NEW.item_id::text) || ' - ' || COALESCE(v_item_name, ''),
        jsonb_build_object('chest_no', NEW.chest_no, 'item_id', NEW.item_id, 'college_affl_no', NEW.college_affl_no)
      );
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      SELECT item_code, name_eng INTO v_item_code, v_item_name FROM public.events WHERE item_id = OLD.item_id LIMIT 1;
      SELECT short_name INTO v_col_name FROM public.colleges WHERE affl_no = OLD.college_affl_no LIMIT 1;
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        college_affl_no, item_id, target_id, description, details
      ) VALUES (
        'REGISTRATION_REMOVE',
        'REGISTRATION',
        'warning',
        v_actor_role,
        COALESCE(v_col_name, 'Affl ' || OLD.college_affl_no::text),
        OLD.college_affl_no,
        OLD.item_id,
        OLD.chest_no,
        'Unregistered candidate (Chest: ' || OLD.chest_no || ') from ' || COALESCE(v_item_code, 'Item #' || OLD.item_id::text) || ' - ' || COALESCE(v_item_name, ''),
        jsonb_build_object('chest_no', OLD.chest_no, 'item_id', OLD.item_id, 'college_affl_no', OLD.college_affl_no)
      );
      RETURN OLD;
    END IF;

  -- 2. ENTRY LOCKS
  ELSIF TG_TABLE_NAME = 'entry_locks' THEN
    IF TG_OP = 'UPDATE' AND (OLD.is_open IS DISTINCT FROM NEW.is_open) THEN
      SELECT item_code, name_eng INTO v_item_code, v_item_name FROM public.events WHERE item_id = NEW.item_id LIMIT 1;
      SELECT short_name INTO v_col_name FROM public.colleges WHERE affl_no = NEW.college_affl_no LIMIT 1;
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        college_affl_no, item_id, description, details
      ) VALUES (
        CASE WHEN NEW.is_open THEN 'LOCK_OPENED' ELSE 'LOCK_CLOSED' END,
        'LOCKS',
        CASE WHEN NEW.is_open THEN 'info' ELSE 'warning' END,
        v_actor_role,
        'Admin',
        NEW.college_affl_no,
        NEW.item_id,
        CASE WHEN NEW.is_open THEN 'Unlocked entry for ' ELSE 'Locked entry for ' END ||
          COALESCE(v_col_name, 'Affl ' || NEW.college_affl_no::text) || ' in ' || COALESCE(v_item_code, 'Item #' || NEW.item_id::text),
        jsonb_build_object('item_id', NEW.item_id, 'college_affl_no', NEW.college_affl_no, 'is_open', NEW.is_open, 'previous', OLD.is_open)
      );
    END IF;
    RETURN NEW;

  -- 3. COLLEGES
  ELSIF TG_TABLE_NAME = 'colleges' THEN
    IF TG_OP = 'UPDATE' THEN
      IF (OLD.manual_lock_override IS DISTINCT FROM NEW.manual_lock_override) THEN
        INSERT INTO public.system_audit_logs (
          action_type, category, severity, actor_role, actor_name,
          college_affl_no, description, details
        ) VALUES (
          CASE WHEN NEW.manual_lock_override THEN 'OVERRIDE_ENABLED' ELSE 'OVERRIDE_DISABLED' END,
          'LOCKS',
          CASE WHEN NEW.manual_lock_override THEN 'warning' ELSE 'info' END,
          v_actor_role,
          'Admin',
          NEW.affl_no,
          'Manual lock override ' || (CASE WHEN NEW.manual_lock_override THEN 'GRANTED to ' ELSE 'REVOKED from ' END) || NEW.name || ' (#' || NEW.affl_no || ')',
          jsonb_build_object('manual_lock_override', NEW.manual_lock_override, 'college_affl_no', NEW.affl_no)
        );
      END IF;
      IF (OLD.fine_status IS DISTINCT FROM NEW.fine_status) THEN
        INSERT INTO public.system_audit_logs (
          action_type, category, severity, actor_role, actor_name,
          college_affl_no, description, details
        ) VALUES (
          CASE WHEN NEW.fine_status THEN 'FINE_LEVIED' ELSE 'FINE_CLEARED' END,
          'SETTINGS',
          CASE WHEN NEW.fine_status THEN 'danger' ELSE 'success' END,
          v_actor_role,
          'Admin',
          NEW.affl_no,
          'Late fine status changed to ' || (CASE WHEN NEW.fine_status THEN 'FLAGGED (Active Fine)' ELSE 'CLEARED' END) || ' for ' || NEW.name,
          jsonb_build_object('fine_status', NEW.fine_status, 'college_affl_no', NEW.affl_no)
        );
      END IF;
    END IF;
    RETURN NEW;

  -- 4. APPEALS
  ELSIF TG_TABLE_NAME = 'appeals' THEN
    IF TG_OP = 'INSERT' THEN
      SELECT item_code INTO v_item_code FROM public.events WHERE item_id = NEW.item_id LIMIT 1;
      SELECT short_name INTO v_col_name FROM public.colleges WHERE affl_no = NEW.college_affl_no LIMIT 1;
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        college_affl_no, item_id, target_id, description, details
      ) VALUES (
        'APPEAL_SUBMITTED',
        'APPEALS',
        'warning',
        'college',
        COALESCE(v_col_name, 'College'),
        NEW.college_affl_no,
        NEW.item_id,
        NEW.id::text,
        'Appeal filed for ' || COALESCE(v_item_code, 'Item #' || NEW.item_id::text) || ' by ' || COALESCE(v_col_name, 'College') || ': ' || LEFT(NEW.reason_for_appeal, 100),
        jsonb_build_object('appeal_id', NEW.id, 'status', NEW.current_status, 'reason', NEW.reason_for_appeal, 'tx_no', NEW.transaction_number)
      );
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND (OLD.current_status IS DISTINCT FROM NEW.current_status OR OLD.admin_remarks IS DISTINCT FROM NEW.admin_remarks) THEN
      SELECT item_code INTO v_item_code FROM public.events WHERE item_id = NEW.item_id LIMIT 1;
      SELECT short_name INTO v_col_name FROM public.colleges WHERE affl_no = NEW.college_affl_no LIMIT 1;
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        college_affl_no, item_id, target_id, description, details
      ) VALUES (
        'APPEAL_STATUS_UPDATE',
        'APPEALS',
        CASE WHEN NEW.current_status = 'Approved' THEN 'success' WHEN NEW.current_status = 'Rejected' THEN 'danger' ELSE 'info' END,
        v_actor_role,
        'Admin',
        NEW.college_affl_no,
        NEW.item_id,
        NEW.id::text,
        'Appeal status updated to ' || NEW.current_status || ' for ' || COALESCE(v_item_code, 'Item #' || NEW.item_id::text) || (CASE WHEN NEW.admin_remarks IS NOT NULL THEN ' (Remarks: ' || NEW.admin_remarks || ')' ELSE '' END),
        jsonb_build_object('appeal_id', NEW.id, 'old_status', OLD.current_status, 'new_status', NEW.current_status, 'remarks', NEW.admin_remarks)
      );
      RETURN NEW;
    END IF;

  -- 5. REPLACEMENTS
  ELSIF TG_TABLE_NAME = 'replacements' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        target_id, description, details
      ) VALUES (
        'REPLACEMENT_REQUESTED',
        'APPEALS',
        'warning',
        'college',
        'College',
        NEW.id::text,
        'Candidate replacement requested: ' || LEFT(NEW.reason, 120),
        jsonb_build_object('replacement_id', NEW.id, 'status', NEW.status, 'reason', NEW.reason)
      );
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        target_id, description, details
      ) VALUES (
        'REPLACEMENT_STATUS_UPDATE',
        'APPEALS',
        CASE WHEN NEW.status = 'Approved' THEN 'success' WHEN NEW.status = 'Rejected' THEN 'danger' ELSE 'info' END,
        v_actor_role,
        'Admin',
        NEW.id::text,
        'Candidate replacement status changed from ' || OLD.status || ' to ' || NEW.status,
        jsonb_build_object('replacement_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
      );
      RETURN NEW;
    END IF;

  -- 6. RESULTS
  ELSIF TG_TABLE_NAME = 'results' THEN
    IF TG_OP = 'INSERT' THEN
      SELECT item_code, name_eng INTO v_item_code, v_item_name FROM public.events WHERE item_id = NEW.item_id LIMIT 1;
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        college_affl_no, item_id, description, details
      ) VALUES (
        'RESULT_RECORDED',
        'RESULTS',
        'info',
        v_actor_role,
        'Result Entry',
        NEW.college_affl_no,
        NEW.item_id,
        'Result recorded for ' || COALESCE(v_item_code, 'Item #' || NEW.item_id::text) || ' - Grade ' || COALESCE(NEW.grade, 'N/A') || ', Rank ' || COALESCE(NEW.rank::text, 'N/A'),
        jsonb_build_object('item_id', NEW.item_id, 'grade', NEW.grade, 'rank', NEW.rank, 'published', NEW.published)
      );
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND (OLD.published IS DISTINCT FROM NEW.published) THEN
      SELECT item_code, name_eng INTO v_item_code, v_item_name FROM public.events WHERE item_id = NEW.item_id LIMIT 1;
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        college_affl_no, item_id, description, details
      ) VALUES (
        CASE WHEN NEW.published THEN 'RESULT_PUBLISHED' ELSE 'RESULT_UNPUBLISHED' END,
        'RESULTS',
        CASE WHEN NEW.published THEN 'success' ELSE 'warning' END,
        v_actor_role,
        'Admin',
        NEW.college_affl_no,
        NEW.item_id,
        'Results ' || (CASE WHEN NEW.published THEN 'PUBLISHED to public' ELSE 'UNPUBLISHED (Hidden)' END) || ' for ' || COALESCE(v_item_code, 'Item #' || NEW.item_id::text) || ' - ' || COALESCE(v_item_name, ''),
        jsonb_build_object('item_id', NEW.item_id, 'published', NEW.published)
      );
      RETURN NEW;
    END IF;

  -- 7. SCHEDULES
  ELSIF TG_TABLE_NAME = 'schedules' THEN
    IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.stage_number IS DISTINCT FROM NEW.stage_number) THEN
      SELECT item_code, name_eng INTO v_item_code, v_item_name FROM public.events WHERE item_id = NEW.item_id LIMIT 1;
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        item_id, description, details
      ) VALUES (
        'SCHEDULE_STATUS_UPDATE',
        'SCHEDULE',
        'info',
        v_actor_role,
        'Stage Controller',
        NEW.item_id,
        COALESCE(v_item_code, 'Item #' || NEW.item_id::text) || ' stage status shifted to ' || NEW.status::text || ' on Stage ' || NEW.stage_number,
        jsonb_build_object('item_id', NEW.item_id, 'stage_number', NEW.stage_number, 'old_status', OLD.status::text, 'new_status', NEW.status::text)
      );
      RETURN NEW;
    END IF;

  -- 8. ANNOUNCEMENTS
  ELSIF TG_TABLE_NAME = 'announcements' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        target_id, description, details
      ) VALUES (
        'ANNOUNCEMENT_POSTED',
        'ANNOUNCEMENTS',
        'info',
        v_actor_role,
        'Admin',
        NEW.id::text,
        'Broadcast alert posted: "' || LEFT(NEW.title, 80) || '" (Target: ' || NEW.target_type || ')',
        jsonb_build_object('title', NEW.title, 'priority', NEW.priority, 'target_type', NEW.target_type)
      );
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        target_id, description, details
      ) VALUES (
        'ANNOUNCEMENT_DELETED',
        'ANNOUNCEMENTS',
        'warning',
        v_actor_role,
        'Admin',
        OLD.id::text,
        'Broadcast alert removed: "' || LEFT(OLD.title, 80) || '"',
        jsonb_build_object('title', OLD.title)
      );
      RETURN OLD;
    END IF;

  -- 9. VOLUNTEERS
  ELSIF TG_TABLE_NAME = 'volunteers' THEN
    IF TG_OP = 'INSERT' THEN
      SELECT short_name INTO v_col_name FROM public.colleges WHERE affl_no = NEW.college_affl_no LIMIT 1;
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        college_affl_no, target_id, description, details
      ) VALUES (
        'VOLUNTEER_REGISTERED',
        'VOLUNTEERS',
        'info',
        v_actor_role,
        COALESCE(v_col_name, 'College'),
        NEW.college_affl_no,
        NEW.id::text,
        'Volunteer registered for ' || COALESCE(v_col_name, 'Affl ' || NEW.college_affl_no::text) || ' (Preference: ' || COALESCE(NEW.duty_preference, 'Any') || ')',
        jsonb_build_object('volunteer_id', NEW.id, 'status', NEW.status, 'tshirt_size', NEW.tshirt_size)
      );
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
      SELECT short_name INTO v_col_name FROM public.colleges WHERE affl_no = NEW.college_affl_no LIMIT 1;
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        college_affl_no, target_id, description, details
      ) VALUES (
        'VOLUNTEER_STATUS_UPDATE',
        'VOLUNTEERS',
        CASE WHEN NEW.status = 'Approved' THEN 'success' ELSE 'info' END,
        v_actor_role,
        'Admin',
        NEW.college_affl_no,
        NEW.id::text,
        'Volunteer status updated to ' || NEW.status || ' for ' || COALESCE(v_col_name, 'College #' || NEW.college_affl_no::text),
        jsonb_build_object('volunteer_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
      );
      RETURN NEW;
    END IF;

  -- 10. FEST SETTINGS
  ELSIF TG_TABLE_NAME = 'fest_settings' THEN
    IF TG_OP = 'UPDATE' THEN
      INSERT INTO public.system_audit_logs (
        action_type, category, severity, actor_role, actor_name,
        description, details
      ) VALUES (
        'SETTINGS_UPDATED',
        'SETTINGS',
        'warning',
        v_actor_role,
        'Admin',
        'Fest settings updated (Reg Deadline: ' || COALESCE(NEW.reg_deadline::text, 'None') || ', Fine Deadline: ' || COALESCE(NEW.fine_deadline::text, 'None') || ')',
        jsonb_build_object('reg_deadline', NEW.reg_deadline, 'fine_deadline', NEW.fine_deadline, 'fest_name', NEW.fest_name)
      );
      RETURN NEW;
    END IF;

  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Audit log trigger exception: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Update check_registration_quota to query public.events (and pin search_path)
CREATE OR REPLACE FUNCTION public.check_registration_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF NEW.chest_no IS NULL OR TRIM(NEW.chest_no) = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_cic_no := regexp_replace(NEW.chest_no, '\D', '', 'g')::BIGINT;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  SELECT phase INTO v_student_phase
  FROM public.students
  WHERE cic_no = v_cic_no
  LIMIT 1;

  IF v_student_phase IS NULL THEN
    SELECT phase, cic_no INTO v_student_phase, v_cic_no
    FROM public.students
    WHERE id::text = NEW.chest_no
    LIMIT 1;
  END IF;

  IF v_student_phase IS NULL THEN
    v_student_phase := 'General';
  END IF;

  SELECT mode::text, point_type::text, item_id
  INTO v_target_mode, v_target_point_type, v_target_item_id
  FROM public.events
  WHERE item_id = NEW.item_id
  LIMIT 1;

  IF v_target_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(on_max, 99),
    COALESCE(off_max, 99),
    COALESCE(total_max, 99),
    COALESCE(group_max, 99)
  INTO v_on_max, v_off_max, v_total_max, v_group_max
  FROM public.max_participation
  WHERE LOWER(phase) = LOWER(v_student_phase)
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
    regexp_replace(COALESCE(r.chest_no, ''), '\D', '', 'g') = v_cic_no::text
    OR r.chest_no = NEW.chest_no
  )
  AND (TG_OP = 'INSERT' OR r.id != NEW.id)
  AND r.item_id != NEW.item_id;

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
