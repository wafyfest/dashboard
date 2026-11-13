import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';
import { EventKind, EventDeadlineSetting, DEFAULT_EVENT_DEADLINES } from '@/lib/types/fest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireServerRole(['admin', 'convenor', 'college', 'student', 'public']);
    if (!auth.ok) {
      return NextResponse.json({ settings: DEFAULT_EVENT_DEADLINES });
    }

    const { data, error } = await auth.db
      .from('event_deadline_settings')
      .select('*')
      .order('display_name', { ascending: true });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ settings: DEFAULT_EVENT_DEADLINES });
    }

    return NextResponse.json({ settings: data });
  } catch (err: any) {
    return NextResponse.json({ settings: DEFAULT_EVENT_DEADLINES, error: err?.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireServerRole(['admin']);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const payload: Partial<EventDeadlineSetting> = body?.payload || body;

    if (!payload.event_kind) {
      return NextResponse.json({ error: 'event_kind is required.' }, { status: 400 });
    }

    const hasSuperFine = Boolean(payload.has_super_fine);
    const cleanRow = {
      event_kind: payload.event_kind,
      display_name: payload.display_name || payload.event_kind,
      description: payload.description ?? null,
      start_time: payload.start_time ? new Date(payload.start_time).toISOString() : new Date().toISOString(),
      no_fine_deadline: payload.no_fine_deadline ? new Date(payload.no_fine_deadline).toISOString() : new Date().toISOString(),
      fine_deadline: payload.fine_deadline ? new Date(payload.fine_deadline).toISOString() : new Date().toISOString(),
      fine_amount: Number(payload.fine_amount) >= 0 ? Number(payload.fine_amount) : 500,
      has_super_fine: hasSuperFine,
      super_fine_deadline: hasSuperFine && payload.super_fine_deadline ? new Date(payload.super_fine_deadline).toISOString() : null,
      super_fine_amount: hasSuperFine && Number(payload.super_fine_amount) >= 0 ? Number(payload.super_fine_amount) : null,
      link_submission_deadline: payload.link_submission_deadline ? new Date(payload.link_submission_deadline).toISOString() : null,
      is_active: payload.is_active ?? true,
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    };

    const { data, error } = await auth.db
      .from('event_deadline_settings')
      .upsert(cleanRow, { onConflict: 'event_kind' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mirror deadlines to fest_settings or events for backwards compatibility
    try {
      if (payload.event_kind === 'general' || payload.event_kind === 'onstage') {
        await auth.db.from('fest_settings').update({
          reg_deadline: cleanRow.no_fine_deadline,
          fine_deadline: cleanRow.fine_deadline,
        }).eq('id', 1);
      }
      if (payload.event_kind === 'screening') {
        await auth.db.from('events').update({
          reg_deadline: cleanRow.no_fine_deadline,
          fine_deadline: cleanRow.fine_deadline,
        }).or('is_screening.eq.true,mode.eq.screening');
      }
    } catch (mirrorErr) {
      console.warn('Notice: backwards mirror deferred:', mirrorErr);
    }

    return NextResponse.json({ success: true, setting: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error updating event deadlines' }, { status: 500 });
  }
}
