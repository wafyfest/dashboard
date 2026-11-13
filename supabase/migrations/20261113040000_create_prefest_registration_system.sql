-- ============================================================================
-- Migration: 20261113040000_create_special_events_registration_system.sql
-- Description:
--   Dedicated Pre-Fest Events Management & Registration System:
--   1. public.prefest_registration_settings:
--      Independent registration & YouTube submission controls and deadlines for SCREENING and SUBMISSION.
--   2. public.prefest_registrations:
--      College-level registrations for individual Pre-Fest Events, referencing public.events(id)
--      and public.colleges.
--   3. public.prefest_submissions:
--      YouTube video submissions linked to Pre-Fest Event registrations with independent deadlines.
--   4. RLS policies and server-side validation functions.
-- ============================================================================

BEGIN;

-- 1. Settings Table
CREATE TABLE IF NOT EXISTS public.prefest_registration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE CHECK (event_type IN ('SCREENING', 'SUBMISSION')),
  registration_enabled BOOLEAN NOT NULL DEFAULT false,
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  youtube_submission_enabled BOOLEAN NOT NULL DEFAULT false,
  youtube_submission_opens_at TIMESTAMPTZ,
  youtube_submission_closes_at TIMESTAMPTZ,
  disabled_event_ids UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed initial records if not present
INSERT INTO public.prefest_registration_settings (event_type, registration_enabled, youtube_submission_enabled)
VALUES
  ('SCREENING', false, false),
  ('SUBMISSION', false, false)
ON CONFLICT (event_type) DO NOTHING;

