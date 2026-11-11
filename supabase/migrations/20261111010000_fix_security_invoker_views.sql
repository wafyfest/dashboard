-- ============================================================================
-- Migration: 20261111010000_fix_security_invoker_views.sql
-- Description: Fix Supabase Database Linter 0010_security_definer_view errors
--              by setting security_invoker = true on public.fest_leaderboard
--              and public.items so views enforce the querying user's RLS policies.
-- ============================================================================

ALTER VIEW IF EXISTS public.fest_leaderboard SET (security_invoker = true);
ALTER VIEW IF EXISTS public.items SET (security_invoker = true);
