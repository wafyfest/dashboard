import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['admin', 'convenor'];

export async function POST(req: NextRequest) {
  const auth = await requireServerRole(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const settings = body?.settings;
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings payload.' }, { status: 400 });
    }

    const payload = { ...settings } as Record<string, unknown>;
    payload.id = 1; // Always target the singleton fest_settings row
    if (typeof payload.reg_deadline === 'string' && payload.reg_deadline) {
      if (!payload.fine_deadline) {
        payload.fine_deadline = payload.reg_deadline;
      }
    }

    const { error } = await auth.db.from('fest_settings').upsert(payload);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
