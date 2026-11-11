-- ==============================================================================
-- Migration: Single Unified Numeric Chest Number System (101+, Zero ST-00000)
-- Date: 2026-11-11
-- Purpose:
--   1. Create / harden public.chest_no with strict 1-to-1 uniqueness:
--        - UNIQUE (cic_no)   -> a student with N registrations can ONLY ever have 1 chest no
--        - UNIQUE (chest_no) -> no two students can ever share a chest no
--        - CHECK             -> strictly numeric integers >= 101 (101, 102, 103, ...)
--   2. Automatically allocate 101+ on registration and rewrite NEW.chest_no
--      directly to '101', '102', ... in BEFORE INSERT/UPDATE trigger so NO
--      ST-<cic> values are ever written into public.registrations again.
--   3. Backfill & migrate all existing ST-<cic> / CH-<cic> / UUID rows across
--      registrations, late_registrations, submission_entries, code_letters,
--      and results directly to their single 101+ numeric chest number.
--   4. Update register_college_for_item_tx, validate_submission_entry,
--      check_registration_quota, allocate_numeric_chest_numbers, and
--      verify_student_login to operate strictly on 101+ chest numbers.
-- ==============================================================================

BEGIN;

-- 1. Ensure public.chest_no table and columns exist cleanly (chest_no stored natively as BIGINT >= 101)
CREATE TABLE IF NOT EXISTS public.chest_no (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cic_no BIGINT NOT NULL,
  chest_no BIGINT NOT NULL,
  college_affl_no INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chest_no
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS cic_no BIGINT,
  ADD COLUMN IF NOT EXISTS chest_no BIGINT,
  ADD COLUMN IF NOT EXISTS college_affl_no INT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Clean any invalid / non-numeric / < 101 / duplicate pre-existing rows safely regardless of column type
DO $$
DECLARE
  v_col_type TEXT;
BEGIN
  DELETE FROM public.chest_no
  WHERE cic_no IS NULL
     OR chest_no IS NULL
     OR TRIM(chest_no::TEXT) !~ '^[1-9][0-9]*$'
     OR (
       CASE
         WHEN TRIM(chest_no::TEXT) ~ '^[1-9][0-9]*$' AND length(TRIM(chest_no::TEXT)) <= 18
         THEN TRIM(chest_no::TEXT)::BIGINT < 101
         ELSE true
       END
     );

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'chest_no'
    AND column_name = 'chest_no'
  LIMIT 1;

  IF v_col_type IS NOT NULL AND v_col_type NOT IN ('bigint', 'integer', 'smallint', 'numeric') THEN
    EXECUTE 'ALTER TABLE public.chest_no ALTER COLUMN chest_no TYPE BIGINT USING TRIM(chest_no::TEXT)::BIGINT';
  END IF;
END $$;

DELETE FROM public.chest_no a
USING public.chest_no b
WHERE a.ctid > b.ctid
  AND (a.cic_no = b.cic_no OR a.chest_no = b.chest_no);

ALTER TABLE public.chest_no DROP CONSTRAINT IF EXISTS chk_chest_no_numeric_101;
ALTER TABLE public.chest_no
  ADD CONSTRAINT chk_chest_no_numeric_101
  CHECK (chest_no >= 101);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chest_no_cic_no_unique
  ON public.chest_no (cic_no);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chest_no_chest_no_unique
  ON public.chest_no (chest_no);

CREATE INDEX IF NOT EXISTS idx_chest_no_college_affl_no
  ON public.chest_no (college_affl_no);

-- Drop any legacy FK constraints on event/result/appeal chest_no columns that still
-- reference public.students(chest_no), so both clean replays and live upgrades work safely
DO $$
DECLARE
  r_fk RECORD;
BEGIN
  FOR r_fk IN
    SELECT conrelid::regclass::TEXT AS tbl_name, conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'public.students'::regclass
      AND conrelid IN (
        'public.registrations'::regclass,
        'public.late_registrations'::regclass,
        'public.submission_entries'::regclass,
        'public.code_letters'::regclass,
        'public.results'::regclass,
        'public.appeals'::regclass,
        'public.registration_logs'::regclass
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r_fk.tbl_name, r_fk.conname);
  END LOOP;
END $$;

-- 2. RLS & Realtime on public.chest_no
ALTER TABLE public.chest_no ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chest_no_select_staff" ON public.chest_no;
DROP POLICY IF EXISTS "chest_no_select_public" ON public.chest_no;
DROP POLICY IF EXISTS "chest_no_select_scoped" ON public.chest_no;
DROP POLICY IF EXISTS "chest_no_admin_all" ON public.chest_no;

-- Matches students_select_scoped: prevent anonymous scraping of cic_no + college_affl_no
CREATE POLICY "chest_no_select_scoped"
  ON public.chest_no
  FOR SELECT
  TO authenticated
  USING (
    ((SELECT public.auth_user_role()) IN ('admin'::public.user_role, 'stage_controller'::public.user_role, 'convenor'::public.user_role, 'result_entry'::public.user_role))
    OR (college_affl_no = (SELECT public.auth_user_affl_no()))
  );

CREATE POLICY "chest_no_admin_all"
  ON public.chest_no
  FOR ALL
  TO authenticated
  USING (public.auth_user_role()::text = 'admin')
  WITH CHECK (public.auth_user_role()::text = 'admin');

REVOKE SELECT ON public.chest_no FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chest_no TO authenticated;

ALTER TABLE public.chest_no REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'chest_no'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chest_no;
  END IF;
END $$;

-- 3. Safely resolve any identifier ('101', '23993', UUID, or legacy 'ST-23993') -> cic_no
CREATE OR REPLACE FUNCTION public.resolve_student_cic_no(
  p_identifier TEXT,
  p_college_affl_no INT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw TEXT;
  v_upper TEXT;
  v_digits TEXT;
  v_cic_no BIGINT;
BEGIN
  v_raw := TRIM(COALESCE(p_identifier, ''));
  IF v_raw = '' THEN
    RETURN NULL;
  END IF;
  v_upper := UPPER(v_raw);

  -- a) Direct match against an assigned numeric chest_no ('101', '102', ...) using idx_chest_no_chest_no_unique
  IF v_raw ~ '^[1-9][0-9]*$' AND length(v_raw) <= 18 THEN
    SELECT cn.cic_no INTO v_cic_no
    FROM public.chest_no cn
    WHERE cn.chest_no = v_raw::BIGINT
    LIMIT 1;
  END IF;

  IF v_cic_no IS NOT NULL THEN
    RETURN v_cic_no;
  END IF;

  -- b) Match student record directly (using to_jsonb so optional columns never error)
  SELECT COALESCE(
    s.cic_no,
    CASE
      WHEN regexp_replace(COALESCE(to_jsonb(s)->>'admission_no', ''), '\D', '', 'g') ~ '^\d+$'
       AND length(regexp_replace(COALESCE(to_jsonb(s)->>'admission_no', ''), '\D', '', 'g')) <= 18
      THEN regexp_replace(COALESCE(to_jsonb(s)->>'admission_no', ''), '\D', '', 'g')::BIGINT
      ELSE NULL
    END
  )
  INTO v_cic_no
  FROM public.students s
  WHERE s.id::text = v_raw
     OR s.cic_no::text = v_raw
     OR UPPER(TRIM(COALESCE(to_jsonb(s)->>'chest_no', ''))) = v_upper
     OR UPPER(TRIM(COALESCE(to_jsonb(s)->>'admission_no', ''))) = v_upper
     OR 'ST-' || COALESCE(s.cic_no::text, to_jsonb(s)->>'admission_no', '') = v_upper
     OR 'CH-' || COALESCE(s.cic_no::text, to_jsonb(s)->>'admission_no', '') = v_upper
  ORDER BY
    CASE WHEN p_college_affl_no IS NOT NULL AND s.college_affl_no = p_college_affl_no THEN 0 ELSE 1 END,
    s.cic_no ASC NULLS LAST
  LIMIT 1;

  IF v_cic_no IS NOT NULL THEN
    RETURN v_cic_no;
  END IF;

  -- c) Numeric / legacy 'ST-12345' fallback
  v_digits := regexp_replace(v_raw, '\D', '', 'g');
  IF v_digits <> '' AND length(v_digits) <= 18 AND (v_upper ~ '^(ST-|CH-)\d+$' OR v_raw ~ '^\d+$') THEN
    RETURN v_digits::BIGINT;
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Atomic 1-to-1 allocator: assigns sequential integer >= 101 per distinct cic_no
CREATE OR REPLACE FUNCTION public.ensure_student_chest_no(
  p_cic_no BIGINT,
  p_college_affl_no INT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing TEXT;
  v_col INT;
  v_max_chest BIGINT;
  v_next_chest BIGINT;
BEGIN
  IF p_cic_no IS NULL OR p_cic_no <= 0 THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(74829101);

  SELECT chest_no::TEXT INTO v_existing
  FROM public.chest_no
  WHERE cic_no = p_cic_no
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    IF p_college_affl_no IS NOT NULL THEN
      UPDATE public.chest_no
      SET college_affl_no = COALESCE(college_affl_no, p_college_affl_no)
      WHERE cic_no = p_cic_no
        AND college_affl_no IS NULL;
    END IF;
    RETURN v_existing;
  END IF;

  v_col := p_college_affl_no;
  IF v_col IS NULL THEN
    SELECT s.college_affl_no INTO v_col
    FROM public.students s
    WHERE s.cic_no = p_cic_no
    LIMIT 1;
  END IF;

  SELECT COALESCE(MAX(chest_no::BIGINT), 100)
  INTO v_max_chest
  FROM public.chest_no
  WHERE chest_no::BIGINT >= 101;

  v_next_chest := GREATEST(v_max_chest + 1, 101);

  INSERT INTO public.chest_no (cic_no, chest_no, college_affl_no)
  VALUES (p_cic_no, v_next_chest, v_col)
  ON CONFLICT (cic_no) DO NOTHING;

  SELECT chest_no::TEXT INTO v_existing
  FROM public.chest_no
  WHERE cic_no = p_cic_no
  LIMIT 1;

  RETURN v_existing;
END;
$$;

-- 5. BEFORE INSERT/UPDATE Trigger on public.registrations:
--    Runs alphabetically AFTER trg_enforce_student_quota so failed quota
--    checks never burn a number, and directly rewrites NEW.chest_no -> '101+'.
CREATE OR REPLACE FUNCTION public.assign_chest_no_on_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cic_no BIGINT;
  v_assigned TEXT;
BEGIN
  IF current_setting('app.skip_chest_trigger', true) = 'on' THEN
    RETURN NEW;
  END IF;

  v_cic_no := public.resolve_student_cic_no(NEW.chest_no, NEW.college_affl_no);
  IF v_cic_no IS NOT NULL THEN
    v_assigned := public.ensure_student_chest_no(v_cic_no, NEW.college_affl_no);
    IF v_assigned IS NOT NULL THEN
      NEW.chest_no := v_assigned;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_chest_no_on_registration ON public.registrations;
DROP TRIGGER IF EXISTS trg_z_assign_chest_no_on_registration ON public.registrations;
CREATE TRIGGER trg_z_assign_chest_no_on_registration
  BEFORE INSERT OR UPDATE OF chest_no
  ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_chest_no_on_registration();

-- 5b. Deferred cleanup trigger on DELETE / replacement UPDATE:
--     Runs at transaction COMMIT so group edits never drop kept members' numbers.
--     If a student is unregistered or replaced and now has ZERO remaining
--     registrations, code letters, or results, releases their unused chest_no row.
CREATE OR REPLACE FUNCTION public.cleanup_unused_chest_no_on_reg_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_chest TEXT;
BEGIN
  IF current_setting('app.skip_chest_trigger', true) = 'on' THEN
    RETURN NULL;
  END IF;

  v_old_chest := TRIM(COALESCE(OLD.chest_no, ''));
  IF v_old_chest = '' OR v_old_chest !~ '^[1-9][0-9]*$' THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND TRIM(COALESCE(NEW.chest_no, '')) = v_old_chest THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE TRIM(r.chest_no) = v_old_chest
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.code_letters cl
    WHERE TRIM(cl.chest_no) = v_old_chest
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.results res
    WHERE res.chest_no IS NOT NULL AND TRIM(res.chest_no) = v_old_chest
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.appeals ap
    WHERE ap.chest_no IS NOT NULL AND TRIM(ap.chest_no) = v_old_chest
  ) THEN
    DELETE FROM public.chest_no
    WHERE chest_no = v_old_chest::BIGINT;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_unused_chest_no_on_reg_change ON public.registrations;
