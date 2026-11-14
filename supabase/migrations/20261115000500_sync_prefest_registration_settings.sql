-- Sync legacy prefest_registration_settings table with current event_deadline_settings table
UPDATE public.prefest_registration_settings
SET
  registration_enabled = true,
  youtube_submission_enabled = true,
  registration_opens_at = '2026-11-13 16:30:00+00',
  registration_closes_at = '2026-11-22 16:30:00+00',
  youtube_submission_opens_at = '2026-11-13 16:30:00+00',
  youtube_submission_closes_at = '2026-11-30 16:30:00+00'
WHERE event_type = 'SCREENING';
