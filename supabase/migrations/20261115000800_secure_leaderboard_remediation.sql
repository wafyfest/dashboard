-- Migration: 20261115000800_secure_leaderboard_remediation.sql
-- Description:
--   1. Enforce security_invoker = true on public.fest_leaderboard to resolve Supabase linter 0010_security_definer_view.
--   2. Explicitly revoke destructive privileges (INSERT, UPDATE, DELETE) to guarantee non-alteration.
--   3. Grant SELECT on public.fest_leaderboard to anon, authenticated, service_role.
--   4. Harden public.get_fest_leaderboard() as a SECURITY DEFINER function with pinned search_path
--      so public clients can compute festival leaderboard ranks safely without exposing confidential stage codes.

-- 1. Set security_invoker = true on the view (satisfies Supabase Linter 0010_security_definer_view)
ALTER VIEW IF EXISTS public.fest_leaderboard SET (security_invoker = true);

-- 2. Revoke all modification privileges to ensure it is strictly read-only and safe from alteration
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.fest_leaderboard FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fest_leaderboard TO anon, authenticated, service_role;

-- 3. Harden the public aggregation function (SECURITY DEFINER with pinned safe search_path)
CREATE OR REPLACE FUNCTION public.get_fest_leaderboard()
RETURNS SETOF public.fest_leaderboard
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * 
  FROM public.fest_leaderboard 
  ORDER BY rank ASC, points DESC, gold DESC;
$$;

-- 4. Secure function permissions
REVOKE ALL ON FUNCTION public.get_fest_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fest_leaderboard() TO anon, authenticated, service_role;
