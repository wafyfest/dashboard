-- ====================================================================
-- Migration: 20261128005900_add_hall_ticket_download_enabled.sql
-- Description: Add hall_ticket_download_enabled boolean toggle to fest_settings
-- ====================================================================

ALTER TABLE public.fest_settings
ADD COLUMN IF NOT EXISTS hall_ticket_download_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.fest_settings.hall_ticket_download_enabled IS 'Global lock/unlock switch for student & college hall ticket downloads';
