import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['admin'];

export async function POST(req: NextRequest) {
  const auth = await requireServerRole(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const action = body?.action as string;
    const now = new Date().toISOString();

    if (action === 'set_cell') {
      const itemId = Number(body?.itemId);
      const collegeAfflNo = Number(body?.collegeAfflNo);
      const isOpen = Boolean(body?.isOpen);

      if (!itemId || Number.isNaN(itemId) || !collegeAfflNo || Number.isNaN(collegeAfflNo)) {
        return NextResponse.json({ error: 'Valid itemId and collegeAfflNo are required.' }, { status: 400 });
      }

      const { error } = await auth.db.from('entry_locks').upsert(
        {
          item_id: itemId,
          college_affl_no: collegeAfflNo,
          is_open: isOpen,
          updated_at: now,
        },
        { onConflict: 'item_id,college_affl_no' }
      );

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'set_row') {
      const itemId = Number(body?.itemId);
      const isOpen = Boolean(body?.isOpen);
      const rows = Array.isArray(body?.rows) ? body.rows : [];

      if (!itemId || Number.isNaN(itemId)) {
        return NextResponse.json({ error: 'Valid itemId is required.' }, { status: 400 });
      }

      if (rows.length > 0) {
        const cleanRows = rows.map((r: Record<string, unknown>) => ({
          item_id: itemId,
          college_affl_no: Number(r.college_affl_no),
          is_open: isOpen,
          updated_at: now,
        }));

        const [lockRes, evtRes] = await Promise.all([
          auth.db.from('entry_locks').upsert(cleanRows, { onConflict: 'item_id,college_affl_no' }),
          auth.db.from('events').update({ is_locked: !isOpen }).eq('item_id', itemId),
        ]);

        if (lockRes.error) return NextResponse.json({ error: lockRes.error.message }, { status: 500 });
        if (evtRes.error) return NextResponse.json({ error: evtRes.error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'set_all') {
      const isOpen = Boolean(body?.isOpen);
      const rows = Array.isArray(body?.rows) ? body.rows : [];

      if (rows.length > 0) {
        const cleanRows = rows.map((r: Record<string, unknown>) => ({
          item_id: Number(r.item_id),
          college_affl_no: Number(r.college_affl_no),
          is_open: isOpen,
          updated_at: now,
        }));

        const CHUNK_SIZE = 1000;
        const lockChunks: PromiseLike<{ error: { message: string } | null }>[] = [];
        for (let i = 0; i < cleanRows.length; i += CHUNK_SIZE) {
          lockChunks.push(
            auth.db
              .from('entry_locks')
              .upsert(cleanRows.slice(i, i + CHUNK_SIZE), { onConflict: 'item_id,college_affl_no' })
          );
        }

        const [evtRes, ...lockResults] = await Promise.all([
          auth.db.from('events').update({ is_locked: !isOpen }).gte('item_id', 0),
          ...lockChunks,
        ]);

        const lockErr = lockResults.find(r => r.error)?.error;
        if (lockErr) return NextResponse.json({ error: lockErr.message }, { status: 500 });
        if (evtRes.error) return NextResponse.json({ error: evtRes.error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'revoke_all_college_overrides') {
      const afflNos = Array.isArray(body?.afflNos)
        ? body.afflNos.map((n: unknown) => Number(n)).filter((n: number) => !Number.isNaN(n))
        : [];

      if (afflNos.length > 0) {
        const { error } = await auth.db
          .from('colleges')
          .update({ manual_lock_override: false })
          .in('affl_no', afflNos);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // ─── Decoupled Link Submission Locks ─────────────────────────────────────────

    if (action === 'set_link_cell') {
      const itemId = Number(body?.itemId);
      const collegeAfflNo = Number(body?.collegeAfflNo);
      // isLinkOpen can be true (explicit open), false (explicit lock), or null (inherit default)
      const isLinkOpen = body?.isLinkOpen === null || body?.isLinkOpen === undefined
        ? null
        : Boolean(body?.isLinkOpen);

      if (!itemId || Number.isNaN(itemId) || !collegeAfflNo || Number.isNaN(collegeAfflNo)) {
        return NextResponse.json({ error: 'Valid itemId and collegeAfflNo are required.' }, { status: 400 });
      }

      const { error } = await auth.db.from('entry_locks').upsert(
        {
          item_id: itemId,
          college_affl_no: collegeAfflNo,
          is_link_open: isLinkOpen,
          updated_at: now,
        },
        { onConflict: 'item_id,college_affl_no' }
      );

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'set_link_row') {
      const itemId = Number(body?.itemId);
      const isLinkLocked = Boolean(body?.isLinkLocked);

      if (!itemId || Number.isNaN(itemId)) {
        return NextResponse.json({ error: 'Valid itemId is required.' }, { status: 400 });
      }

      const { error } = await auth.db
        .from('events')
        .update({ is_link_locked: isLinkLocked, updated_at: now })
        .eq('item_id', itemId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'set_link_all') {
      const isLinkLocked = Boolean(body?.isLinkLocked);
      const section = body?.section as string | undefined;

      let query = auth.db.from('events').update({ is_link_locked: isLinkLocked, updated_at: now });
      if (section === 'SCREENING') {
        query = query.or('is_screening.eq.true,mode.eq.screening');
      } else if (section === 'SUBMISSION') {
        query = query.or('is_submission.eq.true,mode.eq.submission');
      } else {
        query = query.or('is_screening.eq.true,is_submission.eq.true,mode.eq.submission,mode.eq.screening');
      }

      const { error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'set_link_category') {
      const eventType = body?.eventType as string; // 'SCREENING' | 'SUBMISSION'
      const enabled = Boolean(body?.enabled);

      if (!eventType) {
        return NextResponse.json({ error: 'eventType is required.' }, { status: 400 });
      }

      const { error } = await auth.db
        .from('prefest_registration_settings')
        .update({ youtube_submission_enabled: enabled, updated_at: now })
        .eq('event_type', eventType);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
