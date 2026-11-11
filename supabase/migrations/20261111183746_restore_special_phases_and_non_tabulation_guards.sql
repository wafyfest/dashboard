-- ============================================================================
-- Migration: Restore Special Phases on SE090-SE093 & Apply Category D Guards
-- Timestamp: 20261111183746 (follows 20261111080000 already applied remotely)
-- Description:
--   1. Restores previous Special Program phases on SE090-SE093:
--        - SE090 Campaign Setting   -> 'Special' (open to all phases)
--        - SE091 Moral Video Making -> 'Special' (open to all phases)
--        - SE092 Expo               -> 'Special - Foundation' (Foundation only)
--        - SE093 Live Art           -> 'Special' (open to all phases)
--      while preserving updated titles, category = 'D', tabulation = false,
--      point_type, and no_of_participants = NULL.
--   2. Updates public.check_registration_quota() so Special / Category D /
--      ^SE[0-9]+ events remain exempt from student max_participation quotas
--      and strictly enforce phase eligibility.
--   3. Updates public.fest_leaderboard so non-tabulation / Category D results
--      never add championship points (preserving security_invoker = true).
-- ============================================================================

BEGIN;

-- 1. Restore Special / Special - Foundation phases on SE090-SE093
UPDATE public.events AS e
SET
  phase = v.phase,
  mode = v.mode,
  category = v.category,
  tabulation = v.tabulation,
  point_type = v.point_type,
  no_of_participants = v.no_of_participants
FROM (
  VALUES
    (90, 'SE090', 'Special',              'offstage'::public.item_mode, 'D'::char(1), false, 'group'::public.point_type,      NULL::int),
    (91, 'SE091', 'Special',              'offstage'::public.item_mode, 'D'::char(1), false, 'group'::public.point_type,      NULL::int),
    (92, 'SE092', 'Special - Foundation', 'offstage'::public.item_mode, 'D'::char(1), false, 'individual'::public.point_type, NULL::int),
    (93, 'SE093', 'Special',              'onstage'::public.item_mode,  'D'::char(1), false, 'individual'::public.point_type, NULL::int)
) AS v(item_id, item_code, phase, mode, category, tabulation, point_type, no_of_participants)
WHERE e.item_id = v.item_id;

-- 2. Keep server-side quota & eligibility trigger synchronized:
--    - Enforce phase eligibility (General -> Thamheediyya/Aliya;
--      Special - Foundation -> Foundation only; Special -> all student phases)
--    - Keep Special / Category D / SE-numbered events (SE090-SE093) exempt
--      from student max_participation quotas
CREATE OR REPLACE FUNCTION public.check_registration_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cic_no BIGINT;
  v_assigned_chest TEXT;
  v_student_phase TEXT;
  v_norm_stu_phase TEXT;
  v_target_mode TEXT;
  v_target_point_type TEXT;
  v_target_item_id INT;
  v_target_phase TEXT;
  v_norm_target_phase TEXT;
  v_target_category TEXT;
  v_target_item_code TEXT;

  v_on_max INT;
  v_off_max INT;
  v_total_max INT;
  v_group_max INT;

  v_current_total INT := 0;
  v_current_on INT := 0;
  v_current_off INT := 0;
  v_current_group INT := 0;
