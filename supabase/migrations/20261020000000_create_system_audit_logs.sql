-- Migration: 20261020000000_create_system_audit_logs.sql
-- Description: Comprehensive System Audit Log Trail with Live Triggers and Realtime Replication

-- 1. Create system_audit_logs table
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'danger')),
    actor_role TEXT DEFAULT 'admin',
    actor_name TEXT DEFAULT 'System',
    college_affl_no INT REFERENCES public.colleges(affl_no) ON DELETE SET NULL,
    item_id INT REFERENCES public.items(item_id) ON DELETE SET NULL,
    target_id TEXT,
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.system_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.system_audit_logs (category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.system_audit_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_college ON public.system_audit_logs (college_affl_no);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.system_audit_logs (severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_details ON public.system_audit_logs USING gin (details);

-- 3. Row Level Security
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_audit_logs' AND policyname = 'Admins full access to system_audit_logs'
  ) THEN
    CREATE POLICY "Admins full access to system_audit_logs"
      ON public.system_audit_logs
      FOR ALL
      TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      )
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_audit_logs' AND policyname = 'Allow insertion of system_audit_logs'
  ) THEN
    CREATE POLICY "Allow insertion of system_audit_logs"
      ON public.system_audit_logs
      FOR INSERT
      TO authenticated, anon
      WITH CHECK (true);
  END IF;
END $$;

-- 4. Enable Supabase Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'system_audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_audit_logs;
  END IF;
END $$;

ALTER TABLE public.system_audit_logs REPLICA IDENTITY FULL;

-- 5. Trigger Function
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
      SELECT item_code, name_eng INTO v_item_code, v_item_name FROM public.items WHERE item_id = NEW.item_id LIMIT 1;
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
      SELECT item_code, name_eng INTO v_item_code, v_item_name FROM public.items WHERE item_id = OLD.item_id LIMIT 1;
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
      SELECT item_code, name_eng INTO v_item_code, v_item_name FROM public.items WHERE item_id = NEW.item_id LIMIT 1;
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
      SELECT item_code INTO v_item_code FROM public.items WHERE item_id = NEW.item_id LIMIT 1;
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
      SELECT item_code INTO v_item_code FROM public.items WHERE item_id = NEW.item_id LIMIT 1;
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
      SELECT item_code, name_eng INTO v_item_code, v_item_name FROM public.items WHERE item_id = NEW.item_id LIMIT 1;
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
      SELECT item_code, name_eng INTO v_item_code, v_item_name FROM public.items WHERE item_id = NEW.item_id LIMIT 1;
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
      SELECT item_code, name_eng INTO v_item_code, v_item_name FROM public.items WHERE item_id = NEW.item_id LIMIT 1;
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
        'Festival settings updated (Reg Deadline: ' || COALESCE(NEW.reg_deadline::text, 'None') || ', Fine Deadline: ' || COALESCE(NEW.fine_deadline::text, 'None') || ')',
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

-- 6. Attach Triggers to Tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_registrations') THEN
    CREATE TRIGGER trg_audit_registrations
      AFTER INSERT OR DELETE ON public.registrations
      FOR EACH ROW EXECUTE FUNCTION public.log_system_event_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_entry_locks') THEN
    CREATE TRIGGER trg_audit_entry_locks
      AFTER UPDATE ON public.entry_locks
      FOR EACH ROW EXECUTE FUNCTION public.log_system_event_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_colleges') THEN
    CREATE TRIGGER trg_audit_colleges
      AFTER UPDATE ON public.colleges
      FOR EACH ROW EXECUTE FUNCTION public.log_system_event_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_appeals') THEN
    CREATE TRIGGER trg_audit_appeals
      AFTER INSERT OR UPDATE ON public.appeals
      FOR EACH ROW EXECUTE FUNCTION public.log_system_event_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_replacements') THEN
    CREATE TRIGGER trg_audit_replacements
      AFTER INSERT OR UPDATE ON public.replacements
      FOR EACH ROW EXECUTE FUNCTION public.log_system_event_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_results') THEN
    CREATE TRIGGER trg_audit_results
      AFTER INSERT OR UPDATE ON public.results
      FOR EACH ROW EXECUTE FUNCTION public.log_system_event_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_schedules') THEN
    CREATE TRIGGER trg_audit_schedules
      AFTER UPDATE ON public.schedules
      FOR EACH ROW EXECUTE FUNCTION public.log_system_event_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_announcements') THEN
    CREATE TRIGGER trg_audit_announcements
      AFTER INSERT OR DELETE ON public.announcements
      FOR EACH ROW EXECUTE FUNCTION public.log_system_event_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_volunteers') THEN
    CREATE TRIGGER trg_audit_volunteers
      AFTER INSERT OR UPDATE OR DELETE ON public.volunteers
      FOR EACH ROW EXECUTE FUNCTION public.log_system_event_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_fest_settings') THEN
    CREATE TRIGGER trg_audit_fest_settings
      AFTER UPDATE ON public.fest_settings
      FOR EACH ROW EXECUTE FUNCTION public.log_system_event_trigger();
  END IF;
END $$;
