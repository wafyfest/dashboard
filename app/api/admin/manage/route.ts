import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';

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

    if (action === 'apply_college_fine') {
      if (auth.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: only executive admin can apply institutional fines.' }, { status: 403 });
      }
      const afflNo = Number(body?.afflNo);
      const amount = Math.max(0, Number(body?.amount) || 0);
      const reason = String(body?.reason ?? '').trim();
      if (!afflNo || Number.isNaN(afflNo)) {
        return NextResponse.json({ error: 'Valid college afflNo is required.' }, { status: 400 });
      }

      const { error } = await auth.db.from('colleges').update({
        fine_status: true,
        manual_fine_amount: amount,
        fine_reason: reason || 'Administrative Penalty',
      }).eq('affl_no', afflNo);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, amount, reason });
    }

    if (action === 'waive_college_all_fines') {
      if (auth.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: only executive admin can waive institutional fines.' }, { status: 403 });
      }
      const afflNo = Number(body?.afflNo);
      if (!afflNo || Number.isNaN(afflNo)) {
        return NextResponse.json({ error: 'Valid college afflNo is required.' }, { status: 400 });
      }

      // Reset manual college fine
      const collegeUpdate = auth.db.from('colleges').update({
        fine_status: false,
        manual_fine_amount: 0,
        fine_reason: null,
      }).eq('affl_no', afflNo);

      // Waive all late registrations for this college
      const lateUpdate = auth.db.from('late_registrations').update({
        is_waived: true,
        waived_at: new Date().toISOString(),
      }).eq('college_affl_no', afflNo);

      const [resCol, resLate] = await Promise.all([collegeUpdate, lateUpdate]);
      if (resCol.error) return NextResponse.json({ error: resCol.error.message }, { status: 500 });
      if (resLate.error) return NextResponse.json({ error: resLate.error.message }, { status: 500 });

      return NextResponse.json({ success: true });
    }

    if (action === 'toggle_late_entry_waiver') {
      if (auth.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: only executive admin can toggle entry-level waivers.' }, { status: 403 });
      }
      const lateEntryId = body?.id ? String(body.id) : null;
      const itemId = body?.itemId != null ? Number(body.itemId) : null;
      const chestNo = body?.chestNo ? String(body.chestNo).trim() : null;
      const collegeAfflNo = body?.collegeAfflNo != null ? Number(body.collegeAfflNo) : null;
      const isWaived = Boolean(body?.isWaived);

      let query = auth.db.from('late_registrations').update({
        is_waived: isWaived,
        waived_at: isWaived ? new Date().toISOString() : null,
      });

      if (lateEntryId) {
        query = query.eq('id', lateEntryId);
      } else if (itemId != null && chestNo) {
        query = query.eq('item_id', itemId).eq('chest_no', chestNo);
        if (collegeAfflNo != null) {
          query = query.eq('college_affl_no', collegeAfflNo);
        }
      } else {
        return NextResponse.json({ error: 'Entry identifier (id or itemId + chestNo) required.' }, { status: 400 });
      }

      const { data, error } = await query.select('college_affl_no').maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const affl = collegeAfflNo ?? data?.college_affl_no;
      if (affl) {
        // Check if college still has any active (unwaived) late registrations or manual fine
        const [activeLateRes, colRes] = await Promise.all([
          auth.db.from('late_registrations').select('id').eq('college_affl_no', affl).eq('is_waived', false).limit(1),
          auth.db.from('colleges').select('manual_fine_amount').eq('affl_no', affl).maybeSingle(),
        ]);

        const hasActiveLate = Boolean(activeLateRes.data && activeLateRes.data.length > 0);
        const hasManualFine = Boolean(colRes.data && (colRes.data.manual_fine_amount || 0) > 0);
        const shouldBeFineStatus = hasActiveLate || hasManualFine;

        await auth.db.from('colleges').update({ fine_status: shouldBeFineStatus }).eq('affl_no', affl);
      }

      return NextResponse.json({ success: true, isWaived });
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
      const rawFineDeadline = body?.fineDeadline ?? null;

      const { data, error } = await auth.db
        .from('events')
        .update({
          reg_deadline: rawRegDeadline,
          fine_deadline: rawFineDeadline || rawRegDeadline,
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
