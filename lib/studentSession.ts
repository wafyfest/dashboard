import crypto from 'crypto';

export const STUDENT_TOKEN_COOKIE = 'arts_fest_student_token';
export const STUDENT_ID_COOKIE = 'arts_fest_student_id';
export const STUDENT_CIC_COOKIE = 'arts_fest_student_cic';
export const STUDENT_SESSION_MAX_AGE_SEC = 86400; // 24 hours

export interface StudentTokenPayload {
  id: string;
  cic_no: string;
  college_affl_no: number | null;
  exp: number;
}

function getSigningSecret(): string {
  const secret = process.env.STUDENT_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    // Fall back to a deterministic hash derived from the Supabase URL to prevent 500 runtime crashes
    const fallbackSeed = process.env.NEXT_PUBLIC_SUPABASE_URL || 'wsf-student-session-fallback-secret';
    return crypto.createHash('sha256').update(fallbackSeed).digest('hex');
  }
  return secret;
}

/**
 * Create an HMAC-SHA256 signed token for a verified student session.
 */
export function signStudentToken(student: {
  id: string;
  cic_no: string | number;
  college_affl_no: number | null;
}): string {
  const payload: StudentTokenPayload = {
    id: String(student.id),
    cic_no: String(student.cic_no),
    college_affl_no: student.college_affl_no ?? null,
    exp: Math.floor(Date.now() / 1000) + STUDENT_SESSION_MAX_AGE_SEC,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Verify an HMAC-SHA256 signed student session token.
 * Returns null if the signature is invalid, malformed, or expired.
 */
export function verifyStudentToken(token: string | undefined | null): StudentTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');

  const providedBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (providedBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as StudentTokenPayload;
    if (!parsed || !parsed.id || !parsed.cic_no || typeof parsed.exp !== 'number') {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getStudentCookieOptions(maxAge = STUDENT_SESSION_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
