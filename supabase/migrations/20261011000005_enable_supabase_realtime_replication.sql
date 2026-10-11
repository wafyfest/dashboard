-- Migration: 20261011000005_enable_supabase_realtime_replication.sql
-- Description: Add all festival application tables to supabase_realtime publication to enable instant WebSockets sync without manual browser refreshes

-- 1. Enable logical replication for all application tables
ALTER PUBLICATION supabase_realtime ADD TABLE 
  public.registrations,
  public.entry_locks,
  public.items,
  public.results,
  public.schedules,
  public.stages,
  public.appeals,
  public.replacements,
  public.fest_settings,
  public.students,
  public.colleges,
  public.max_participation;

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
