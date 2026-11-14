import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, rateLimitAsync, rateLimitHeaders } from '@/lib/rateLimit';
import {
  STUDENT_CIC_COOKIE,
  STUDENT_ID_COOKIE,
  STUDENT_TOKEN_COOKIE,
  getStudentCookieOptions,
  signStudentToken,
} from '@/lib/studentSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Up to 60 attempts per 15 minutes per IP so multiple students on the same campus Wi-Fi aren't blocked
const LOGIN_LIMIT = 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface SafeStudentSession {
  id: string;
  name: string;
  cic_no: string | number;
  college_affl_no: number | null;
  college_name: string;
  college_short_name: string;
  class: string | null;
  phase: string;
  chest_no: string;
}

/**
 * Normalizes input:
 * - Removes zero-width characters (\u200B, \u200C, \u200D, \uFEFF)
 * - Replaces non-breaking or strange whitespace with standard space
 * - Converts Arabic-Indic and Persian digits to standard ASCII digits
 * - Trims leading/trailing whitespace
 */
function normalizeInput(str: unknown): string {
  if (typeof str !== 'string' && typeof str !== 'number') return '';
  return String(str)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776))
    .trim();
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimitAsync({ key: `student-login:${ip}`, limit: LOGIN_LIMIT, windowMs: LOGIN_WINDOW_MS });

  if (!rl.allowed) {
    const retryMins = Math.ceil(rl.retryAfterMs / 60_000);
    return NextResponse.json(
      {
        error: `Too many login attempts. Please wait ${retryMins} minute${retryMins !== 1 ? 's' : ''} before trying again.`,
        retryAfterMs: rl.retryAfterMs,
      },
      {
        status: 429,
        headers: rateLimitHeaders(rl, LOGIN_LIMIT),
      }
    );
  }

  let rawCic = '';
  let rawPassword = '';
  try {
    const body = await req.json();
    rawCic = String(body.cicNo ?? '');
    rawPassword = String(body.password ?? '');
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const cleanCic = normalizeInput(rawCic).replace(/^ST-|^CH-/i, '');
  const cleanPassword = normalizeInput(rawPassword);

  if (!cleanCic) {
    return NextResponse.json({ error: 'Please enter your CIC Number.' }, { status: 400 });
  }
  if (!cleanPassword) {
    return NextResponse.json({ error: 'Please enter your password.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const hasServiceRole =
    Boolean(serviceRoleKey) && serviceRoleKey !== 'your-service-role-key';

  if (!supabaseUrl || (!hasServiceRole && !publicKey)) {
    return NextResponse.json(
      { error: 'Database configuration error. Please contact administrator.' },
      { status: 503 }
    );
  }

  // Active client: Prefer service_role key when available, fallback to anon key
  const activeKey = (hasServiceRole && serviceRoleKey) ? serviceRoleKey : publicKey!;
  const supabase = createClient(supabaseUrl, activeKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let safeStudent: SafeStudentSession | null = null;
  let lastDbError: any = null;

  // ── Strategy 1: Atomic verify_student_login RPC (single DB round-trip with JOINs) ──
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.rpc('verify_student_login', {
        p_identifier: cleanCic,
        p_password: cleanPassword,
      });

      if (error) {
        lastDbError = error;
        console.warn(`[API /api/auth/student-login] RPC attempt ${attempt + 1} error:`, error.message);
        if (attempt === 0) {
          // Brief pause before single retry to absorb cold-start / connection pool blips
          await new Promise(r => setTimeout(r, 250));
          continue;
        }
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        if (row && row.id) {
          safeStudent = {
            id: String(row.id),
            name: row.name,
            cic_no: row.cic_no,
            college_affl_no: row.college_affl_no ?? null,
            college_name: row.college_name || '',
            college_short_name: row.college_short_name || '',
            class: row.class ?? null,
            phase: row.phase,
            chest_no: row.chest_no || '',
          };
        }
        lastDbError = null;
        break;
      }
    } catch (err: any) {
      lastDbError = err;
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 250));
      }
    }
  }

  // ── Strategy 2: Direct Table Fallback (if RPC didn't verify and service role is available) ──
  if (!safeStudent && hasServiceRole && serviceRoleKey) {
    try {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const numericCic = parseInt(cleanCic.replace(/\D/g, ''), 10);
      if (!isNaN(numericCic)) {
        const { data: stuByCic } = await adminClient
          .from('students')
          .select('*')
          .eq('cic_no', numericCic)
          .limit(1);

        const student = stuByCic?.[0];
        if (student) {
          const cicVal = student.cic_no ?? student.admission_no ?? cleanCic;
          const storedPassword = student.password ? String(student.password).trim() : null;
          const expectedPassword = storedPassword || `${cicVal}@${student.college_affl_no}`;

          if (cleanPassword === expectedPassword) {
            let assignedChestNo = '';
            if (student.cic_no != null) {
              const { data: ownChest } = await adminClient
                .from('chest_no')
                .select('chest_no')
                .eq('cic_no', student.cic_no)
                .maybeSingle();
              if (ownChest?.chest_no) {
                assignedChestNo = String(ownChest.chest_no);
              }
            }

            let collegeName = '';
            let collegeShortName = '';
            if (student.college_affl_no) {
              const { data: colData } = await adminClient
                .from('colleges')
                .select('name, short_name')
                .eq('affl_no', student.college_affl_no)
                .maybeSingle();
              if (colData) {
                collegeName = colData.name || '';
                collegeShortName = colData.short_name || '';
              }
            }

            safeStudent = {
              id: student.id,
              name: student.name,
              cic_no: cicVal,
              college_affl_no: student.college_affl_no ?? null,
              college_name: collegeName,
              college_short_name: collegeShortName,
              class: student.class ?? null,
              phase: student.phase,
              chest_no: assignedChestNo || (student.chest_no && /^\d+$/.test(String(student.chest_no)) ? String(student.chest_no) : ''),
            };
          }
        }
      }
    } catch (err: any) {
      console.error('[API /api/auth/student-login] Direct table fallback error:', err);
    }
  }

  // If a database error prevented verification entirely
  if (!safeStudent && lastDbError) {
    console.error('[API /api/auth/student-login] Verification failed due to DB error:', lastDbError);
    return NextResponse.json(
      { error: 'Authentication service temporarily busy. Please try again in a few moments.' },
      { status: 503 }
    );
  }

  if (!safeStudent) {
    return NextResponse.json(
      { error: 'Invalid credentials. Please verify your CIC number and password or contact your college coordinator.' },
      {
        status: 401,
        headers: rateLimitHeaders(rl, LOGIN_LIMIT),
      }
    );
  }

  const response = NextResponse.json(
    { student: safeStudent },
    {
      status: 200,
      headers: rateLimitHeaders(rl, LOGIN_LIMIT),
    }
  );

  const cookieOpts = getStudentCookieOptions();
  const signedToken = signStudentToken({
    id: safeStudent.id,
    cic_no: safeStudent.cic_no,
    college_affl_no: safeStudent.college_affl_no,
  });

  response.cookies.set(STUDENT_TOKEN_COOKIE, signedToken, cookieOpts);
  response.cookies.set(STUDENT_ID_COOKIE, String(safeStudent.id), cookieOpts);
  response.cookies.set(STUDENT_CIC_COOKIE, String(safeStudent.cic_no), cookieOpts);

  return response;
}
