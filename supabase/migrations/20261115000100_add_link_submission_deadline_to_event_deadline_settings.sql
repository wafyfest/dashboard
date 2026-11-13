-- Migration: Add link_submission_deadline column to event_deadline_settings
-- Purpose: Separate deadline for uploading screening links (e.g., YouTube video URLs)
-- This column applies only to the 'screening' event kind, but is added to all rows for schema simplicity.

ALTER TABLE public.event_deadline_settings
  ADD COLUMN IF NOT EXISTS link_submission_deadline TIMESTAMPTZ;

-- Optional: set default values for existing rows (use current fine_deadline as placeholder)
DO $$
BEGIN
  UPDATE public.event_deadline_settings
  SET link_submission_deadline = fine_deadline
  WHERE link_submission_deadline IS NULL;
END $$;
