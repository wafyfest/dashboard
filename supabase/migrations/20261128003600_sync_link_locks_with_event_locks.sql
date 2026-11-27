-- Migration: 20261128003600_sync_link_locks_with_event_locks.sql
-- Description: Sync initial link submission locks with event registration locks.
--              Lock link submission for any event where event registration is locked.

UPDATE public.events
SET is_link_locked = true
WHERE is_locked = true;
