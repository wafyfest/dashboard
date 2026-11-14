-- Migration: 20261115000200_fix_student_login_grants_and_resilience.sql
-- Description:
--   Ensure verify_student_login can be executed by anon as well as authenticated and service_role
--   so that student authentication works reliably across serverless environments and client fallbacks.

GRANT EXECUTE ON FUNCTION public.verify_student_login(TEXT, TEXT) TO anon, authenticated, service_role;
