-- Migration: 20261011000005_enable_supabase_realtime_replication.sql
-- Description: Add all festival application tables to supabase_realtime publication to enable instant WebSockets sync without manual browser refreshes

-- 1. Enable logical replication for all application tables
DO $$
DECLARE
  v_tbl text;
  v_tables text[] := ARRAY[
    'registrations', 'entry_locks', 'items', 'results', 'schedules',
    'stages', 'appeals', 'replacements', 'fest_settings', 'students',
    'colleges', 'max_participation'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = v_tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_tbl);
    END IF;
  END LOOP;
END $$;

-- 2. Set replica identity to FULL so that DELETE and UPDATE payloads contain complete row details
ALTER TABLE public.registrations REPLICA IDENTITY FULL;
ALTER TABLE public.entry_locks REPLICA IDENTITY FULL;
ALTER TABLE public.items REPLICA IDENTITY FULL;
ALTER TABLE public.results REPLICA IDENTITY FULL;
ALTER TABLE public.schedules REPLICA IDENTITY FULL;
ALTER TABLE public.stages REPLICA IDENTITY FULL;
ALTER TABLE public.appeals REPLICA IDENTITY FULL;
ALTER TABLE public.replacements REPLICA IDENTITY FULL;
ALTER TABLE public.fest_settings REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.colleges REPLICA IDENTITY FULL;
ALTER TABLE public.max_participation REPLICA IDENTITY FULL;
