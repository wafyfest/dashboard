-- Migration: 20261115001900_fix_safe_update_where_clause.sql
-- Description: Add WHERE clause to colleges update in sync_all_late_registrations

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_all_late_registrations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $sync$
DECLARE
  v_synced_count INT := 0;
  v_rec RECORD;
  v_kind TEXT;
  v_dl RECORD;
  v_reg_deadline TIMESTAMPTZ;
  v_fine_end TIMESTAMPTZ;
  v_super_fine_end TIMESTAMPTZ;
  v_fine_tier TEXT;
  v_fine_amount INT;
  v_late_reason TEXT;
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.fest_settings LIMIT 1;

  FOR v_rec IN
    SELECT 
      r.id AS reg_id,
      r.item_id,
      r.college_affl_no,
      r.cic_no,
      r.chest_no,
      r.created_at,
      e.mode,
      e.is_screening,
      e.is_submission,
      e.reg_deadline AS item_reg_deadline,
      e.fine_deadline AS item_fine_deadline
    FROM public.registrations r
    JOIN public.events e ON e.item_id = r.item_id
  LOOP
    -- 1. Determine event kind
    IF COALESCE(v_rec.is_screening, false) = true OR COALESCE(v_rec.mode::text, '') = 'screening' THEN
      v_kind := 'screening';
    ELSIF COALESCE(v_rec.is_submission, false) = true OR COALESCE(v_rec.mode::text, '') = 'submission' THEN
      v_kind := 'submission';
    ELSIF LOWER(COALESCE(v_rec.mode::text, '')) IN ('onstage', 'on_stage', 'on stage') THEN
      v_kind := 'onstage';
    ELSIF LOWER(COALESCE(v_rec.mode::text, '')) IN ('offstage', 'off_stage', 'off stage') THEN
      v_kind := 'offstage';
    ELSE
      v_kind := 'general';
    END IF;

    -- 2. Fetch deadline settings for this kind
    SELECT * INTO v_dl FROM public.event_deadline_settings WHERE event_kind = v_kind LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO v_dl FROM public.event_deadline_settings WHERE event_kind = 'general' LIMIT 1;
    END IF;

    v_reg_deadline := COALESCE(v_dl.no_fine_deadline, v_rec.item_reg_deadline, v_settings.reg_deadline);
    v_fine_end := COALESCE(v_dl.fine_deadline, v_rec.item_fine_deadline, v_settings.fine_deadline);
    v_super_fine_end := CASE
      WHEN COALESCE(v_dl.has_super_fine, true) THEN COALESCE(v_dl.super_fine_deadline, v_fine_end)
      ELSE v_fine_end
    END;

    -- 3. Check if registration created_at was after deadline
    IF v_reg_deadline IS NOT NULL AND v_rec.created_at > v_reg_deadline THEN
      IF v_fine_end IS NOT NULL AND v_rec.created_at <= v_fine_end THEN
        v_fine_tier := 'fine';
        v_fine_amount := COALESCE(v_dl.fine_amount, 500);
        v_late_reason := 'Fine Period (₹' || v_fine_amount || ') — within fine window';
      ELSE
        v_fine_tier := 'super_fine';
        v_fine_amount := COALESCE(v_dl.super_fine_amount, 1000);
        v_late_reason := 'Super Fine Period (₹' || v_fine_amount || ') — super fine window';
      END IF;

      INSERT INTO public.late_registrations (
        item_id,
        college_affl_no,
        cic_no,
        chest_no,
        late_reason,
        fine_tier,
        fine_amount,
        effective_deadline,
        registered_at
      )
      VALUES (
        v_rec.item_id,
        v_rec.college_affl_no,
        v_rec.cic_no,
        v_rec.chest_no,
        v_late_reason,
        v_fine_tier,
        v_fine_amount,
        v_reg_deadline,
        v_rec.created_at
      )
      ON CONFLICT (item_id, chest_no) DO UPDATE
      SET
        cic_no = COALESCE(EXCLUDED.cic_no, public.late_registrations.cic_no),
        late_reason = COALESCE(public.late_registrations.late_reason, EXCLUDED.late_reason),
        fine_tier = COALESCE(public.late_registrations.fine_tier, EXCLUDED.fine_tier),
        fine_amount = COALESCE(public.late_registrations.fine_amount, EXCLUDED.fine_amount),
        effective_deadline = COALESCE(public.late_registrations.effective_deadline, EXCLUDED.effective_deadline),
        registered_at = COALESCE(public.late_registrations.registered_at, EXCLUDED.registered_at);

      v_synced_count := v_synced_count + 1;
    END IF;
  END LOOP;

  -- Flag all colleges that have active late entries (with explicit WHERE for safety)
  UPDATE public.colleges c
  SET fine_status = EXISTS (
    SELECT 1 FROM public.late_registrations lr
    WHERE lr.college_affl_no = c.affl_no
      AND COALESCE(lr.is_waived, false) = false
  )
  WHERE c.affl_no > 0;

  RETURN jsonb_build_object(
    'synced_count', v_synced_count,
    'timestamp', now()
  );
END;
$sync$;

REVOKE EXECUTE ON FUNCTION public.sync_all_late_registrations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_all_late_registrations() TO authenticated, service_role;

COMMIT;
