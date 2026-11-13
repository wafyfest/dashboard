import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Route → allowed roles mapping (admin can access everything)
const ROUTE_ROLE_MAP: Record<string, string[]> = {
  '/admin': ['admin'],
  '/college': ['college', 'admin'],
  '/stage-controller': ['stage_controller', 'admin'],
  '/result-entry': ['result_entry', 'admin'],
  '/convenor': ['convenor', 'admin'],
};

const PROTECTED_PREFIXES = Object.keys(ROUTE_ROLE_MAP);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Only enforce authentication on protected dashboard routes.
  // Public pages, landing page, student viewer pass through freely without DB overhead.
  const isProtected = PROTECTED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
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

  // Collect any cookies refreshed by Supabase so they are not dropped on redirect
  const cookiesToSet: Array<{ name: string; value: string; options?: any }> = [];

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(newCookies) {
        newCookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        newCookies.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
          cookiesToSet.push({ name, value, options });
        });
      },
    },
  });

  // Helper: create a redirect response that retains refreshed session cookies
  const createRedirect = (targetPath: string, searchParams?: Record<string, string>) => {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = targetPath;
    if (searchParams) {
      Object.entries(searchParams).forEach(([k, v]) => redirectUrl.searchParams.set(k, v));
    }
    const redirectRes = NextResponse.redirect(redirectUrl);
    cookiesToSet.forEach(({ name, value, options }) => {
      redirectRes.cookies.set(name, value, options);
    });
    return redirectRes;
  };

  // 2. Strict authentication via Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return createRedirect('/login');
  }

  // 3. Retrieve user role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  let userRole = profile?.role as string | undefined;

  // Fallback: match college coordinator by registered institutional email
  if (!userRole && user.email) {
    const { data: matchedCollege } = await supabase
      .from('colleges')
      .select('affl_no')
      .eq('email', user.email.toLowerCase())
      .maybeSingle();

    if (matchedCollege?.affl_no) {
      userRole = 'college';
    }
  }

  if (!userRole) {
    return createRedirect('/login', { error: 'no_role_assigned' });
  }

  // 4. Server-side role authorization check with strict path boundaries
  const matchedRoute = PROTECTED_PREFIXES.find(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (matchedRoute) {
    const allowedRoles = ROUTE_ROLE_MAP[matchedRoute];

    if (!allowedRoles.includes(userRole)) {
      const roleRouteMap: Record<string, string> = {
        college: '/college',
        admin: '/admin',
        stage_controller: '/stage-controller',
        result_entry: '/result-entry',
        convenor: '/convenor',
      };
      const redirectPath = roleRouteMap[userRole] || '/login';

      if (redirectPath !== pathname) {
        return createRedirect(redirectPath);
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
