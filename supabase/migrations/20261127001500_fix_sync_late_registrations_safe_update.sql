-- ====================================================================
-- Migration: 20261127001500_fix_sync_late_registrations_safe_update.sql
-- Description:
-- Fix `sync_all_late_registrations()` to add `WHERE c.affl_no IS NOT NULL`
-- on the final UPDATE to colleges table (satisfies sql_safe_updates).
-- Then run the sync function to populate late video link entries.
-- ====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_all_late_registrations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $sync$
DECLARE
  v_synced_count INT := 0;
  v_rec RECORD;
  v_sub RECORD;
  v_kind TEXT;
  v_dl RECORD;
  v_reg_deadline TIMESTAMPTZ;
  v_fine_end TIMESTAMPTZ;
  v_super_fine_end TIMESTAMPTZ;
  v_fine_tier TEXT;
  v_fine_amount INT;
  v_late_reason TEXT;
  v_main_reg RECORD;
  v_chest_no TEXT;
  v_cic_no BIGINT;
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.fest_settings LIMIT 1;

  -- -------------------------------------------------------------
  -- 1. Process candidate registration late entries
  -- -------------------------------------------------------------
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

    IF v_dl.id IS NOT NULL THEN
      v_reg_deadline := v_dl.no_fine_deadline;
      v_fine_end := v_dl.fine_deadline;
      v_super_fine_end := CASE
        WHEN COALESCE(v_dl.has_super_fine, true) THEN COALESCE(v_dl.super_fine_deadline, v_fine_end)
        ELSE v_fine_end
      END;
    ELSE
      v_reg_deadline := COALESCE(v_rec.item_reg_deadline, v_settings.reg_deadline);
      v_fine_end := COALESCE(v_rec.item_fine_deadline, v_settings.fine_deadline);
      v_super_fine_end := v_fine_end;
    END IF;

    -- 3. Check if registration created_at was after deadline
    IF v_reg_deadline IS NOT NULL AND v_rec.created_at > v_reg_deadline THEN
      IF v_fine_end IS NOT NULL AND v_rec.created_at <= v_fine_end THEN
        v_fine_tier := 'fine';
        v_fine_amount := CASE WHEN v_dl.id IS NOT NULL THEN COALESCE(v_dl.fine_amount, 500) ELSE 500 END;
        v_late_reason := 'Late Registration (Standard Fine Tier)';
      ELSE
        v_fine_tier := 'super_fine';
        v_fine_amount := CASE WHEN v_dl.id IS NOT NULL THEN COALESCE(v_dl.super_fine_amount, 1000) ELSE 1000 END;
        v_late_reason := 'Late Registration (Super Fine Tier)';
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

  -- -------------------------------------------------------------
  -- 2. Process pre-fest video / link submission late entries
  -- -------------------------------------------------------------
  FOR v_sub IN
    SELECT 
      ps.id,
      ps.registration_id,
      ps.college_affl_no,
      ps.event_id,
      ps.submitted_at,
      ps.youtube_url,
      e.item_id,
      e.is_screening,
      e.is_submission,
      e.mode
    FROM public.prefest_submissions ps
    JOIN public.events e ON e.id = ps.event_id
  LOOP
    IF COALESCE(v_sub.is_screening, false) = true OR COALESCE(v_sub.mode::text, '') = 'screening' THEN
      v_kind := 'screening';
    ELSE
      v_kind := 'submission';
    END IF;

    SELECT * INTO v_dl FROM public.event_deadline_settings WHERE event_kind = v_kind LIMIT 1;
    IF v_dl.id IS NOT NULL AND v_dl.link_no_fine_deadline IS NOT NULL THEN
      IF v_sub.submitted_at > v_dl.link_no_fine_deadline THEN
        -- Resolve matching chest number and cic_no from registrations
        SELECT r.chest_no, r.cic_no INTO v_main_reg
        FROM public.registrations r
        WHERE r.college_affl_no = v_sub.college_affl_no AND r.item_id = v_sub.item_id
        ORDER BY r.created_at ASC
        LIMIT 1;

        v_chest_no := COALESCE(v_main_reg.chest_no, 'COL-' || v_sub.college_affl_no);
        v_cic_no := v_main_reg.cic_no;

        -- Determine link fine amount & tier
        IF v_dl.link_fine_deadline IS NOT NULL AND v_sub.submitted_at <= v_dl.link_fine_deadline THEN
          v_fine_tier := 'fine';
          v_fine_amount := COALESCE(v_dl.link_fine_amount, 500);
          v_late_reason := 'Late Link Submission (₹' || v_fine_amount || ') — within link fine window';
        ELSE
          v_fine_tier := CASE WHEN COALESCE(v_dl.link_has_super_fine, false) THEN 'super_fine' ELSE 'fine' END;
          v_fine_amount := CASE 
            WHEN COALESCE(v_dl.link_has_super_fine, false) THEN COALESCE(v_dl.link_super_fine_amount, 1000)
            ELSE COALESCE(v_dl.link_fine_amount, 500)
          END;
          v_late_reason := 'Super Fine Link Submission (₹' || v_fine_amount || ') — super fine link window';
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
          v_sub.item_id,
          v_sub.college_affl_no,
          v_cic_no,
          v_chest_no,
          v_late_reason,
          v_fine_tier,
          v_fine_amount,
          v_dl.link_no_fine_deadline,
          v_sub.submitted_at
        )
        ON CONFLICT (item_id, chest_no) DO UPDATE
        SET
          late_reason = CASE 
            WHEN public.late_registrations.late_reason NOT LIKE '%Link Submission%' 
            THEN public.late_registrations.late_reason || ' + ' || EXCLUDED.late_reason 
            ELSE EXCLUDED.late_reason 
          END,
          fine_amount = CASE 
            WHEN public.late_registrations.late_reason NOT LIKE '%Link Submission%' 
            THEN public.late_registrations.fine_amount + EXCLUDED.fine_amount 
            ELSE EXCLUDED.fine_amount 
          END,
          fine_tier = EXCLUDED.fine_tier;

        v_synced_count := v_synced_count + 1;
      END IF;
    END IF;
  END LOOP;

  -- -------------------------------------------------------------
  -- 3. Flag all colleges that have active late entries
  -- -------------------------------------------------------------
  UPDATE public.colleges c
  SET fine_status = EXISTS (
    SELECT 1 FROM public.late_registrations lr
    WHERE lr.college_affl_no = c.affl_no
      AND COALESCE(lr.is_waived, false) = false
  )
  WHERE c.affl_no IS NOT NULL;

  RETURN v_synced_count;
END;
$sync$;

REVOKE EXECUTE ON FUNCTION public.sync_all_late_registrations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_all_late_registrations() TO authenticated, service_role;

-- Run sync immediately
SELECT public.sync_all_late_registrations();

COMMIT;
