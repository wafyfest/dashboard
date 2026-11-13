import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';
import { evaluateDeadlineTierAtTime } from '@/lib/utils/istDate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['admin', 'convenor', 'college'];

export async function POST(req: NextRequest) {
  const auth = await requireServerRole(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const action = body?.action as string;

    if (action === 'update_screening') {
      if (auth.role !== 'admin' && auth.role !== 'convenor') {
        return NextResponse.json(
          { error: 'Forbidden: only admin/convenor can update screening status.' },
          { status: 403 }
        );
      }

      const ids = Array.isArray(body?.ids)
        ? body.ids.map((id: unknown) => String(id ?? '').trim()).filter(Boolean)
        : [];
      const status = body?.status;

      if (ids.length === 0 || !status) {
        return NextResponse.json({ error: 'Valid ids and status are required.' }, { status: 400 });
      }

      const updatePayload: Record<string, unknown> = {
        screening_status: status,
        screening_updated_at: body?.nowIso || new Date().toISOString(),
      };
      if (body?.remarks !== undefined) {
        updatePayload.screening_remarks = body.remarks;
      }

      const { error } = await auth.db
        .from('registrations')
        .update(updatePayload)
        .in('id', ids);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'clear_all') {
      const targetAffl = body?.collegeAfflNo !== undefined && body?.collegeAfflNo !== null
        ? Number(body.collegeAfflNo)
        : null;

      if (targetAffl !== null && Number.isNaN(targetAffl)) {
        return NextResponse.json({ error: 'Invalid collegeAfflNo.' }, { status: 400 });
      }

      if (targetAffl === null) {
        if (auth.role !== 'admin') {
          return NextResponse.json(
            { error: 'Forbidden: only admin can clear all registrations.' },
            { status: 403 }
          );
        }
        const results = await Promise.all([
          auth.db.from('registrations').delete().gte('college_affl_no', 0),
          auth.db.from('late_registrations').delete().gte('college_affl_no', 0),
          auth.db.from('submission_entries').delete().gte('college_affl_no', 0),
        ]);
        const err = results.find(r => r.error)?.error;
        if (err) return NextResponse.json({ error: err.message }, { status: 500 });
      } else {
        if (auth.role !== 'admin') {
          if (
            auth.role !== 'college' ||
            auth.collegeAfflNo === null ||
            Number(auth.collegeAfflNo) !== targetAffl
          ) {
            return NextResponse.json(
              { error: 'Forbidden: you can only clear registrations for your own college.' },
              { status: 403 }
            );
          }
        }
        const results = await Promise.all([
          auth.db.from('registrations').delete().eq('college_affl_no', targetAffl),
          auth.db.from('late_registrations').delete().eq('college_affl_no', targetAffl),
          auth.db.from('submission_entries').delete().eq('college_affl_no', targetAffl),
        ]);
        const err = results.find(r => r.error)?.error;
        if (err) return NextResponse.json({ error: err.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    const itemId = Number(body?.itemId);
    const collegeAfflNo = Number(body?.collegeAfflNo);

    if (!itemId || Number.isNaN(itemId) || !collegeAfflNo || Number.isNaN(collegeAfflNo)) {
      return NextResponse.json(
        { error: 'Valid itemId and collegeAfflNo are required.' },
        { status: 400 }
      );
    }

    // Enforce college ownership: a college user may only modify its own registrations
    if (
      auth.role === 'college' &&
      (auth.collegeAfflNo === null || Number(auth.collegeAfflNo) !== collegeAfflNo)
    ) {
      return NextResponse.json(
        { error: 'Forbidden: you can only manage registrations for your own college.' },
        { status: 403 }
      );
    }

    if (action === 'register' || action === 'unregister') {
      if (auth.role !== 'admin' && auth.role !== 'college') {
        return NextResponse.json(
          { error: 'Forbidden: only college users or admin can register or unregister entries.' },
          { status: 403 }
        );
      }
      const [eventRes, settingsRes, collegeRes, cellRes] = await Promise.all([
        auth.db.from('events').select('id, item_id, item_code, reg_deadline, is_locked, is_screening, is_submission, mode').eq('item_id', itemId).maybeSingle(),
        auth.db.from('fest_settings').select('reg_deadline').limit(1).maybeSingle(),
        auth.db.from('colleges').select('affl_no, manual_lock_override').eq('affl_no', collegeAfflNo).maybeSingle(),
        auth.db.from('entry_locks').select('is_open').eq('item_id', itemId).eq('college_affl_no', collegeAfflNo).maybeSingle(),
      ]);

      if (eventRes.error || !eventRes.data) {
        return NextResponse.json({ error: `Event ${itemId} not found.` }, { status: 404 });
      }
      if (collegeRes.error || !collegeRes.data) {
        return NextResponse.json({ error: `College ${collegeAfflNo} not found.` }, { status: 404 });
      }

      const effectiveRegDeadline = eventRes.data.reg_deadline || settingsRes.data?.reg_deadline || null;
      const tierInfo = evaluateDeadlineTierAtTime(effectiveRegDeadline, new Date());

      if (auth.role === 'college') {
        if (tierInfo.tier === 'closed') {
          return NextResponse.json(
            {
              error: `Registration completely locked for event ${eventRes.data.item_code || itemId}: normal, ₹500 fine (1h), and ₹1,000 super fine (2h) periods have ended.`,
            },
            { status: 403 }
          );
        }

        if (!collegeRes.data.manual_lock_override) {
          if (eventRes.data.is_locked) {
            return NextResponse.json(
              { error: `Registration closed: Event ${eventRes.data.item_code || itemId} is locked by fest administration.` },
              { status: 403 }
            );
          }
          if (cellRes.data && !cellRes.data.is_open) {
            return NextResponse.json(
              { error: `Registration closed: Registration for event ${eventRes.data.item_code || itemId} is locked for your institution.` },
              { status: 403 }
            );
          }
        }
      }

      const dbClient = (auth as any).sessionDb || auth.db;

      if (action === 'register') {
        const chestNos = Array.isArray(body?.chestNos)
          ? body.chestNos.map((c: unknown) => String(c ?? '').trim()).filter(Boolean)
          : [];

        const { data: dbRows, error: rpcError } = await dbClient.rpc('register_college_for_item_tx', {
          p_item_id: itemId,
          p_college_affl_no: collegeAfflNo,
          p_chest_nos: chestNos,
        });

        if (rpcError) {
          return NextResponse.json(
            { error: `Database Transaction Error (${rpcError.code || 'FAIL'}): ${rpcError.message}` },
            { status: 500 }
          );
        }

        // Keep prefest_registrations in sync for Screening and Submission events
        if (
          eventRes.data.is_screening ||
          eventRes.data.is_submission ||
          (eventRes.data as any).mode === 'screening' ||
          (eventRes.data as any).mode === 'submission'
        ) {
          const eventType =
            eventRes.data.is_screening || (eventRes.data as any).mode === 'screening'
              ? 'SCREENING'
              : 'SUBMISSION';
          try {
            await auth.db.from('prefest_registrations').upsert(
              {
                college_id: `col-${collegeAfflNo}`,
                college_affl_no: collegeAfflNo,
                event_id: (eventRes.data as any).id,
                event_type: eventType,
                registration_status: 'registered',
              },
              { onConflict: 'college_affl_no,event_id' }
            );
          } catch (pfErr) {
            console.warn('Pre-fest registration sync notice:', pfErr);
          }
        }

        return NextResponse.json({
          success: true,
          rows: dbRows ?? [],
          deadlineTier: tierInfo.tier,
          fineAmount: tierInfo.fineAmount,
        });
      }

      const { error: rpcError } = await dbClient.rpc('register_college_for_item_tx', {
        p_item_id: itemId,
        p_college_affl_no: collegeAfflNo,
        p_chest_nos: [],
      });

      if (rpcError) {
        return NextResponse.json(
          { error: `Database Transaction Error: ${rpcError.message}` },
          { status: 500 }
        );
      }

      const results = await Promise.all([
        auth.db.from('late_registrations').delete().match({ item_id: itemId, college_affl_no: collegeAfflNo }),
        auth.db.from('submission_entries').delete().match({ item_id: itemId, college_affl_no: collegeAfflNo }),
        (eventRes.data.is_screening || eventRes.data.is_submission || (eventRes.data as any).mode === 'screening' || (eventRes.data as any).mode === 'submission')
          ? auth.db.from('prefest_registrations').delete().match({ college_affl_no: collegeAfflNo, event_id: (eventRes.data as any).id })
          : Promise.resolve({ error: null }),
      ]);
      const err = results.find(r => r.error)?.error;
      if (err) return NextResponse.json({ error: err.message }, { status: 500 });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