CREATE CONSTRAINT TRIGGER trg_cleanup_unused_chest_no_on_reg_change
  AFTER DELETE OR UPDATE OF chest_no
  ON public.registrations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_unused_chest_no_on_reg_change();

-- 6. Check registration quota & eligibility (supports '101+', cic_no, and legacy 'ST-')
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

  SELECT mode::text, point_type::text, item_id, phase
  INTO v_target_mode, v_target_point_type, v_target_item_id, v_target_phase
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

  IF v_norm_target_phase LIKE 'special%' THEN
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
  AND LOWER(TRIM(COALESCE(i.phase, ''))) NOT LIKE 'special%';

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

-- 6b. Update validate_submission_entry() BEFORE Section 7 backfill so submission_entries respects app.skip_chest_trigger
CREATE OR REPLACE FUNCTION public.validate_submission_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_event RECORD;
  v_settings RECORD;
  v_reg_chest TEXT;
  v_assigned_chest TEXT;
  v_reg_deadline TIMESTAMPTZ;
  v_fine_deadline TIMESTAMPTZ;
  v_clean_input TEXT;
  v_input_bigint BIGINT;
BEGIN
  IF current_setting('app.skip_chest_trigger', true) = 'on' THEN
    RETURN NEW;
  END IF;

  NEW.file_url := TRIM(COALESCE(NEW.file_url, ''));
  IF NEW.file_url = '' OR NEW.file_url !~* '^https?://\S+$' THEN
    RAISE EXCEPTION 'Submission link must be a valid http:// or https:// URL.'
      USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE item_id = NEW.item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event with ID % does not exist.', NEW.item_id
      USING ERRCODE = '23503';
  END IF;

  IF NOT (
    COALESCE(v_event.is_submission, false)
    OR COALESCE(v_event.is_screening, false)
    OR v_event.mode::text = 'submission'
  ) THEN
    RAISE EXCEPTION 'Event % does not accept pre-fest submission links.', COALESCE(v_event.item_code, NEW.item_id::text)
      USING ERRCODE = '23514';
  END IF;

  v_clean_input := UPPER(TRIM(COALESCE(NEW.chest_no, '')));
  IF v_clean_input = '' THEN
    RAISE EXCEPTION 'Participant chest number is required for submission links.'
      USING ERRCODE = '23514';
  END IF;
  v_input_bigint := CASE
    WHEN v_clean_input ~ '^[1-9][0-9]*$' AND length(v_clean_input) <= 18 THEN v_clean_input::BIGINT
    ELSE NULL
  END;

  SELECT
    r.chest_no,
    cn.chest_no::TEXT
  INTO v_reg_chest, v_assigned_chest
  FROM public.registrations r
  LEFT JOIN public.chest_no cn
    ON cn.chest_no = (
      CASE
        WHEN TRIM(r.chest_no) ~ '^[1-9][0-9]*$' AND length(TRIM(r.chest_no)) <= 18
        THEN TRIM(r.chest_no)::BIGINT
        ELSE NULL
      END
    )
    OR cn.cic_no = public.resolve_student_cic_no(r.chest_no, r.college_affl_no)
  LEFT JOIN public.students s
    ON s.cic_no = cn.cic_no
  WHERE r.item_id = NEW.item_id
    AND r.college_affl_no = NEW.college_affl_no
    AND (
      UPPER(TRIM(r.chest_no)) = v_clean_input
      OR (v_input_bigint IS NOT NULL AND cn.chest_no = v_input_bigint)
      OR COALESCE(s.cic_no::text, '') = TRIM(COALESCE(NEW.chest_no, ''))
      OR 'ST-' || COALESCE(s.cic_no::text, '') = v_clean_input
      OR COALESCE(s.id::text, '') = TRIM(COALESCE(NEW.chest_no, ''))
    )
  LIMIT 1;

  IF v_reg_chest IS NULL THEN
    RAISE EXCEPTION 'Participant % is not actively registered for event %.', NEW.chest_no, COALESCE(v_event.item_code, NEW.item_id::text)
      USING ERRCODE = '23514';
  END IF;

  NEW.chest_no := COALESCE(NULLIF(TRIM(v_assigned_chest), ''), TRIM(v_reg_chest));

  NEW.submitted_at := now();
  BEGIN
    v_role := (SELECT public.auth_user_role());
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  IF v_role IS NULL OR v_role NOT IN ('admin'::user_role, 'convenor'::user_role) OR NEW.status IS NULL THEN
    SELECT * INTO v_settings FROM public.fest_settings LIMIT 1;
    v_reg_deadline := COALESCE(v_event.reg_deadline, v_settings.reg_deadline);
    v_fine_deadline := COALESCE(v_event.fine_deadline, v_settings.fine_deadline);

    IF v_fine_deadline IS NOT NULL AND now() > v_fine_deadline THEN
      NEW.status := 'late'::public.submission_status;
    ELSIF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline THEN
      NEW.status := 'fine'::public.submission_status;
    ELSE
      NEW.status := 'on_time'::public.submission_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 6c. Drop any broken legacy remote triggers referencing missing students.chest_no (e.g. s.chest_no)
