-- Migration: Create Announcements Table for Broadcast Notifications & Popups
-- Created: 2026-10-13

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'urgent' CHECK (priority IN ('urgent', 'warning', 'info', 'success')),
    target_type TEXT NOT NULL DEFAULT 'global' CHECK (target_type IN ('global', 'role', 'college', 'student', 'stage')),
    target_role TEXT,
    target_college_affl_no INTEGER,
    target_chest_no TEXT,
    target_stage_id INTEGER,
    action_url TEXT,
    action_label TEXT DEFAULT 'View Details',
    is_active BOOLEAN NOT NULL DEFAULT true,
    require_ack BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_targeting ON public.announcements(target_type, target_college_affl_no, target_chest_no);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'announcements_select_all'
    ) THEN
        CREATE POLICY announcements_select_all ON public.announcements FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'announcements_insert_all'
    ) THEN
        CREATE POLICY announcements_insert_all ON public.announcements FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'announcements_update_all'
    ) THEN
        CREATE POLICY announcements_update_all ON public.announcements FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'announcements_delete_all'
    ) THEN
        CREATE POLICY announcements_delete_all ON public.announcements FOR DELETE USING (true);
    END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
END $$;
