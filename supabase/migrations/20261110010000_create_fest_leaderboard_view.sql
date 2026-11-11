-- ====================================================================
-- Migration: 20261110010000_create_fest_leaderboard_view.sql
-- Description: Server-side aggregation view & RPC function for the Fest
--              Leaderboard & Medal Standings Processor.
-- ====================================================================

-- 1. Create or replace the server-side aggregation view
CREATE OR REPLACE VIEW public.fest_leaderboard AS
WITH valid_results AS (
  SELECT
    r.id,
    COALESCE(r.college_affl_no, cl.college_affl_no, s.college_affl_no) AS college_affl_no,
    COALESCE(r.points, 0) AS points,
    r.rank
  FROM public.results r
  LEFT JOIN public.code_letters cl
    ON cl.item_id = r.item_id AND cl.code_letter = r.code_letter
  LEFT JOIN public.students s
    ON s.chest_no = r.chest_no
  WHERE r.published = true
)
SELECT
  DENSE_RANK() OVER (
    ORDER BY
      COALESCE(SUM(vr.points), 0) DESC,
      COUNT(vr.id) FILTER (WHERE vr.rank = 1) DESC,
      COUNT(vr.id) FILTER (WHERE vr.rank = 2) DESC,
      COUNT(vr.id) FILTER (WHERE vr.rank = 3) DESC,
      c.name ASC
  )::INT AS rank,
  c.id AS college_id,
  c.affl_no,
  c.name AS college_name,
  c.short_name AS college_short_name,
  c.type AS college_type,
  COALESCE(SUM(vr.points), 0)::NUMERIC AS points,
  COUNT(vr.id) FILTER (WHERE vr.rank = 1)::INT AS gold,
  COUNT(vr.id) FILTER (WHERE vr.rank = 2)::INT AS silver,
  COUNT(vr.id) FILTER (WHERE vr.rank = 3)::INT AS bronze,
  (
    COUNT(vr.id) FILTER (WHERE vr.rank = 1) +
    COUNT(vr.id) FILTER (WHERE vr.rank = 2) +
    COUNT(vr.id) FILTER (WHERE vr.rank = 3)
  )::INT AS total_medals
FROM public.colleges c
LEFT JOIN valid_results vr ON vr.college_affl_no = c.affl_no
GROUP BY c.id, c.affl_no, c.name, c.short_name, c.type
ORDER BY rank ASC, points DESC, gold DESC;

-- 2. Explicit grants for public / authenticated viewer access
GRANT SELECT ON public.fest_leaderboard TO anon, authenticated, service_role;

-- 3. Stored procedure / RPC function for high-performance direct server calls
CREATE OR REPLACE FUNCTION public.get_fest_leaderboard()
RETURNS SETOF public.fest_leaderboard
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.fest_leaderboard ORDER BY rank ASC, points DESC, gold DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_fest_leaderboard() TO anon, authenticated, service_role;

