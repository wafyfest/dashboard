import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';
import { computeDeadlineSchedule } from '@/lib/utils/istDate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string;

    if (action === 'log_audit') {
      const auth = await requireServerRole([
        'admin',
        'convenor',
        'college',
        'stage_controller',
        'result_entry',
      ]);
      if (!auth.ok) return auth.response;

      const log = body?.log;
      if (!log || typeof log !== 'object') {
        return NextResponse.json({ error: 'Invalid audit log payload.' }, { status: 400 });
      }

      const sanitizedLog = {
        action_type: log.action_type,
        category: log.category,
        severity: log.severity,
        actor_role: auth.role,
        actor_name: log.actor_name,
        college_affl_no:
          auth.role === 'college' ? auth.collegeAfflNo : (log.college_affl_no ?? null),
        item_id: log.item_id ?? null,
        target_id: log.target_id ?? null,
        description: log.description,
        details: log.details ?? {},
      };

      const { error } = await auth.db.from('system_audit_logs').insert([sanitizedLog]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'update_schedule_status') {
      const auth = await requireServerRole(['admin', 'convenor', 'stage_controller', 'result_entry']);
      if (!auth.ok) return auth.response;

      const itemId = Number(body?.itemId);
      if (!itemId || Number.isNaN(itemId)) {
        return NextResponse.json({ error: 'Valid itemId is required.' }, { status: 400 });
      }

      const { error } = await auth.db
        .from('schedules')
        .update({ status: body?.status })
        .eq('item_id', itemId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'save_schedule') {
      const auth = await requireServerRole(['admin', 'convenor', 'stage_controller']);
      if (!auth.ok) return auth.response;

      const itemId = Number(body?.itemId);
      if (!itemId || Number.isNaN(itemId)) {
        return NextResponse.json({ error: 'Valid itemId is required.' }, { status: 400 });
      }

      const schedulePayload = body?.payload;
      if (!schedulePayload || typeof schedulePayload !== 'object') {
        return NextResponse.json({ error: 'Invalid schedule payload.' }, { status: 400 });
      }
      const cleanSchedule = {
        stage_number: Number(schedulePayload.stage_number),
        starting: schedulePayload.starting,
        ending: schedulePayload.ending ?? null,
        status: schedulePayload.status ?? 'Upcoming',
      };

      const { data: existingRows, error: selErr } = await auth.db
        .from('schedules')
        .select('id')
        .eq('item_id', itemId);
      if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

      if (existingRows && existingRows.length > 0) {
        const { error } = await auth.db
          .from('schedules')
          .update({ ...cleanSchedule, updated_at: new Date().toISOString() })
          .eq('item_id', itemId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await auth.db.from('schedules').insert({
          item_id: itemId,
          ...cleanSchedule,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // All other admin/convenor management actions
    const auth = await requireServerRole(['admin', 'convenor']);
    if (!auth.ok) return auth.response;

    if (action === 'update_college') {
      if (auth.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: only executive admin can update college settings and overrides.' }, { status: 403 });
      }
      const afflNo = Number(body?.afflNo);
      const updates = body?.updates;
      if (!afflNo || Number.isNaN(afflNo) || !updates || typeof updates !== 'object') {
        return NextResponse.json({ error: 'Valid afflNo and updates are required.' }, { status: 400 });
      }
      const { error } = await auth.db.from('colleges').update(updates).eq('affl_no', afflNo);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'clear_late_registrations') {
      if (auth.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: only executive admin can clear fines and late registrations.' }, { status: 403 });
      }
      const afflNo = body?.collegeAfflNo !== undefined && body?.collegeAfflNo !== null
        ? Number(body.collegeAfflNo)
        : null;

      const results =
        afflNo !== null && !Number.isNaN(afflNo)
          ? await Promise.all([
              auth.db.from('late_registrations').delete().eq('college_affl_no', afflNo),
              auth.db.from('colleges').update({ fine_status: false }).eq('affl_no', afflNo),
            ])
          : await Promise.all([
              auth.db.from('late_registrations').delete().gte('college_affl_no', 0),
              auth.db.from('colleges').update({ fine_status: false }).gte('college_affl_no', 0),
            ]);

      const err = results.find(r => r.error)?.error;
      if (err) return NextResponse.json({ error: err.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'save_item') {
      const itemId = body?.itemId ? Number(body.itemId) : null;
      const payload = body?.payload;
      if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ error: 'Invalid event payload.' }, { status: 400 });
      }

      if (itemId) {
        const { data, error } = await auth.db
          .from('events')
          .update(payload)
          .eq('item_id', itemId)
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, data });
      }

      const { data, error } = await auth.db
        .from('events')
        .insert(payload)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'update_item_deadlines') {
      const itemIds = Array.isArray(body?.itemIds)
        ? body.itemIds.map((id: unknown) => Number(id)).filter((n: number) => !Number.isNaN(n))
        : [];
      if (itemIds.length === 0) {
        return NextResponse.json({ error: 'Valid itemIds are required.' }, { status: 400 });
      }

      const rawRegDeadline = body?.regDeadline ?? null;
      const schedule = typeof rawRegDeadline === 'string' && rawRegDeadline
        ? computeDeadlineSchedule(rawRegDeadline)
        : null;

      const { data, error } = await auth.db
        .from('events')
        .update({
          reg_deadline: schedule ? schedule.regDeadlineIso : rawRegDeadline,
          fine_deadline: schedule ? schedule.superFineEndIso : null,
        })
        .in('item_id', itemIds)
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'create_announcement') {
      const payload = body?.payload;
      if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ error: 'Invalid announcement payload.' }, { status: 400 });
      }
      const { data, error } = await auth.db
        .from('announcements')
        .insert(payload)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'delete_announcement') {
      const id = String(body?.id ?? '').trim();
      if (!id) return NextResponse.json({ error: 'Valid announcement id is required.' }, { status: 400 });
      const { error } = await auth.db.from('announcements').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
