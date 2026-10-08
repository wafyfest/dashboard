import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Paths that require NO authentication at all
const PUBLIC_PATHS = ['/login', '/student', '/_next', '/favicon'];

// Route → allowed roles mapping (admin can access everything)
const ROUTE_ROLE_MAP: Record<string, string[]> = {
  '/admin': ['admin'],
  '/college': ['college', 'admin'],
  '/stage-controller': ['stage_controller', 'admin'],
  '/result-entry': ['result_entry', 'admin'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public paths without checking auth
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      }
    }
  });

  // 2. Strict authentication via Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // 3. Retrieve user role from profiles table (or fallback to auth metadata)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const userRole = (profile?.role as string) || 'college';

  // 4. Server-side role authorization check
  const matchedRoute = Object.keys(ROUTE_ROLE_MAP).find(route => pathname.startsWith(route));

  if (matchedRoute) {
    const allowedRoles = ROUTE_ROLE_MAP[matchedRoute];

    if (!allowedRoles.includes(userRole)) {
      const roleRouteMap: Record<string, string> = {
        college: '/college',
        admin: '/admin',
        student: '/student',
        stage_controller: '/stage-controller',
        result_entry: '/result-entry',
      };
      const redirectPath = roleRouteMap[userRole] || '/login';

      if (redirectPath !== pathname) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = redirectPath;
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
