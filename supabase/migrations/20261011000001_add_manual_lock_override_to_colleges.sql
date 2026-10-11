-- Migration: Add manual_lock_override column to colleges table
ALTER TABLE public.colleges
ADD COLUMN IF NOT EXISTS manual_lock_override boolean DEFAULT false;

COMMENT ON COLUMN public.colleges.manual_lock_override IS 'Allows admin to override event lock deadlines for this specific college';
