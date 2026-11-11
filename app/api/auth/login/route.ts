import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Rate limit tiers
// ---------------------------------------------------------------------------
// Tight per-IP limit: 10 attempts per 15 minutes.
// A real user will never hit this; a brute-force script will be blocked fast.
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function rateLimitHeaders(remaining: number, resetAt: number, retryAfterMs: number) {
  return {
    'X-RateLimit-Limit': String(LOGIN_LIMIT),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
    'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
  };
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // 1. Rate limit check — keyed by IP
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `login:${ip}`, limit: LOGIN_LIMIT, windowMs: LOGIN_WINDOW_MS });

  if (!rl.allowed) {
    const retryMins = Math.ceil(rl.retryAfterMs / 60_000);
    return NextResponse.json(
      {
        error: `Too many login attempts. Please wait ${retryMins} minute${retryMins !== 1 ? 's' : ''} before trying again.`,
        retryAfterMs: rl.retryAfterMs,
      },
      {
        status: 429,
        headers: rateLimitHeaders(rl.remaining, rl.resetAt, rl.retryAfterMs),
      }
    );
  }

  // 2. Parse body
  let email: string;
  let password: string;
  try {
    const body = await req.json();
    email = (body.email ?? '').trim().toLowerCase();
    password = body.password ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  // 3. Build a Supabase server client that can set auth cookies on the response
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Database connection error. Please verify configuration.' },
      { status: 503 }
    );
  }

  // We collect cookies to set on the response
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookies) => {
        cookiesToSet.push(...cookies);
      },
    },
  });

  // 4. Authenticate
  const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

  if (authError || !data.user) {
    // Count failed attempts as a consumed token (already done above).
    const message =
      authError?.message === 'Invalid login credentials'
        ? 'Incorrect email or password. Please check your credentials.'
        : (authError?.message ?? 'Authentication failed. Please try again.');

    return NextResponse.json(
      { error: message },
      {
        status: 401,
        headers: rateLimitHeaders(rl.remaining, rl.resetAt, rl.retryAfterMs),
      }
    );
  }

  // 5. Fetch role + college affiliation from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, college_affl_no, full_name')
    .eq('id', data.user.id)
    .maybeSingle();

  let userRole: string = profile?.role ?? 'college';
  let afflNo: number | null = profile?.college_affl_no ?? null;

  // Fallback: match college by email when profile link is pending
  if (!profile && !afflNo) {
    const { data: matchedCollege } = await supabase
      .from('colleges')
      .select('affl_no')
      .eq('email', email)
      .maybeSingle();

    if (matchedCollege) {
      afflNo = matchedCollege.affl_no;
      userRole = 'college';
    }
  }

  // 6. Build the response and attach the Supabase auth cookies
  const response = NextResponse.json(
    {
      role: userRole,
      afflNo,
      fullName: profile?.full_name ?? null,
    },
    {
      status: 200,
      headers: rateLimitHeaders(rl.remaining, rl.resetAt, rl.retryAfterMs),
    }
  );

  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  }

  return response;
}
