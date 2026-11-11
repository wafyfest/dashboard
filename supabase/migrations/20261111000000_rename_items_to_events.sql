-- ============================================================================
-- Migration: Rename table `items` to `events` with backwards-compatible view
-- Description: Renames public.items table to public.events in-place without data duplication.
--              Creates a compatibility view public.items so existing client queries continue working.
-- ============================================================================

BEGIN;

-- 1. Rename the physical table in-place (preserves all 84 records, columns, PK, and foreign keys)
ALTER TABLE IF EXISTS public.items RENAME TO events;

-- 2. Rename the sequence
ALTER SEQUENCE IF EXISTS public.items_item_id_seq RENAME TO events_item_id_seq;

-- 3. Rename RLS Policies on events table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'items_select_all') THEN
    ALTER POLICY "items_select_all" ON public.events RENAME TO "events_select_all";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'items_insert_admin') THEN
    ALTER POLICY "items_insert_admin" ON public.events RENAME TO "events_insert_admin";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'items_update_admin') THEN
    ALTER POLICY "items_update_admin" ON public.events RENAME TO "events_update_admin";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'items_delete_admin') THEN
    ALTER POLICY "items_delete_admin" ON public.events RENAME TO "events_delete_admin";
  END IF;
END $$;

-- 4. Enable Realtime Replication on the renamed events table
ALTER TABLE public.events REPLICA IDENTITY FULL;

-- 5. Create a backwards-compatible VIEW named `items`
-- Any query reading from `items` will seamlessly read from `events`
CREATE OR REPLACE VIEW public.items AS 
  SELECT * FROM public.events;

-- 6. Grant standard permissions on both table and compatibility view
GRANT ALL ON public.events TO authenticated, service_role;
GRANT SELECT ON public.events TO anon;

GRANT ALL ON public.items TO authenticated, service_role;
GRANT SELECT ON public.items TO anon;

COMMIT;
