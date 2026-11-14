import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';
import { createClient } from '@supabase/supabase-js';
import { EventKind, EventDeadlineSetting, DEFAULT_EVENT_DEADLINES } from '@/lib/types/fest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publicKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const activeKey = (serviceRoleKey && serviceRoleKey !== 'your-service-role-key')
      ? serviceRoleKey
      : publicKey;

    if (!supabaseUrl || !activeKey) {
      return NextResponse.json({ settings: DEFAULT_EVENT_DEADLINES });
    }

    const client = createClient(supabaseUrl, activeKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error } = await client
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

    // Support explicit sync action
    if (body?.action === 'sync') {
      try {
        const { data: syncData, error: syncErr } = await auth.db.rpc('sync_all_late_registrations');
        if (syncErr) {
          console.warn('Notice: sync_all_late_registrations rpc warning:', syncErr);
        }
        return NextResponse.json({ success: true, sync: syncData });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
      }
    }

    const payload: Partial<EventDeadlineSetting> = body?.payload || body;

    if (!payload.event_kind) {
      return NextResponse.json({ error: 'event_kind is required.' }, { status: 400 });
    }

    const hasSuperFine = Boolean(payload.has_super_fine);
    const linkHasSuperFine = Boolean(payload.link_has_super_fine);
    const resolvedLinkCutoff = linkHasSuperFine && payload.link_super_fine_deadline
      ? new Date(payload.link_super_fine_deadline).toISOString()
      : (payload.link_fine_deadline
          ? new Date(payload.link_fine_deadline).toISOString()
          : (payload.link_no_fine_deadline
              ? new Date(payload.link_no_fine_deadline).toISOString()
              : (payload.link_submission_deadline ? new Date(payload.link_submission_deadline).toISOString() : null)));

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
      // Multi-tier link submission schedule
      link_start_time: payload.link_start_time ? new Date(payload.link_start_time).toISOString() : null,
      link_no_fine_deadline: payload.link_no_fine_deadline ? new Date(payload.link_no_fine_deadline).toISOString() : null,
      link_fine_deadline: payload.link_fine_deadline ? new Date(payload.link_fine_deadline).toISOString() : null,
      link_fine_amount: Number(payload.link_fine_amount) >= 0 ? Number(payload.link_fine_amount) : 0,
      link_has_super_fine: linkHasSuperFine,
      link_super_fine_deadline: linkHasSuperFine && payload.link_super_fine_deadline ? new Date(payload.link_super_fine_deadline).toISOString() : null,
      link_super_fine_amount: linkHasSuperFine && Number(payload.link_super_fine_amount) >= 0 ? Number(payload.link_super_fine_amount) : 0,
      link_submission_deadline: resolvedLinkCutoff,
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
      if (payload.event_kind === 'screening' || payload.event_kind === 'submission') {
        const eventType = payload.event_kind.toUpperCase();
        await auth.db.from('prefest_registration_settings').upsert(
          {
            event_type: eventType,
            registration_enabled: cleanRow.is_active,
            registration_opens_at: cleanRow.start_time,
            registration_closes_at: cleanRow.no_fine_deadline,
            youtube_submission_enabled: cleanRow.is_active,
            youtube_submission_opens_at: cleanRow.start_time,
            youtube_submission_closes_at: cleanRow.link_submission_deadline || cleanRow.fine_deadline,
            updated_at: new Date().toISOString(),
            updated_by: auth.userId,
          },
          { onConflict: 'event_type' }
        );
      }
    } catch (mirrorErr) {
      console.warn('Notice: backwards mirror deferred:', mirrorErr);
    }

    // Synchronize late registrations across all events immediately
    try {
      await auth.db.rpc('sync_all_late_registrations');
    } catch (syncErr) {
      console.warn('Notice: sync_all_late_registrations deferred:', syncErr);
    }

    return NextResponse.json({ success: true, setting: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error updating event deadlines' }, { status: 500 });
  }
}
