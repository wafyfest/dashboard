import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/server';

export interface ServerAuthResult {
  ok: true;
  userId: string;
  role: string;
  collegeAfflNo: number | null;
  db: SupabaseClient;
  sessionDb: SupabaseClient;
  usingServiceRole: boolean;
}

export interface ServerAuthError {
  ok: false;
  response: NextResponse;
}

/**
 * Verifies the caller's Supabase Auth session cookie and checks that their
 * `profiles.role` is in `allowedRoles`. Returns a server-side Supabase client
 * powered by `SUPABASE_SERVICE_ROLE_KEY` (falling back to the authenticated
 * session client if the service role key is not yet configured).
 */
export async function requireServerRole(
  allowedRoles: string[]
): Promise<ServerAuthResult | ServerAuthError> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Supabase URL is not configured on the server.' },
        { status: 503 }
      ),
    };
  }

  const sessionClient = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required. Please log in again.' },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await sessionClient
    .from('profiles')
    .select('role, college_affl_no')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile?.role) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'User profile or role not found.' },
        { status: 403 }
      ),
    };
  }

  const role = String(profile.role);
  let collegeAfflNo: number | null = profile.college_affl_no ?? null;

  if (role === 'college' && collegeAfflNo === null && user.email) {
    const { data: matchedCollege } = await sessionClient
      .from('colleges')
      .select('affl_no')
      .eq('email', user.email.toLowerCase())
      .maybeSingle();
    if (matchedCollege?.affl_no !== undefined && matchedCollege?.affl_no !== null) {
      collegeAfflNo = Number(matchedCollege.affl_no);
    }
  }

  if (!allowedRoles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden: role "${role}" cannot perform this action.` },
        { status: 403 }
      ),
    };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    const adminClient = createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Auto-heal profiles.college_affl_no in database if it was resolved via email fallback
    if (role === 'college' && collegeAfflNo !== null && profile.college_affl_no === null) {
      try {
        await adminClient
          .from('profiles')
          .update({ college_affl_no: collegeAfflNo })
          .eq('id', user.id);
      } catch {
        // Non-blocking auto-heal
      }
    }

    return {
      ok: true,
      userId: user.id,
      role,
      collegeAfflNo,
      db: adminClient,
      sessionDb: sessionClient as unknown as SupabaseClient,
      usingServiceRole: true,
    };
  }

  console.warn(
    '[serverAuth] SUPABASE_SERVICE_ROLE_KEY is not set; falling back to authenticated session client.'
  );
  return {
    ok: true,
    userId: user.id,
    role,
    collegeAfflNo,
    db: sessionClient as unknown as SupabaseClient,
    sessionDb: sessionClient as unknown as SupabaseClient,
    usingServiceRole: false,
  };
}
