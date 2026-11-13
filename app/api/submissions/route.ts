import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string;

    if (action === 'review_appeal' || action === 'review_replacement') {
      const auth = await requireServerRole(['admin']);
      if (!auth.ok) return auth.response;

      if (action === 'review_appeal') {
        const appealId = String(body?.appealId ?? '').trim();
        if (!appealId) return NextResponse.json({ error: 'appealId is required.' }, { status: 400 });
        const { error } = await auth.db
          .from('appeals')
          .update({ current_status: body?.status, admin_remarks: body?.remarks ?? '' })
          .eq('id', appealId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      const repId = String(body?.repId ?? '').trim();
      if (!repId) return NextResponse.json({ error: 'repId is required.' }, { status: 400 });
      const dbClient = (auth as any).sessionDb || auth.db;
      const { error } = await dbClient.rpc('review_replacement_tx', {
        p_replacement_id: repId,
        p_status: body?.status,
        p_remarks: body?.remarks ?? null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    const auth = await requireServerRole(['admin', 'convenor', 'college']);
    if (!auth.ok) return auth.response;

    if (action === 'submit_appeal') {
      const payload = body?.payload;
      if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ error: 'Invalid appeal payload.' }, { status: 400 });
      }
      const targetAffl = Number(payload.college_affl_no);
      if (
        auth.role === 'college' &&
        (auth.collegeAfflNo === null || Number.isNaN(targetAffl) || Number(auth.collegeAfflNo) !== targetAffl)
      ) {
        return NextResponse.json(
          { error: 'Forbidden: you can only submit appeals for your own college.' },
          { status: 403 }
        );
      }
      const { error } = await auth.db.from('appeals').insert(payload);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'submit_replacement') {
      const payload = body?.payload;
      if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ error: 'Invalid replacement payload.' }, { status: 400 });
      }

      if (auth.role === 'college') {
        if (auth.collegeAfflNo === null) {
          return NextResponse.json({ error: 'Forbidden: college affiliation not found.' }, { status: 403 });
        }
        const origId = String(payload.original_student_id ?? '').trim();
        const repId = String(payload.replacement_student_id ?? '').trim();
        if (!origId || !repId) {
          return NextResponse.json({ error: 'Original and replacement student IDs are required.' }, { status: 400 });
        }
        const { data: studentRows } = await auth.db
          .from('students')
          .select('id, college_affl_no')
          .in('id', [origId, repId]);
        const ownsBoth =
          Array.isArray(studentRows) &&
          studentRows.length === 2 &&
          studentRows.every((s: { college_affl_no: number }) => Number(s.college_affl_no) === Number(auth.collegeAfflNo));
        if (!ownsBoth) {
          return NextResponse.json(
            { error: 'Forbidden: replacement students must belong to your own college.' },
            { status: 403 }
          );
        }
        if (payload.registration_id) {
          const { data: regRow } = await auth.db
            .from('registrations')
            .select('college_affl_no')
            .eq('id', payload.registration_id)
            .maybeSingle();
          if (!regRow || Number(regRow.college_affl_no) !== Number(auth.collegeAfflNo)) {
            return NextResponse.json(
              { error: 'Forbidden: registration does not belong to your college.' },
              { status: 403 }
            );
          }
        }
      }

      const cleanReplacement = {
        registration_id: payload.registration_id ?? null,
        original_student_id: payload.original_student_id,
        replacement_student_id: payload.replacement_student_id,
        reason: payload.reason,
        status: 'Pending',
      };

      const { data, error } = await auth.db
        .from('replacements')
        .insert(cleanReplacement)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'upsert_entry_link') {
      const collegeAfflNo = Number(body?.collegeAfflNo);
      const itemId = Number(body?.itemId);
      const chestNo = String(body?.chestNo ?? '').trim();
      const status = String(body?.status ?? 'pending');
      const fileUrl = String(body?.fileUrl ?? '').trim();
      const nowIso = String(body?.nowIso || new Date().toISOString());
      const isGroupEvent = Boolean(body?.isGroupEvent);

      if (!collegeAfflNo || Number.isNaN(collegeAfflNo) || !itemId || Number.isNaN(itemId) || !chestNo || !fileUrl) {
        return NextResponse.json({ error: 'Invalid submission link payload.' }, { status: 400 });
      }

      if (
        auth.role === 'college' &&
        (auth.collegeAfflNo === null || Number(auth.collegeAfflNo) !== collegeAfflNo)
      ) {
        return NextResponse.json(
          { error: 'Forbidden: you can only submit links for your own college.' },
          { status: 403 }
        );
      }

      let { data, error } = await auth.db
        .from('submission_entries')
        .upsert(
          {
            college_affl_no: collegeAfflNo,
            chest_no: chestNo,
            item_id: itemId,
            status,
            file_url: fileUrl,
            submitted_at: nowIso,
          },
          { onConflict: 'item_id,chest_no' }
        )
        .select()
        .single();

      if (error && (error.code === '42P10' || /no unique or exclusion constraint/i.test(error.message))) {
        const { data: existingRow, error: lookupErr } = await auth.db
          .from('submission_entries')
          .select('id')
          .eq('item_id', itemId)
          .eq('chest_no', chestNo)
          .maybeSingle();

        if (lookupErr) {
          error = lookupErr;
          data = null;
        } else if (existingRow?.id) {
          const updateRes = await auth.db
            .from('submission_entries')
            .update({
              college_affl_no: collegeAfflNo,
              status,
              file_url: fileUrl,
              submitted_at: nowIso,
            })
            .eq('id', existingRow.id)
            .select()
            .single();
          data = updateRes.data;
          error = updateRes.error;
        } else {
          const insertRes = await auth.db
            .from('submission_entries')
            .insert({
              college_affl_no: collegeAfflNo,
              chest_no: chestNo,
              item_id: itemId,
              status,
              file_url: fileUrl,
              submitted_at: nowIso,
            })
            .select()
            .single();
          data = insertRes.data;
          error = insertRes.error;
        }
      }

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      if (data && isGroupEvent) {
        await auth.db
          .from('submission_entries')
          .delete()
          .eq('item_id', itemId)
          .eq('college_affl_no', collegeAfflNo)
          .neq('chest_no', data.chest_no);
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
