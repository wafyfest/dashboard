-- Migration: 20261113190000_rename_special_events_to_prefest.sql
-- Description: Safely rename special_event_* tables, indexes, constraints, triggers,
--              and publication to prefest_* while preserving all live rows.

BEGIN;

-- 1. Rename Tables
ALTER TABLE IF EXISTS public.special_event_registration_settings 
  RENAME TO prefest_registration_settings;

ALTER TABLE IF EXISTS public.special_event_registrations 
  RENAME TO prefest_registrations;

ALTER TABLE IF EXISTS public.special_event_submissions 
  RENAME TO prefest_submissions;

-- 2. Rename Indexes
ALTER INDEX IF EXISTS public.idx_special_event_regs_college RENAME TO idx_prefest_regs_college;
ALTER INDEX IF EXISTS public.idx_special_event_regs_affl RENAME TO idx_prefest_regs_affl;
ALTER INDEX IF EXISTS public.idx_special_event_regs_event RENAME TO idx_prefest_regs_event;
ALTER INDEX IF EXISTS public.idx_special_event_regs_type RENAME TO idx_prefest_regs_type;

ALTER INDEX IF EXISTS public.idx_special_event_subs_college RENAME TO idx_prefest_subs_college;
ALTER INDEX IF EXISTS public.idx_special_event_subs_affl RENAME TO idx_prefest_subs_affl;
ALTER INDEX IF EXISTS public.idx_special_event_subs_event RENAME TO idx_prefest_subs_event;

-- 3. Rename Constraints
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_special_event_college_event') THEN
    ALTER TABLE public.prefest_registrations RENAME CONSTRAINT uq_special_event_college_event TO uq_prefest_college_event;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_special_event_submission_reg') THEN
    ALTER TABLE public.prefest_submissions RENAME CONSTRAINT uq_special_event_submission_reg TO uq_prefest_submission_reg;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_special_event_youtube_url') THEN
    ALTER TABLE public.prefest_submissions RENAME CONSTRAINT check_special_event_youtube_url TO check_prefest_youtube_url;
  END IF;
END $$;

-- 4. Re-register in Supabase Realtime Publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'special_event_registration_settings') THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.special_event_registration_settings;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'special_event_registrations') THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.special_event_registrations;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'special_event_submissions') THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.special_event_submissions;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'prefest_registration_settings') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.prefest_registration_settings;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'prefest_registrations') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.prefest_registrations;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'prefest_submissions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.prefest_submissions;
    END IF;
  END IF;
END $$;

COMMIT;
