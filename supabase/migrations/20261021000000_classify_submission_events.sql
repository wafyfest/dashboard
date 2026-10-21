-- Migration: 20261021000000_classify_submission_events.sql
-- Description: Categorize digital media, photography, video, vlog, and podcast items as 'submission' mode.

UPDATE public.items
SET mode = 'submission'
WHERE item_id IN (45, 46, 47, 77, 82, 83, 84);