-- 2. Registrations Table
CREATE TABLE IF NOT EXISTS public.prefest_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  college_affl_no INT NOT NULL REFERENCES public.colleges(affl_no) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('SCREENING', 'SUBMISSION')),
  registration_status TEXT NOT NULL DEFAULT 'registered' CHECK (registration_status IN ('registered', 'cancelled')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_prefest_college_event UNIQUE (college_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_prefest_regs_college ON public.prefest_registrations(college_id);
CREATE INDEX IF NOT EXISTS idx_prefest_regs_affl ON public.prefest_registrations(college_affl_no);
CREATE INDEX IF NOT EXISTS idx_prefest_regs_event ON public.prefest_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_prefest_regs_type ON public.prefest_registrations(event_type);

-- 3. Submissions Table (YouTube Links)
CREATE TABLE IF NOT EXISTS public.prefest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.prefest_registrations(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  college_affl_no INT NOT NULL REFERENCES public.colleges(affl_no) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  youtube_url TEXT NOT NULL,
  submission_status TEXT NOT NULL DEFAULT 'submitted' CHECK (submission_status IN ('submitted', 'approved', 'rejected', 'pending')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_prefest_submission_reg UNIQUE (registration_id),
  CONSTRAINT check_prefest_youtube_url CHECK (
    youtube_url ~* '^(https?://)?(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/)|youtu\.be/)[a-zA-Z0-9_-]{11}(\S*)?$'
  )
);

CREATE INDEX IF NOT EXISTS idx_prefest_subs_college ON public.prefest_submissions(college_id);
CREATE INDEX IF NOT EXISTS idx_prefest_subs_affl ON public.prefest_submissions(college_affl_no);
CREATE INDEX IF NOT EXISTS idx_prefest_subs_event ON public.prefest_submissions(event_id);

-- 4. Server-Side Validation Trigger Functions
CREATE OR REPLACE FUNCTION public.validate_prefest_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_event RECORD;
  v_settings RECORD;
  v_college RECORD;
BEGIN
  -- 1. Fetch referenced event
  SELECT * INTO v_event FROM public.events WHERE id = NEW.event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referenced Pre-Fest Event does not exist.' USING ERRCODE = '23503';
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
  v_role := public.auth_user_role();
  IF v_role IS DISTINCT FROM 'admin'::user_role THEN
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
$$;

DROP TRIGGER IF EXISTS trg_validate_prefest_registration ON public.prefest_registrations;
CREATE TRIGGER trg_validate_prefest_registration
  BEFORE INSERT OR UPDATE ON public.prefest_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_prefest_registration();

-- Trigger for YouTube Submissions
CREATE OR REPLACE FUNCTION public.validate_prefest_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_reg RECORD;
  v_settings RECORD;
BEGIN
  -- 1. Fetch and verify parent registration
  SELECT * INTO v_reg FROM public.prefest_registrations WHERE id = NEW.registration_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated Pre-Fest Event registration does not exist.' USING ERRCODE = '23503';
  END IF;

  -- Populate consistent foreign keys
  NEW.college_id := v_reg.college_id;
  NEW.college_affl_no := v_reg.college_affl_no;
  NEW.event_id := v_reg.event_id;

  -- 2. Validate YouTube submission deadline
  v_role := public.auth_user_role();
  IF v_role IS DISTINCT FROM 'admin'::user_role THEN
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
$$;

DROP TRIGGER IF EXISTS trg_validate_prefest_submission ON public.prefest_submissions;
CREATE TRIGGER trg_validate_prefest_submission
  BEFORE INSERT OR UPDATE ON public.prefest_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_prefest_submission();

-- 5. Row Level Security Configuration
ALTER TABLE public.prefest_registration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefest_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefest_submissions ENABLE ROW LEVEL SECURITY;

-- Settings RLS: Readable by authenticated, manageable by Admin
DROP POLICY IF EXISTS "prefest_settings_read" ON public.prefest_registration_settings;
CREATE POLICY "prefest_settings_read"
  ON public.prefest_registration_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "prefest_settings_admin" ON public.prefest_registration_settings;
CREATE POLICY "prefest_settings_admin"
  ON public.prefest_registration_settings
  FOR ALL
  TO authenticated
  USING (public.auth_user_role() = 'admin'::user_role)
  WITH CHECK (public.auth_user_role() = 'admin'::user_role);

-- Registrations RLS: Scoped to College or Admin/Convenor
DROP POLICY IF EXISTS "prefest_regs_select" ON public.prefest_registrations;
CREATE POLICY "prefest_regs_select"
  ON public.prefest_registrations
  FOR SELECT
  TO authenticated
  USING (
    public.auth_user_role() IN ('admin'::user_role, 'convenor'::user_role)
    OR college_affl_no = public.auth_user_affl_no()
  );

DROP POLICY IF EXISTS "prefest_regs_insert" ON public.prefest_registrations;
CREATE POLICY "prefest_regs_insert"
  ON public.prefest_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.auth_user_role() = 'admin'::user_role
    OR college_affl_no = public.auth_user_affl_no()
  );

DROP POLICY IF EXISTS "prefest_regs_update" ON public.prefest_registrations;
CREATE POLICY "prefest_regs_update"
  ON public.prefest_registrations
  FOR UPDATE
  TO authenticated
  USING (
    public.auth_user_role() = 'admin'::user_role
    OR college_affl_no = public.auth_user_affl_no()
  )
  WITH CHECK (
    public.auth_user_role() = 'admin'::user_role
    OR college_affl_no = public.auth_user_affl_no()
  );

DROP POLICY IF EXISTS "prefest_regs_delete" ON public.prefest_registrations;
CREATE POLICY "prefest_regs_delete"
  ON public.prefest_registrations
  FOR DELETE
  TO authenticated
  USING (
    public.auth_user_role() = 'admin'::user_role
    OR college_affl_no = public.auth_user_affl_no()
  );

-- Submissions RLS: Scoped to College or Admin/Convenor
DROP POLICY IF EXISTS "prefest_subs_select" ON public.prefest_submissions;
CREATE POLICY "prefest_subs_select"
  ON public.prefest_submissions
  FOR SELECT
  TO authenticated
  USING (
    public.auth_user_role() IN ('admin'::user_role, 'convenor'::user_role)
    OR college_affl_no = public.auth_user_affl_no()
  );

DROP POLICY IF EXISTS "prefest_subs_insert" ON public.prefest_submissions;
CREATE POLICY "prefest_subs_insert"
  ON public.prefest_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.auth_user_role() = 'admin'::user_role
    OR college_affl_no = public.auth_user_affl_no()
  );

DROP POLICY IF EXISTS "prefest_subs_update" ON public.prefest_submissions;
CREATE POLICY "prefest_subs_update"
  ON public.prefest_submissions
  FOR UPDATE
  TO authenticated
  USING (
    public.auth_user_role() = 'admin'::user_role
    OR college_affl_no = public.auth_user_affl_no()
  )
  WITH CHECK (
    public.auth_user_role() = 'admin'::user_role
    OR college_affl_no = public.auth_user_affl_no()
  );

DROP POLICY IF EXISTS "prefest_subs_delete" ON public.prefest_submissions;
CREATE POLICY "prefest_subs_delete"
  ON public.prefest_submissions
  FOR DELETE
  TO authenticated
  USING (
    public.auth_user_role() = 'admin'::user_role
    OR college_affl_no = public.auth_user_affl_no()
  );

-- 6. Add to Supabase Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'prefest_registration_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prefest_registration_settings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'prefest_registrations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prefest_registrations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'prefest_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prefest_submissions;
  END IF;
END $$;

ALTER TABLE public.prefest_registration_settings REPLICA IDENTITY FULL;
ALTER TABLE public.prefest_registrations REPLICA IDENTITY FULL;
ALTER TABLE public.prefest_submissions REPLICA IDENTITY FULL;

COMMIT;

