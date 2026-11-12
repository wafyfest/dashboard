-- ============================================================================
-- Migration: 20261112000000_create_rate_limit_entries.sql
-- Description:
--   Persistent sliding-window rate limiting table + SECURITY DEFINER RPC
--   so serverless route instances share rate-limit state across cold starts.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
  key TEXT PRIMARY KEY,
  timestamps BIGINT[] NOT NULL DEFAULT '{}'::BIGINT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- No direct client access; only accessible via SECURITY DEFINER RPC or service_role
REVOKE ALL ON TABLE public.rate_limit_entries FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_ms BIGINT
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INT,
  reset_at BIGINT,
  retry_after_ms BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_cutoff BIGINT := v_now - p_window_ms;
  v_timestamps BIGINT[];
  v_oldest BIGINT;
  v_allowed BOOLEAN;
  v_count INT;
BEGIN
  -- Serialize updates per key to avoid race conditions across concurrent requests
  PERFORM pg_advisory_xact_lock(hashtext(p_key));

  SELECT r.timestamps
  INTO v_timestamps
  FROM public.rate_limit_entries r
  WHERE r.key = p_key;

  IF v_timestamps IS NULL THEN
    v_timestamps := '{}'::BIGINT[];
  ELSE
    SELECT COALESCE(array_agg(ts ORDER BY ts), '{}'::BIGINT[])
    INTO v_timestamps
    FROM unnest(v_timestamps) AS ts
    WHERE ts > v_cutoff;
  END IF;

  v_count := COALESCE(array_length(v_timestamps, 1), 0);
  v_allowed := v_count < p_limit;

  IF v_allowed THEN
    v_timestamps := array_append(v_timestamps, v_now);
    v_count := v_count + 1;
  END IF;

  INSERT INTO public.rate_limit_entries (key, timestamps, updated_at)
  VALUES (p_key, v_timestamps, NOW())
  ON CONFLICT (key) DO UPDATE
    SET timestamps = EXCLUDED.timestamps,
        updated_at = EXCLUDED.updated_at;

  v_oldest := COALESCE(v_timestamps[1], v_now);

  allowed := v_allowed;
  remaining := GREATEST(0, p_limit - v_count);
  reset_at := v_oldest + p_window_ms;
  retry_after_ms := GREATEST(0, (v_oldest + p_window_ms) - v_now);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, BIGINT) TO service_role;
