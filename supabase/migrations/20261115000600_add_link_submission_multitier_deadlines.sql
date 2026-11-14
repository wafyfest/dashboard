-- Migration: Add multi-tier link submission deadlines and fines to event_deadline_settings
-- Purpose: Enable independent schedule for link submissions:
-- 1. Starting Date (link_start_time)
-- 2. Without Fine Cutoff (link_no_fine_deadline)
-- 3. With Late Fine Cutoff & Amount (link_fine_deadline, link_fine_amount)
-- 4. With Super Fine Cutoff & Amount (link_has_super_fine, link_super_fine_deadline, link_super_fine_amount)

ALTER TABLE public.event_deadline_settings
  ADD COLUMN IF NOT EXISTS link_start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS link_no_fine_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS link_fine_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS link_fine_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS link_has_super_fine BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_super_fine_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS link_super_fine_amount NUMERIC DEFAULT 0;

-- Populate existing rows with sensible defaults based on existing link_submission_deadline / deadlines
UPDATE public.event_deadline_settings
SET
  link_start_time = COALESCE(link_start_time, start_time),
  link_no_fine_deadline = COALESCE(link_no_fine_deadline, link_submission_deadline, fine_deadline, no_fine_deadline),
  link_fine_deadline = COALESCE(link_fine_deadline, link_submission_deadline, fine_deadline),
  link_fine_amount = COALESCE(link_fine_amount, 0),
  link_has_super_fine = COALESCE(link_has_super_fine, false),
  link_super_fine_deadline = COALESCE(link_super_fine_deadline, link_submission_deadline, super_fine_deadline),
  link_super_fine_amount = COALESCE(link_super_fine_amount, 0);