DO $$
DECLARE
  r_trg RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'chest_no'
  ) THEN
    FOR r_trg IN
      SELECT DISTINCT
        c.relname AS tbl_name,
        t.tgname AS trg_name,
        p.proname AS fn_name
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
        AND p.proname NOT IN (
          'check_registration_quota',
          'assign_chest_no_on_registration',
          'cleanup_unused_chest_no_on_reg_change',
          'validate_submission_entry',
          'cleanup_group_submission_entries',
          'log_system_event_trigger',
          'restrict_profile_updates'
        )
        AND (
          p.prosrc ~* '(\ms\s*\.\s*chest_no\M|\mstudents\s*\.\s*chest_no\M)'
          OR EXISTS (
            SELECT 1
            FROM pg_proc hp
            JOIN pg_namespace hn ON hn.oid = hp.pronamespace
            WHERE hn.nspname = 'public'
              AND hp.prosrc ~* '(\ms\s*\.\s*chest_no\M|\mstudents\s*\.\s*chest_no\M)'
              AND strpos(lower(p.prosrc), lower(hp.proname)) > 0
          )
        )
    LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r_trg.trg_name, r_trg.tbl_name);
      RAISE NOTICE 'Dropped broken legacy trigger %.% calling %() referencing missing students.chest_no', r_trg.tbl_name, r_trg.trg_name, r_trg.fn_name;
    END LOOP;
  END IF;
