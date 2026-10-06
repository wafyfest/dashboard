import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Single shared instance for the entire app — prevents "Multiple GoTrueClient" warning.
// Both createClient() and the supabase export point to the exact same object.
let _instance: ReturnType<typeof createBrowserClient> | null = null;

function getInstance() {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!_instance) {
    _instance = createBrowserClient(supabaseUrl, supabaseKey);
  }
  return _instance;
}

/** Use this in React components / hooks (Next.js App Router pattern). */
export function createClient() {
  return getInstance();
}

/** Use this in service classes / non-React code. Same singleton, different alias. */
export function getSupabase() {
  return getInstance();
}

/** Convenience export so existing imports of `supabase` continue to work. */
export const supabase = getInstance();
