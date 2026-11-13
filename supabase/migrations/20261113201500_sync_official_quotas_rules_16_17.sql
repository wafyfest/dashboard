-- Migration: 20261113201500_sync_official_quotas_rules_16_17.sql
-- Description: Align max_participation with official festival manual rules 16 & 17:
--   Rule 16: Foundation, Thamheediyya, Aliya individual events quota:
--            Total maximum = 7 (On-stage max = 3, Off-stage max = 4).
--   Rule 17: General category quota: Total maximum = 2.

BEGIN;

-- 1. Update Foundation, Thamheediyya, Aliya quotas
UPDATE public.max_participation
SET 
  on_max = 3,
  off_max = 4,
  total_max = 7
WHERE phase IN ('Foundation', 'Thamheediyya', 'Aliya');

-- 2. Update General category quota
UPDATE public.max_participation
SET 
  on_max = 2,
  off_max = 2,
  total_max = 2
WHERE phase = 'General';

COMMIT;