END $$;

-- 7. Backfill public.chest_no AND replace all existing ST-xxxxx / CH-xxxxx / UUID values across ALL tables
DO $$
DECLARE
  r_stu RECORD;
  v_step TEXT := 'init';
  v_err_ctx TEXT := '';
BEGIN
  PERFORM set_config('app.skip_chest_trigger', 'on', true);

  -- a) Ensure every existing registered student across registrations / submissions / code_letters / results / appeals has a 101+ chest_no
  v_step := '7a: allocate chest_no';
  FOR r_stu IN
    WITH all_refs AS (
      SELECT public.resolve_student_cic_no(chest_no, college_affl_no) AS cic_no, college_affl_no FROM public.registrations
      UNION
      SELECT public.resolve_student_cic_no(chest_no, college_affl_no) AS cic_no, college_affl_no FROM public.late_registrations
      UNION
      SELECT public.resolve_student_cic_no(chest_no, college_affl_no) AS cic_no, college_affl_no FROM public.submission_entries
      UNION
      SELECT public.resolve_student_cic_no(chest_no, college_affl_no) AS cic_no, college_affl_no FROM public.code_letters
      UNION
      SELECT public.resolve_student_cic_no(chest_no, college_affl_no) AS cic_no, college_affl_no FROM public.results
      UNION
      SELECT public.resolve_student_cic_no(chest_no, college_affl_no) AS cic_no, college_affl_no FROM public.appeals
    ),
    distinct_cics AS (
      SELECT DISTINCT cic_no, MIN(college_affl_no) AS ref_college
      FROM all_refs
      WHERE cic_no IS NOT NULL
      GROUP BY cic_no
    )
    SELECT
      d.cic_no,
      COALESCE(s.college_affl_no, d.ref_college) AS college_affl_no
    FROM distinct_cics d
    LEFT JOIN public.students s ON s.cic_no = d.cic_no
    LEFT JOIN public.chest_no cn ON cn.cic_no = d.cic_no
    WHERE cn.cic_no IS NULL
    ORDER BY
      COALESCE(s.college_affl_no, d.ref_college) ASC NULLS LAST,
      s.phase ASC NULLS LAST,
      s.name ASC NULLS LAST,
      d.cic_no ASC
  LOOP
    PERFORM public.ensure_student_chest_no(r_stu.cic_no, r_stu.college_affl_no);
  END LOOP;

  -- b) Replace old ST-00000 / CH-00000 / UUID / raw cic values across all tables with '101+'
  v_step := '7b.1: registrations';
  DELETE FROM public.registrations r
  USING public.chest_no cn
  WHERE public.resolve_student_cic_no(r.chest_no, r.college_affl_no) = cn.cic_no
    AND TRIM(r.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
    AND EXISTS (
      SELECT 1 FROM public.registrations r2
      WHERE r2.item_id = r.item_id
        AND TRIM(r2.chest_no) = cn.chest_no::TEXT
    );

  UPDATE public.registrations r
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE public.resolve_student_cic_no(r.chest_no, r.college_affl_no) = cn.cic_no
    AND TRIM(r.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  v_step := '7b.2: late_registrations';
  DELETE FROM public.late_registrations lr
  USING public.chest_no cn
  WHERE public.resolve_student_cic_no(lr.chest_no, lr.college_affl_no) = cn.cic_no
    AND TRIM(lr.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
    AND EXISTS (
      SELECT 1 FROM public.late_registrations lr2
      WHERE lr2.item_id = lr.item_id
        AND TRIM(lr2.chest_no) = cn.chest_no::TEXT
    );

  UPDATE public.late_registrations lr
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE public.resolve_student_cic_no(lr.chest_no, lr.college_affl_no) = cn.cic_no
    AND TRIM(lr.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  v_step := '7b.3: submission_entries';
  DELETE FROM public.submission_entries se
  USING public.chest_no cn
  WHERE public.resolve_student_cic_no(se.chest_no, se.college_affl_no) = cn.cic_no
    AND TRIM(se.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
    AND EXISTS (
      SELECT 1 FROM public.submission_entries se2
      WHERE se2.item_id = se.item_id
        AND TRIM(se2.chest_no) = cn.chest_no::TEXT
    );

  UPDATE public.submission_entries se
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE public.resolve_student_cic_no(se.chest_no, se.college_affl_no) = cn.cic_no
    AND TRIM(se.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  v_step := '7b.4: code_letters';
  DELETE FROM public.code_letters cl
  USING public.chest_no cn
  WHERE public.resolve_student_cic_no(cl.chest_no, cl.college_affl_no) = cn.cic_no
    AND TRIM(cl.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
    AND EXISTS (
      SELECT 1 FROM public.code_letters cl2
      WHERE cl2.item_id = cl.item_id
        AND TRIM(cl2.chest_no) = cn.chest_no::TEXT
    );

  UPDATE public.code_letters cl
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE public.resolve_student_cic_no(cl.chest_no, cl.college_affl_no) = cn.cic_no
    AND TRIM(cl.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  v_step := '7b.5: results';
  UPDATE public.results res
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE res.chest_no IS NOT NULL
    AND public.resolve_student_cic_no(res.chest_no, res.college_affl_no) = cn.cic_no
    AND TRIM(res.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  v_step := '7b.6: appeals';
  UPDATE public.appeals ap
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE ap.chest_no IS NOT NULL
    AND public.resolve_student_cic_no(ap.chest_no, ap.college_affl_no) = cn.cic_no
    AND TRIM(ap.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_err_ctx = PG_EXCEPTION_CONTEXT;
  RAISE EXCEPTION 'Backfill failed at [%]: % (SQLSTATE %, Context: %)', v_step, SQLERRM, SQLSTATE, v_err_ctx;
END $$;

-- 8. Admin RPC: batch allocate missing or cleanly renumber all registered students from 101 across ALL tables
CREATE OR REPLACE FUNCTION public.allocate_numeric_chest_numbers(
  p_only_registered BOOLEAN DEFAULT true,
  p_reset BOOLEAN DEFAULT false
)
RETURNS TABLE (
  total_assigned BIGINT,
  newly_assigned BIGINT,
  min_chest_no BIGINT,
  max_chest_no BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before_count BIGINT := 0;
  v_after_count BIGINT := 0;
  v_min BIGINT;
  v_max BIGINT;
  r_target RECORD;
BEGIN
  IF public.auth_user_role()::text <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can allocate or renumber chest numbers.'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(74829101);
  PERFORM set_config('app.skip_chest_trigger', 'on', true);

  IF COALESCE(p_reset, false) THEN
    -- Snapshot old chest_no -> cic_no before wiping so existing registrations/results remap accurately
    CREATE TEMP TABLE tmp_old_chest_map ON COMMIT DROP AS
    SELECT
      old_cn.chest_no::TEXT AS old_chest_no,
      old_cn.cic_no,
      old_cn.college_affl_no
    FROM public.chest_no old_cn;

    DELETE FROM public.chest_no;
  END IF;

  SELECT COUNT(*) INTO v_before_count FROM public.chest_no;

  IF COALESCE(p_only_registered, true) THEN
    FOR r_target IN
      WITH reg_students AS (
        SELECT DISTINCT
          COALESCE(
            CASE WHEN COALESCE(p_reset, false) THEN (
              SELECT om.cic_no FROM tmp_old_chest_map om WHERE om.old_chest_no = TRIM(reg.chest_no) LIMIT 1
            ) END,
            public.resolve_student_cic_no(reg.chest_no, reg.college_affl_no)
          ) AS cic_no,
          reg.college_affl_no AS reg_college
        FROM public.registrations reg
      )
      SELECT
        rs.cic_no,
        COALESCE(s.college_affl_no, rs.reg_college) AS college_affl_no
      FROM reg_students rs
      LEFT JOIN public.students s ON s.cic_no = rs.cic_no
      LEFT JOIN public.chest_no cn ON cn.cic_no = rs.cic_no
      WHERE rs.cic_no IS NOT NULL
        AND cn.cic_no IS NULL
      ORDER BY
        COALESCE(s.college_affl_no, rs.reg_college) ASC NULLS LAST,
        s.phase ASC NULLS LAST,
        s.name ASC NULLS LAST,
        rs.cic_no ASC
    LOOP
      PERFORM public.ensure_student_chest_no(r_target.cic_no, r_target.college_affl_no);
    END LOOP;
  ELSE
    FOR r_target IN
      SELECT s.cic_no, s.college_affl_no
      FROM public.students s
      LEFT JOIN public.chest_no cn ON cn.cic_no = s.cic_no
      WHERE s.cic_no IS NOT NULL
        AND cn.cic_no IS NULL
      ORDER BY
        s.college_affl_no ASC NULLS LAST,
        s.phase ASC NULLS LAST,
        s.name ASC NULLS LAST,
        s.cic_no ASC
    LOOP
      PERFORM public.ensure_student_chest_no(r_target.cic_no, r_target.college_affl_no);
    END LOOP;
  END IF;

  -- Cascade new 101+ chest numbers across all tables (two-phase __SWAP__ avoids unique index collisions when numbers swap)
  IF COALESCE(p_reset, false) THEN
    UPDATE public.registrations r
    SET chest_no = '__SWAP__' || TRIM(r.chest_no)
    FROM tmp_old_chest_map om
    WHERE TRIM(r.chest_no) = om.old_chest_no;

    UPDATE public.registrations r
    SET chest_no = new_cn.chest_no::TEXT
    FROM tmp_old_chest_map om
    JOIN public.chest_no new_cn ON new_cn.cic_no = om.cic_no
    WHERE r.chest_no = '__SWAP__' || om.old_chest_no;

    UPDATE public.late_registrations lr
    SET chest_no = '__SWAP__' || TRIM(lr.chest_no)
    FROM tmp_old_chest_map om
    WHERE TRIM(lr.chest_no) = om.old_chest_no;

    UPDATE public.late_registrations lr
    SET chest_no = new_cn.chest_no::TEXT
    FROM tmp_old_chest_map om
    JOIN public.chest_no new_cn ON new_cn.cic_no = om.cic_no
    WHERE lr.chest_no = '__SWAP__' || om.old_chest_no;

    UPDATE public.submission_entries se
    SET chest_no = '__SWAP__' || TRIM(se.chest_no)
    FROM tmp_old_chest_map om
    WHERE TRIM(se.chest_no) = om.old_chest_no;

    UPDATE public.submission_entries se
    SET chest_no = new_cn.chest_no::TEXT
    FROM tmp_old_chest_map om
    JOIN public.chest_no new_cn ON new_cn.cic_no = om.cic_no
    WHERE se.chest_no = '__SWAP__' || om.old_chest_no;

    UPDATE public.code_letters cl
    SET chest_no = '__SWAP__' || TRIM(cl.chest_no)
    FROM tmp_old_chest_map om
    WHERE TRIM(cl.chest_no) = om.old_chest_no;

    UPDATE public.code_letters cl
    SET chest_no = new_cn.chest_no::TEXT
    FROM tmp_old_chest_map om
    JOIN public.chest_no new_cn ON new_cn.cic_no = om.cic_no
    WHERE cl.chest_no = '__SWAP__' || om.old_chest_no;

    UPDATE public.results res
    SET chest_no = '__SWAP__' || TRIM(res.chest_no)
    FROM tmp_old_chest_map om
    WHERE res.chest_no IS NOT NULL
      AND TRIM(res.chest_no) = om.old_chest_no;

    UPDATE public.results res
    SET chest_no = new_cn.chest_no::TEXT
    FROM tmp_old_chest_map om
    JOIN public.chest_no new_cn ON new_cn.cic_no = om.cic_no
    WHERE res.chest_no = '__SWAP__' || om.old_chest_no;

    UPDATE public.appeals ap
    SET chest_no = '__SWAP__' || TRIM(ap.chest_no)
    FROM tmp_old_chest_map om
    WHERE ap.chest_no IS NOT NULL
      AND TRIM(ap.chest_no) = om.old_chest_no;

    UPDATE public.appeals ap
    SET chest_no = new_cn.chest_no::TEXT
    FROM tmp_old_chest_map om
    JOIN public.chest_no new_cn ON new_cn.cic_no = om.cic_no
    WHERE ap.chest_no = '__SWAP__' || om.old_chest_no;
  END IF;

  -- Also normalize any remaining ST-/UUID values directly to their 101+ chest_no (dedupe first to prevent 23505)
  DELETE FROM public.registrations r
  USING public.chest_no cn
  WHERE public.resolve_student_cic_no(r.chest_no, r.college_affl_no) = cn.cic_no
    AND TRIM(r.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
    AND EXISTS (
      SELECT 1 FROM public.registrations r2
      WHERE r2.item_id = r.item_id
        AND TRIM(r2.chest_no) = cn.chest_no::TEXT
    );

  UPDATE public.registrations r
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE public.resolve_student_cic_no(r.chest_no, r.college_affl_no) = cn.cic_no
    AND TRIM(r.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  DELETE FROM public.late_registrations lr
  USING public.chest_no cn
  WHERE public.resolve_student_cic_no(lr.chest_no, lr.college_affl_no) = cn.cic_no
    AND TRIM(lr.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
    AND EXISTS (
      SELECT 1 FROM public.late_registrations lr2
      WHERE lr2.item_id = lr.item_id
        AND TRIM(lr2.chest_no) = cn.chest_no::TEXT
    );

  UPDATE public.late_registrations lr
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE public.resolve_student_cic_no(lr.chest_no, lr.college_affl_no) = cn.cic_no
    AND TRIM(lr.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  DELETE FROM public.submission_entries se
  USING public.chest_no cn
  WHERE public.resolve_student_cic_no(se.chest_no, se.college_affl_no) = cn.cic_no
    AND TRIM(se.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
    AND EXISTS (
      SELECT 1 FROM public.submission_entries se2
      WHERE se2.item_id = se.item_id
        AND TRIM(se2.chest_no) = cn.chest_no::TEXT
    );

  UPDATE public.submission_entries se
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE public.resolve_student_cic_no(se.chest_no, se.college_affl_no) = cn.cic_no
    AND TRIM(se.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  DELETE FROM public.code_letters cl
  USING public.chest_no cn
  WHERE public.resolve_student_cic_no(cl.chest_no, cl.college_affl_no) = cn.cic_no
    AND TRIM(cl.chest_no) IS DISTINCT FROM cn.chest_no::TEXT
    AND EXISTS (
      SELECT 1 FROM public.code_letters cl2
      WHERE cl2.item_id = cl.item_id
        AND TRIM(cl2.chest_no) = cn.chest_no::TEXT
    );

  UPDATE public.code_letters cl
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE public.resolve_student_cic_no(cl.chest_no, cl.college_affl_no) = cn.cic_no
    AND TRIM(cl.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  UPDATE public.results res
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE res.chest_no IS NOT NULL
    AND public.resolve_student_cic_no(res.chest_no, res.college_affl_no) = cn.cic_no
    AND TRIM(res.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  UPDATE public.appeals ap
  SET chest_no = cn.chest_no::TEXT
  FROM public.chest_no cn
  WHERE ap.chest_no IS NOT NULL
    AND public.resolve_student_cic_no(ap.chest_no, ap.college_affl_no) = cn.cic_no
    AND TRIM(ap.chest_no) IS DISTINCT FROM cn.chest_no::TEXT;

  SELECT
    COUNT(*),
    MIN(chest_no),
    MAX(chest_no)
  INTO v_after_count, v_min, v_max
  FROM public.chest_no
  WHERE chest_no >= 101;

  RETURN QUERY
  SELECT
    v_after_count,
    GREATEST(v_after_count - v_before_count, 0),
    v_min,
    v_max;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_student_cic_no(TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_student_chest_no(BIGINT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.allocate_numeric_chest_numbers(BOOLEAN, BOOLEAN) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.allocate_numeric_chest_numbers(BOOLEAN, BOOLEAN) TO authenticated;

-- 9. Update register_college_for_item_tx to write ONLY numeric 101+ chest_no across all tables
CREATE OR REPLACE FUNCTION public.register_college_for_item_tx(
  p_item_id INT,
  p_college_affl_no INT,
  p_chest_nos TEXT[]
)
RETURNS SETOF public.registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_affl INT;
  v_item RECORD;
  v_college RECORD;
  v_settings RECORD;
  v_reg_deadline TIMESTAMPTZ;
  v_fine_deadline TIMESTAMPTZ;
  v_has_override BOOLEAN := false;
  v_entry_lock_open BOOLEAN;
  v_is_late BOOLEAN := false;
  v_late_reason TEXT := 'Late Registration';
  v_first_group_chest TEXT;
  v_normalized_chests TEXT[] := ARRAY[]::TEXT[];
  v_raw_id TEXT;
  v_raw_trimmed TEXT;
  v_raw_bigint BIGINT;
  v_cic BIGINT;
  v_assigned TEXT;
BEGIN
  v_role := (SELECT public.auth_user_role());
  v_affl := (SELECT public.auth_user_affl_no());

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_item FROM public.events WHERE item_id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event with ID % does not exist', p_item_id;
  END IF;

  SELECT * INTO v_college FROM public.colleges WHERE affl_no = p_college_affl_no;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'College with Affiliation No % does not exist', p_college_affl_no;
  END IF;

  SELECT * INTO v_settings FROM public.fest_settings LIMIT 1;
  v_has_override := COALESCE(v_college.manual_lock_override, false);

  v_reg_deadline := COALESCE(v_item.reg_deadline, v_settings.reg_deadline);
  v_fine_deadline := COALESCE(v_item.fine_deadline, v_settings.fine_deadline);

  IF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline THEN
    v_is_late := true;
    IF v_fine_deadline IS NOT NULL AND now() > v_fine_deadline THEN
      v_late_reason := 'Registered Past Final Deadline (Admin Override)';
    ELSE
      v_late_reason := 'Registered In Late Fine Window';
    END IF;
  END IF;

  IF v_role = 'admin'::user_role THEN
    -- Admin authorized for all colleges and bypasses lock checks
  ELSIF v_role = 'college'::user_role AND v_affl = p_college_affl_no THEN
    IF NOT v_has_override THEN
      IF COALESCE(v_item.is_locked, false) THEN
        RAISE EXCEPTION 'Registration closed: Event % is locked by fest administration', COALESCE(v_item.item_code, p_item_id::text);
      END IF;

      SELECT is_open INTO v_entry_lock_open
      FROM public.entry_locks
      WHERE item_id = p_item_id AND college_affl_no = p_college_affl_no;

      IF v_entry_lock_open IS NOT NULL AND NOT v_entry_lock_open THEN
        RAISE EXCEPTION 'Registration closed: Registration for event % is locked for your institution', COALESCE(v_item.item_code, p_item_id::text);
      END IF;

      IF v_fine_deadline IS NOT NULL AND now() > v_fine_deadline THEN
        RAISE EXCEPTION 'Registration deadline has passed for event %', COALESCE(v_item.item_code, p_item_id::text);
      END IF;
    END IF;

    IF v_reg_deadline IS NOT NULL AND now() > v_reg_deadline AND array_length(p_chest_nos, 1) > 0 THEN
      UPDATE public.colleges
      SET fine_status = true
      WHERE affl_no = p_college_affl_no;
    END IF;
  ELSE
    RAISE EXCEPTION 'Access denied: not authorized for college %', p_college_affl_no;
  END IF;

  -- Validate every participant belongs to this college & allocate/resolve 101+ chest number
  IF COALESCE(array_length(p_chest_nos, 1), 0) > 0 THEN
    FOREACH v_raw_id IN ARRAY p_chest_nos
    LOOP
      v_raw_trimmed := TRIM(COALESCE(v_raw_id, ''));
      v_raw_bigint := CASE
        WHEN v_raw_trimmed ~ '^[1-9][0-9]*$' AND length(v_raw_trimmed) <= 18 THEN v_raw_trimmed::BIGINT
        ELSE NULL
      END;

      SELECT s.cic_no INTO v_cic
      FROM public.students s
      LEFT JOIN public.chest_no cn ON cn.cic_no = s.cic_no
      WHERE s.college_affl_no = p_college_affl_no
        AND (
          (v_raw_bigint IS NOT NULL AND cn.chest_no = v_raw_bigint)
          OR s.cic_no::text = v_raw_trimmed
          OR 'ST-' || s.cic_no::text = UPPER(v_raw_trimmed)
          OR s.id::text = v_raw_trimmed
        )
      ORDER BY
        CASE
          WHEN v_raw_bigint IS NOT NULL AND cn.chest_no = v_raw_bigint THEN 0
          ELSE 1
        END,
        s.cic_no ASC
      LIMIT 1;

      IF v_cic IS NULL THEN
        RAISE EXCEPTION 'All participants must belong to college affiliation %', p_college_affl_no;
      END IF;

      v_assigned := public.ensure_student_chest_no(v_cic, p_college_affl_no);
      IF v_assigned IS NOT NULL AND NOT (v_assigned = ANY(v_normalized_chests)) THEN
        v_normalized_chests := array_append(v_normalized_chests, v_assigned);
      END IF;
    END LOOP;
  END IF;

  -- Replace existing registrations for this college & event atomically
  DELETE FROM public.registrations
  WHERE item_id = p_item_id
    AND college_affl_no = p_college_affl_no;

  DELETE FROM public.late_registrations
  WHERE item_id = p_item_id
    AND college_affl_no = p_college_affl_no;

  IF COALESCE(array_length(v_normalized_chests, 1), 0) = 0 THEN
    DELETE FROM public.submission_entries
    WHERE item_id = p_item_id
      AND college_affl_no = p_college_affl_no;
    RETURN;
  END IF;

  IF v_is_late THEN
    INSERT INTO public.late_registrations (
      item_id,
      college_affl_no,
      chest_no,
      late_reason,
      effective_deadline,
      registered_at
    )
    SELECT
      p_item_id,
      p_college_affl_no,
      c.chest_no,
      v_late_reason,
      v_reg_deadline,
      now()
    FROM unnest(v_normalized_chests) AS c(chest_no)
    ON CONFLICT (item_id, chest_no) DO UPDATE
    SET
      late_reason = EXCLUDED.late_reason,
      effective_deadline = EXCLUDED.effective_deadline,
      registered_at = EXCLUDED.registered_at;
  END IF;

  RETURN QUERY
  INSERT INTO public.registrations (item_id, college_affl_no, chest_no)
  SELECT p_item_id, p_college_affl_no, c.chest_no
  FROM unnest(v_normalized_chests) AS c(chest_no)
  RETURNING *;

  -- Synchronize submission_entries using only 101+ chest numbers
  IF COALESCE(v_item.point_type::text, 'individual') = 'group' THEN
    v_first_group_chest := v_normalized_chests[1];
    IF v_first_group_chest IS NOT NULL THEN
      UPDATE public.submission_entries se
      SET chest_no = v_first_group_chest
      WHERE se.item_id = p_item_id
        AND se.college_affl_no = p_college_affl_no
        AND TRIM(se.chest_no) <> ALL(v_normalized_chests)
        AND NOT EXISTS (
          SELECT 1 FROM public.submission_entries other
          WHERE other.item_id = p_item_id AND other.chest_no = v_first_group_chest
        );
    END IF;
  ELSE
    DELETE FROM public.submission_entries se
    WHERE se.item_id = p_item_id
      AND se.college_affl_no = p_college_affl_no
      AND TRIM(se.chest_no) <> ALL(v_normalized_chests);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_college_for_item_tx(INT, INT, TEXT[]) TO authenticated;

-- 10. validate_submission_entry() updated in Section 6b above (before Section 7 backfill)

-- 11. Update verify_student_login: authenticate strictly by cic_no, return assigned chest_no (NULL if unassigned)
DROP FUNCTION IF EXISTS public.verify_student_login(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.verify_student_login(
  p_identifier TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  cic_no BIGINT,
  college_affl_no INT,
  college_name TEXT,
  college_short_name TEXT,
  class TEXT,
  phase TEXT,
  chest_no TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
  v_digits TEXT;
  v_pass TEXT;
  v_stu RECORD;
  v_expected_pass TEXT;
BEGIN
  v_clean := REGEXP_REPLACE(TRIM(COALESCE(p_identifier, '')), '^(ST-|CH-)', '', 'i');
  v_digits := REGEXP_REPLACE(v_clean, '\D', '', 'g');
  v_pass := TRIM(COALESCE(p_password, ''));

  IF v_digits = '' OR v_pass = '' THEN
    RETURN;
  END IF;

  SELECT
    s.id,
    s.name,
    s.cic_no,
    s.college_affl_no,
    s.class,
    s.phase,
    cn.chest_no::TEXT AS resolved_chest_no,
    NULLIF(TRIM(to_jsonb(s)->>'password'), '') AS stored_password,
    c.name AS college_name,
    c.short_name AS college_short_name
  INTO v_stu
  FROM public.students s
  LEFT JOIN public.chest_no cn ON cn.cic_no = s.cic_no
  LEFT JOIN public.colleges c ON c.affl_no = s.college_affl_no
  WHERE s.cic_no::TEXT = v_digits
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_expected_pass := COALESCE(
    v_stu.stored_password,
    v_stu.cic_no::TEXT || '@' || COALESCE(v_stu.college_affl_no::TEXT, '')
  );

  IF v_pass <> v_expected_pass THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_stu.id,
    v_stu.name,
    v_stu.cic_no,
    v_stu.college_affl_no,
    COALESCE(v_stu.college_name, ''),
    COALESCE(v_stu.college_short_name, ''),
    v_stu.class,
    v_stu.phase,
    v_stu.resolved_chest_no;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_student_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_student_login(TEXT, TEXT) TO anon, authenticated;

-- 12. Update review_replacement_tx so approved replacements allocate/reuse
--     strictly 101+ chest numbers cleanly and sync related event tables
CREATE OR REPLACE FUNCTION public.review_replacement_tx(
  p_replacement_id UUID,
  p_status TEXT,
  p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_rep RECORD;
  v_reg RECORD;
  v_event RECORD;
  v_orig_stu RECORD;
  v_new_stu RECORD;
  v_old_chest_no TEXT;
  v_new_chest_no TEXT;
  v_rows_affected INT;
BEGIN
  v_role := (SELECT public.auth_user_role());
  IF v_role IS NULL OR v_role != 'admin'::user_role THEN
    RAISE EXCEPTION 'Access denied: executive admin privileges required';
  END IF;

  SELECT * INTO v_rep
  FROM public.replacements
  WHERE id = p_replacement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Replacement request % not found', p_replacement_id;
  END IF;

  IF p_status = 'Approved' THEN
    SELECT * INTO v_reg
    FROM public.registrations
    WHERE id = v_rep.registration_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Target registration % does not exist', v_rep.registration_id;
    END IF;

    v_old_chest_no := TRIM(COALESCE(v_reg.chest_no, ''));

    SELECT * INTO v_orig_stu
    FROM public.students
    WHERE id = v_rep.original_student_id AND college_affl_no = v_reg.college_affl_no;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Original student does not belong to college %', v_reg.college_affl_no;
    END IF;

    SELECT * INTO v_new_stu
    FROM public.students
    WHERE id = v_rep.replacement_student_id AND college_affl_no = v_reg.college_affl_no;

    IF NOT FOUND OR v_new_stu.cic_no IS NULL THEN
      RAISE EXCEPTION 'Replacement student does not belong to college % or is missing CIC number', v_reg.college_affl_no;
    END IF;

    -- Updating with replacement cic_no lets trg_enforce_student_quota validate
    -- FIRST, then trg_z_assign_chest_no_on_registration assigns/reuses 101+
    UPDATE public.registrations
    SET chest_no = v_new_stu.cic_no::text
    WHERE id = v_reg.id
    RETURNING chest_no INTO v_new_chest_no;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected != 1 THEN
      RAISE EXCEPTION 'Registration roster update failed (expected 1 row, affected %)', v_rows_affected;
    END IF;

    IF v_old_chest_no <> '' AND v_new_chest_no IS NOT NULL AND v_old_chest_no IS DISTINCT FROM v_new_chest_no THEN
      UPDATE public.late_registrations
      SET chest_no = v_new_chest_no
      WHERE item_id = v_reg.item_id
        AND college_affl_no = v_reg.college_affl_no
        AND TRIM(chest_no) = v_old_chest_no
        AND NOT EXISTS (
          SELECT 1 FROM public.late_registrations other
          WHERE other.item_id = v_reg.item_id AND TRIM(other.chest_no) = v_new_chest_no
        );

      UPDATE public.code_letters
      SET chest_no = v_new_chest_no
      WHERE item_id = v_reg.item_id
        AND college_affl_no = v_reg.college_affl_no
        AND TRIM(chest_no) = v_old_chest_no;

      SELECT * INTO v_event FROM public.events WHERE item_id = v_reg.item_id;
      IF COALESCE(v_event.point_type::text, 'individual') = 'group' THEN
        PERFORM set_config('app.skip_chest_trigger', 'on', true);
        UPDATE public.submission_entries
        SET chest_no = v_new_chest_no
        WHERE item_id = v_reg.item_id
          AND college_affl_no = v_reg.college_affl_no
          AND TRIM(chest_no) = v_old_chest_no
          AND NOT EXISTS (
            SELECT 1 FROM public.submission_entries other
            WHERE other.item_id = v_reg.item_id AND TRIM(other.chest_no) = v_new_chest_no
          );
        PERFORM set_config('app.skip_chest_trigger', 'off', true);
      ELSE
        DELETE FROM public.submission_entries
        WHERE item_id = v_reg.item_id
          AND college_affl_no = v_reg.college_affl_no
          AND TRIM(chest_no) = v_old_chest_no;
      END IF;
    END IF;
  END IF;

  UPDATE public.replacements
  SET status = p_status
  WHERE id = p_replacement_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 1 THEN
    RAISE EXCEPTION 'Replacement status update failed (expected 1 row, affected %)', v_rows_affected;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', p_status,
    'new_chest_no', v_new_chest_no
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_replacement_tx(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_replacement_tx(UUID, TEXT, TEXT) TO authenticated;

-- 13. Update fest_leaderboard view so published result fallbacks resolve 101+ chest numbers via public.chest_no
CREATE OR REPLACE VIEW public.fest_leaderboard AS
WITH valid_results AS (
  SELECT
    r.id,
    COALESCE(r.college_affl_no, cl.college_affl_no, cn.college_affl_no, s_cn.college_affl_no, s_leg.college_affl_no) AS college_affl_no,
    COALESCE(r.points, 0) AS points,
    r.rank
  FROM public.results r
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
