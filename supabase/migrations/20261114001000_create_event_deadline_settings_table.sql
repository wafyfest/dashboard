-- Migration: Create event_deadline_settings table for universal deadline & fine management across all event kinds
-- Supports: onstage, offstage, submission, screening, general

CREATE TABLE IF NOT EXISTS public.event_deadline_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_kind TEXT NOT NULL UNIQUE CHECK (event_kind IN ('screening', 'submission', 'onstage', 'offstage', 'general')),
  display_name TEXT NOT NULL,
  description TEXT,

  -- 1. Registration Start Date & Time
  start_time TIMESTAMPTZ NOT NULL,

  -- 2. Registration Without Fine (Free) Date & Time
  no_fine_deadline TIMESTAMPTZ NOT NULL,

  -- 3. Registration With Fine Date & Time & Amount
  fine_deadline TIMESTAMPTZ NOT NULL,
  fine_amount INT NOT NULL DEFAULT 500 CHECK (fine_amount >= 0),

  -- 4. Registration With Super Fine Date & Time & Amount (Optional)
  has_super_fine BOOLEAN NOT NULL DEFAULT false,
  super_fine_deadline TIMESTAMPTZ,
  super_fine_amount INT DEFAULT 1000 CHECK (super_fine_amount IS NULL OR super_fine_amount >= 0),

  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_event_deadline_settings_kind ON public.event_deadline_settings(event_kind);
CREATE INDEX IF NOT EXISTS idx_event_deadline_settings_active ON public.event_deadline_settings(is_active);

-- Enable Row Level Security
ALTER TABLE public.event_deadline_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Readable by all authenticated users & public
DROP POLICY IF EXISTS "Event deadline settings readable by all" ON public.event_deadline_settings;
CREATE POLICY "Event deadline settings readable by all"
  ON public.event_deadline_settings FOR SELECT
  USING (true);

-- Policies: Writable exclusively by Admins
DROP POLICY IF EXISTS "Event deadline settings manageable by admin" ON public.event_deadline_settings;
CREATE POLICY "Event deadline settings manageable by admin"
  ON public.event_deadline_settings FOR ALL
  USING (public.auth_user_role() = 'admin');

-- Seed all 5 event kinds with official schedules
INSERT INTO public.event_deadline_settings (
  event_kind,
  display_name,
  description,
  start_time,
  no_fine_deadline,
  fine_deadline,
  fine_amount,
  has_super_fine,
  super_fine_deadline,
  super_fine_amount,
  is_active
) VALUES
  (
    'screening',
    'Screening Events',
    'Pre-Fest online preliminary screening competitions (Circular WSFWF_26_016).',
    '2026-11-15T04:30:00.000Z', -- 15/11/2026, 10:00 AM IST
    '2026-11-22T16:30:00.000Z', -- 22/11/2026, 10:00 PM IST (No Fine)
    '2026-11-24T16:30:00.000Z', -- 24/11/2026, 10:00 PM IST (₹200 Fine)
    200,
    false, -- No super fine in screening (locks directly after fine deadline)
    NULL,
    NULL,
    true
  ),
  (
    'submission',
    'Digital Submission Events',
    'Pre-Fest digital submission competitions requiring video/drive upload.',
    '2026-11-01T04:30:00.000Z',
    '2026-11-15T16:30:00.000Z',
    '2026-11-17T16:30:00.000Z',
    500,
    true,
    '2026-11-18T16:30:00.000Z',
    1000,
    true
  ),
  (
    'onstage',
    'On-Stage Events',
    'Main festival live stage performance competitions.',
    '2026-11-01T04:30:00.000Z',
    '2026-11-10T16:30:00.000Z',
    '2026-11-11T16:30:00.000Z',
    500,
    true,
    '2026-11-12T16:30:00.000Z',
    1000,
    true
  ),
  (
    'offstage',
    'Off-Stage Events',
    'Main festival offline writing, art, and hall competitions.',
    '2026-11-01T04:30:00.000Z',
    '2026-11-10T16:30:00.000Z',
    '2026-11-11T16:30:00.000Z',
    500,
    true,
    '2026-11-12T16:30:00.000Z',
    1000,
    true
  ),
  (
    'general',
    'General Festival Events',
    'Default master schedule fallback for all standard festival events.',
    '2026-11-01T04:30:00.000Z',
    '2026-11-10T16:30:00.000Z',
    '2026-11-11T16:30:00.000Z',
    500,
    true,
    '2026-11-12T16:30:00.000Z',
    1000,
    true
  )
ON CONFLICT (event_kind) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  start_time = EXCLUDED.start_time,
  no_fine_deadline = EXCLUDED.no_fine_deadline,
  fine_deadline = EXCLUDED.fine_deadline,
  fine_amount = EXCLUDED.fine_amount,
  has_super_fine = EXCLUDED.has_super_fine,
  super_fine_deadline = EXCLUDED.super_fine_deadline,
  super_fine_amount = EXCLUDED.super_fine_amount,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Enable Realtime Replication
ALTER TABLE public.event_deadline_settings REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_deadline_settings;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
