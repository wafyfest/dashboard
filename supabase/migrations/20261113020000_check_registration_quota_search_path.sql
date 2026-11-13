-- Migration: 20261113020000_check_registration_quota_search_path.sql
-- Description: Harden public.check_registration_quota() by setting search_path to empty string
-- Standard: CIS PostgreSQL & Supabase Security Hardening Guidelines
-- Status: PREPARED (Unapplied to production per strict audit instructions)

ALTER FUNCTION public.check_registration_quota()
SET search_path = '';

COMMENT ON FUNCTION public.check_registration_quota() IS 
  'Enforces student event quotas and phase eligibility with fully qualified dependencies under empty search_path.';
