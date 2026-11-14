-- Migration: 20261115000300_allow_anon_auth_user_role_and_fix_leaderboard.sql
-- Description:
--   Grant EXECUTE on auth_user_role() and auth_user_affl_no() to anon so that
--   public security_invoker views (such as fest_leaderboard) evaluate safely without 42501 permission denied errors.

GRANT EXECUTE ON FUNCTION public.auth_user_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_affl_no() TO anon, authenticated, service_role;
