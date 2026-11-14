-- Migration: 20261115000400_fix_leaderboard_view_security.sql
-- Description:
--   Allow fest_leaderboard to be read securely by anon and authenticated users
--   by making the view security definer (security_invoker = false) and granting chest_no SELECT.

ALTER VIEW public.fest_leaderboard SET (security_invoker = false);
GRANT SELECT ON public.fest_leaderboard TO anon, authenticated, service_role;
GRANT SELECT ON public.chest_no TO anon, authenticated, service_role;
