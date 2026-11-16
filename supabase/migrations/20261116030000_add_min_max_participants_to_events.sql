-- Migration: 20261116030000_add_min_max_participants_to_events.sql
-- Description: Add min_participants and max_participants to public.events,
--              initialize them from no_of_participants, and configure Mashup (GN089) for min 3, max 6.

BEGIN;

-- 1. Add min_participants and max_participants columns to public.events
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS min_participants INT,
  ADD COLUMN IF NOT EXISTS max_participants INT;

-- 2. Populate min_participants and max_participants from existing no_of_participants
UPDATE public.events
SET 
  min_participants = no_of_participants,
  max_participants = no_of_participants;

-- 3. Specific override for Mashup (item_id = 89, item_code = 'GN089'): Min 3, Max 6
UPDATE public.events
SET 
  min_participants = 3,
  max_participants = 6,
  no_of_participants = 6
WHERE item_id = 89 OR item_code = 'GN089';

COMMIT;