BEGIN
  IF current_setting('app.skip_chest_trigger', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.chest_no IS NULL OR TRIM(NEW.chest_no) = '' THEN
    RETURN NEW;
  END IF;

  v_cic_no := public.resolve_student_cic_no(NEW.chest_no, NEW.college_affl_no);
  IF v_cic_no IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cn.chest_no::TEXT INTO v_assigned_chest
  FROM public.chest_no cn
  WHERE cn.cic_no = v_cic_no
  LIMIT 1;

  SELECT phase INTO v_student_phase
  FROM public.students
  WHERE cic_no = v_cic_no
  LIMIT 1;

  IF v_student_phase IS NULL THEN
    v_student_phase := 'General';
  END IF;

  SELECT mode::text, point_type::text, item_id, phase, category::text, item_code
  INTO v_target_mode, v_target_point_type, v_target_item_id, v_target_phase, v_target_category, v_target_item_code
  FROM public.events
  WHERE item_id = NEW.item_id
  LIMIT 1;

  IF v_target_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_norm_stu_phase := LOWER(TRIM(COALESCE(v_student_phase, '')));
  v_norm_target_phase := LOWER(TRIM(COALESCE(v_target_phase, '')));

  IF v_norm_target_phase = 'general' THEN
    IF v_norm_stu_phase NOT IN ('thamheediyya', 'thamheediya', 'thamheed', 'th', 'junior', 'aliya', 'al', 'senior') THEN
      RAISE EXCEPTION 'Phase eligibility error: Only Thamheediyya and Aliya students can participate in General events (student phase: %).',
        v_student_phase
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_norm_target_phase IN ('special - foundation', 'special_foundation', 'foundation') THEN
    IF v_norm_stu_phase NOT IN ('foundation', 'fd', 'pre foundation', 'pre_foundation', 'pfd', 'pfd1', 'sub_junior', 'sub junior', 'sub-junior') THEN
      RAISE EXCEPTION 'Phase eligibility error: Only Foundation students can participate in % events (student phase: %).',
        v_target_phase, v_student_phase
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_norm_target_phase = 'thamheediyya' THEN
    IF v_norm_stu_phase NOT IN ('thamheediyya', 'thamheediya', 'thamheed', 'th', 'junior') THEN
      RAISE EXCEPTION 'Phase eligibility error: Only Thamheediyya students can participate in Thamheediyya events (student phase: %).',
        v_student_phase
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_norm_target_phase = 'aliya' THEN
    IF v_norm_stu_phase NOT IN ('aliya', 'al', 'senior') THEN
      RAISE EXCEPTION 'Phase eligibility error: Only Aliya students can participate in Aliya events (student phase: %).',
        v_student_phase
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_norm_target_phase = 'pg' THEN
    IF v_norm_stu_phase != 'pg' THEN
      RAISE EXCEPTION 'Phase eligibility error: Only PG students can participate in PG events (student phase: %).',
        v_student_phase
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Exempt Special / Category D / SE-numbered events from student max_participation quotas
  IF v_norm_target_phase LIKE 'special%'
     OR UPPER(TRIM(COALESCE(v_target_category, ''))) = 'D'
     OR UPPER(TRIM(COALESCE(v_target_item_code, ''))) ~ '^SE[0-9]+' THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(on_max, 99),
    COALESCE(off_max, 99),
    COALESCE(total_max, 99),
    COALESCE(group_max, 99)
  INTO v_on_max, v_off_max, v_total_max, v_group_max
  FROM public.max_participation
  WHERE (
    CASE
      WHEN LOWER(TRIM(phase)) IN ('foundation', 'fd', 'pre foundation', 'pre_foundation', 'pfd', 'pfd1', 'sub_junior', 'sub junior', 'sub-junior') THEN 'foundation'
      WHEN LOWER(TRIM(phase)) IN ('thamheediyya', 'thamheediya', 'thamheed', 'th', 'junior') THEN 'thamheediyya'
      WHEN LOWER(TRIM(phase)) IN ('aliya', 'al', 'senior') THEN 'aliya'
      ELSE LOWER(TRIM(phase))
    END
  ) = (
    CASE
      WHEN v_norm_stu_phase IN ('foundation', 'fd', 'pre foundation', 'pre_foundation', 'pfd', 'pfd1', 'sub_junior', 'sub junior', 'sub-junior') THEN 'foundation'
      WHEN v_norm_stu_phase IN ('thamheediyya', 'thamheediya', 'thamheed', 'th', 'junior') THEN 'thamheediyya'
      WHEN v_norm_stu_phase IN ('aliya', 'al', 'senior') THEN 'aliya'
      ELSE v_norm_stu_phase
    END
  )
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT
      COALESCE(on_max, 99),
      COALESCE(off_max, 99),
      COALESCE(total_max, 99),
      COALESCE(group_max, 99)
    INTO v_on_max, v_off_max, v_total_max, v_group_max
    FROM public.max_participation
    WHERE LOWER(phase) = 'general'
    LIMIT 1;
  END IF;

  IF v_total_max IS NULL THEN
    v_on_max := 3;
    v_off_max := 4;
    v_total_max := 5;
    v_group_max := 3;
  END IF;

  SELECT
    COUNT(DISTINCT r.item_id),
    COUNT(DISTINCT CASE WHEN i.mode::text = 'onstage' THEN r.item_id END),
    COUNT(DISTINCT CASE WHEN i.mode::text != 'onstage' THEN r.item_id END),
    COUNT(DISTINCT CASE WHEN i.point_type::text = 'group' THEN r.item_id END)
  INTO
    v_current_total,
    v_current_on,
    v_current_off,
    v_current_group
  FROM public.registrations r
  JOIN public.events i ON i.item_id = r.item_id
  WHERE (
    (v_assigned_chest IS NOT NULL AND TRIM(r.chest_no) = v_assigned_chest)
    OR (TRIM(r.chest_no) ~* '^(ST-|CH-)' AND regexp_replace(r.chest_no, '\D', '', 'g') = v_cic_no::text)
    OR TRIM(r.chest_no) = TRIM(NEW.chest_no)
  )
  AND (TG_OP = 'INSERT' OR r.id != NEW.id)
  AND r.item_id != NEW.item_id
  AND LOWER(TRIM(COALESCE(i.phase, ''))) NOT LIKE 'special%'
  AND UPPER(TRIM(COALESCE(i.category::text, ''))) <> 'D'
  AND UPPER(TRIM(COALESCE(i.item_code, ''))) !~ '^SE[0-9]+';

  IF (v_current_total + 1) > v_total_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed total events for phase % is % (currently registered for %).',
      v_student_phase, v_total_max, v_current_total
      USING ERRCODE = '23514';
  END IF;

  IF v_target_mode = 'onstage' AND (v_current_on + 1) > v_on_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed onstage events for phase % is % (currently registered for %).',
      v_student_phase, v_on_max, v_current_on
      USING ERRCODE = '23514';
  END IF;

  IF v_target_mode != 'onstage' AND (v_current_off + 1) > v_off_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed offstage events for phase % is % (currently registered for %).',
      v_student_phase, v_off_max, v_current_off
      USING ERRCODE = '23514';
  END IF;

  IF v_target_point_type = 'group' AND (v_current_group + 1) > v_group_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed group events for phase % is % (currently registered for %).',
      v_student_phase, v_group_max, v_current_group
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Ensure non-tabulation / Category D events never inflate championship points
CREATE OR REPLACE VIEW public.fest_leaderboard AS
WITH valid_results AS (
  SELECT
    r.id,
    COALESCE(r.college_affl_no, cl.college_affl_no, cn.college_affl_no, s_cn.college_affl_no, s_leg.college_affl_no) AS college_affl_no,
    CASE
      WHEN COALESCE(ev.tabulation, true)
       AND UPPER(TRIM(COALESCE(ev.category::text, 'A'))) <> 'D'
      THEN COALESCE(r.points, 0)
      ELSE 0
    END AS points,
    r.rank
  FROM public.results r
  LEFT JOIN public.events ev
    ON ev.item_id = r.item_id
  LEFT JOIN LATERAL (
    SELECT cl2.college_affl_no
    FROM public.code_letters cl2
    WHERE cl2.item_id = r.item_id
      AND cl2.code_letter = r.code_letter
    LIMIT 1
  ) cl ON true
  LEFT JOIN public.chest_no cn
    ON cn.chest_no = (
      CASE
        WHEN TRIM(COALESCE(r.chest_no, '')) ~ '^[1-9][0-9]*$' AND length(TRIM(r.chest_no)) <= 18
        THEN TRIM(r.chest_no)::BIGINT
        ELSE NULL
      END
    )
  LEFT JOIN public.students s_cn
    ON s_cn.cic_no = cn.cic_no
  LEFT JOIN LATERAL (
    SELECT s2.college_affl_no
    FROM public.students s2
    WHERE TRIM(COALESCE(r.chest_no, '')) ~* '^(ST-|CH-)\d+$'
      AND s2.cic_no::text = regexp_replace(r.chest_no, '\D', '', 'g')
    LIMIT 1
  ) s_leg ON s_cn.cic_no IS NULL
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

ALTER VIEW IF EXISTS public.fest_leaderboard SET (security_invoker = true);
GRANT SELECT ON public.fest_leaderboard TO anon, authenticated, service_role;

COMMIT;
