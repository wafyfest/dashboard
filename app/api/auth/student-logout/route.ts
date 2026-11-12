import { NextResponse } from 'next/server';
import {
  STUDENT_CIC_COOKIE,
  STUDENT_ID_COOKIE,
  STUDENT_TOKEN_COOKIE,
  getStudentCookieOptions,
} from '@/lib/studentSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Clear httpOnly student session cookies on sign-out.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  const expiredOpts = getStudentCookieOptions(0);

  response.cookies.set(STUDENT_TOKEN_COOKIE, '', expiredOpts);
  response.cookies.set(STUDENT_ID_COOKIE, '', expiredOpts);
  response.cookies.set(STUDENT_CIC_COOKIE, '', expiredOpts);

  return response;
}
