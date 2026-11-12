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

const LOGIN_LIMIT = 10;
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

  const cleanCic = rawCic.trim().replace(/^ST-|^CH-/i, '');
  const cleanPassword = rawPassword.trim();

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
      { error: 'Database connection error. Please verify configuration.' },
      { status: 503 }
    );
  }

  let safeStudent: SafeStudentSession | null = null;

  if (hasServiceRole && serviceRoleKey) {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let student: Record<string, any> | undefined;
    let assignedChestNo: string | null = null;

    // Authenticate strictly by cic_no
    if (/^\d+$/.test(cleanCic)) {
      const { data: stuByCic, error: fetchError } = await adminClient
        .from('students')
        .select('*')
        .eq('cic_no', parseInt(cleanCic, 10))
        .limit(1);
      if (fetchError) {
        console.error('[API /api/auth/student-login] Student query error:', fetchError);
        return NextResponse.json(
          { error: 'Failed to verify student record. Please try again.' },
          { status: 500 }
        );
      }
      student = stuByCic?.[0];
    }

    if (student && student.cic_no != null) {
      const { data: ownChest } = await adminClient
        .from('chest_no')
        .select('chest_no')
        .eq('cic_no', student.cic_no)
        .maybeSingle();
      if (ownChest?.chest_no) {
        assignedChestNo = String(ownChest.chest_no);
      }
    }
    if (student) {
      const cicVal = student.cic_no ?? student.admission_no ?? cleanCic;
      const storedPassword = student.password ? String(student.password).trim() : null;
      const expectedPassword = storedPassword || `${cicVal}@${student.college_affl_no}`;

      if (cleanPassword === expectedPassword) {
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
  } else if (publicKey) {
    const supabase = createClient(supabaseUrl, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error: rpcError } = await supabase.rpc('verify_student_login', {
      p_identifier: cleanCic,
      p_password: cleanPassword,
    });

    if (rpcError) {
      console.error('[API /api/auth/student-login] RPC error:', rpcError);
      return NextResponse.json(
        { error: 'Failed to verify student record. Please try again.' },
        { status: 500 }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      safeStudent = {
        id: row.id,
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
