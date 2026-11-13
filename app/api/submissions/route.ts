import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';
import { isValidYouTubeUrl } from '@/lib/utils/youtube';

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
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json({ error: 'Invalid request body: Expected JSON object.' }, { status: 400 });
      }

      const payload = body.payload;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return NextResponse.json({ error: 'Invalid appeal payload: Expected JSON object.' }, { status: 400 });
      }

      // Enforce college affiliation from authenticated server context for college users
      let targetAffl = Number(payload.college_affl_no);
      if (auth.role === 'college') {
        if (auth.collegeAfflNo === null || Number.isNaN(Number(auth.collegeAfflNo))) {
          return NextResponse.json({ error: 'Forbidden: College affiliation context missing.' }, { status: 403 });
        }
        targetAffl = Number(auth.collegeAfflNo);
      } else if (auth.role === 'admin') {
        if (Number.isNaN(targetAffl) || !Number.isInteger(targetAffl) || targetAffl <= 0) {
          return NextResponse.json({ error: 'Invalid target college affiliation number.' }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden: Unauthorized role.' }, { status: 403 });
      }

      // Validate mandatory fields
      const reason = typeof payload.reason_for_appeal === 'string' ? payload.reason_for_appeal.trim() : '';
      const txNo = typeof payload.transaction_number === 'string' ? payload.transaction_number.trim() : '';
      const tmName = typeof payload.team_manager_name === 'string' ? payload.team_manager_name.trim() : '';
      const mobile = typeof payload.mobile_number === 'string' ? payload.mobile_number.trim() : '';
      const phase = typeof payload.phase === 'string' ? payload.phase.trim() : '';

      if (!reason || reason.length > 2000) {
        return NextResponse.json({ error: 'Reason for appeal is required (max 2000 characters).' }, { status: 400 });
      }
      if (!txNo || txNo.length > 100) {
        return NextResponse.json({ error: 'Transaction number is required (max 100 characters).' }, { status: 400 });
      }
      if (!tmName || tmName.length > 200) {
        return NextResponse.json({ error: 'Team manager name is required (max 200 characters).' }, { status: 400 });
      }
      if (!mobile || !/^\+?[0-9\s\-]{7,20}$/.test(mobile)) {
        return NextResponse.json({ error: 'Valid contact mobile number is required.' }, { status: 400 });
      }
      if (!phase || phase.length > 50) {
        return NextResponse.json({ error: 'Phase is required.' }, { status: 400 });
      }

      // Strict boolean acknowledgment check (rejects strings 'true', numbers, null)
      if (payload.acknowledgment !== true) {
        return NextResponse.json({ error: 'Acknowledgment must be explicitly accepted (boolean true).' }, { status: 400 });
      }

      // Validate optional numeric item_id
      const itemId = payload.item_id !== undefined && payload.item_id !== null ? Number(payload.item_id) : null;
      if (itemId !== null && (!Number.isInteger(itemId) || itemId <= 0)) {
        return NextResponse.json({ error: 'Invalid event item_id.' }, { status: 400 });
      }

      const chestNo = typeof payload.chest_no === 'string' ? payload.chest_no.trim().slice(0, 50) : null;
      const codeLetter = typeof payload.code_letter === 'string' ? payload.code_letter.trim().slice(0, 2) : null;
      const appealDesc = typeof payload.appeal_description === 'string' ? payload.appeal_description.trim().slice(0, 5000) : null;

      // Validate receipt ownership and expected private storage object path
      let feeReceiptUrl: string | null = null;
      if (payload.fee_receipt_url) {
        if (typeof payload.fee_receipt_url !== 'string') {
          return NextResponse.json({ error: 'Invalid fee_receipt_url format.' }, { status: 400 });
        }
        const cleanUrl = payload.fee_receipt_url.trim();
        const expectedPrefix = `${targetAffl}/`;
        const containsExpectedFolder = cleanUrl.includes(`/fest-receipts/${expectedPrefix}`) || cleanUrl.startsWith(expectedPrefix);
        if (!containsExpectedFolder && cleanUrl.startsWith('http')) {
          return NextResponse.json(
            { error: `Invalid fee receipt path: Receipt must reside in college ${targetAffl} private folder.` },
            { status: 403 }
          );
        }
        feeReceiptUrl = cleanUrl.slice(0, 1000);
      }

      // Verify registration relationship if chest_no and item_id are provided
      if (itemId !== null && chestNo !== null) {
        const { data: regMatch } = await auth.db
          .from('registrations')
          .select('id')
          .eq('item_id', itemId)
          .eq('college_affl_no', targetAffl)
          .eq('chest_no', chestNo)
          .maybeSingle();

        if (!regMatch) {
          return NextResponse.json(
            { error: `Registration record for event ${itemId} and participant ${chestNo} not found for your college.` },
            { status: 404 }
          );
        }
      }

      // Enforce server-side whitelist: Forces 'Pending' status and rejects client-provided status/remarks
      const cleanAppeal = {
        college_affl_no: targetAffl,
        phase,
        item_id: itemId,
        chest_no: chestNo,
        code_letter: codeLetter,
        appeal_description: appealDesc,
        reason_for_appeal: reason,
        transaction_number: txNo,
        fee_receipt_url: feeReceiptUrl,
        team_manager_name: tmName,
        mobile_number: mobile,
        acknowledgment: true,
        current_status: 'Pending', // Enforced server-side
        admin_remarks: null        // Enforced server-side
      };

      const { data: insertedAppeal, error: insertError } = await auth.db
        .from('appeals')
        .insert(cleanAppeal)
        .select('id, college_affl_no, item_id, phase, current_status, created_at')
        .single();

      if (insertError) {
        console.error('[API /api/submissions] Appeal insertion error:', insertError.message);
        return NextResponse.json({ error: 'Failed to record appeal. Please try again.' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        appeal: insertedAppeal
      });
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

      // Keep prefest_submissions in sync if video URL is a valid YouTube link
      if (isValidYouTubeUrl(fileUrl)) {
        try {
          const { data: pfEvent } = await auth.db
            .from('events')
            .select('id, is_screening, is_submission, mode')
            .eq('item_id', itemId)
            .maybeSingle();

          if (
            pfEvent &&
            (pfEvent.is_screening ||
              pfEvent.is_submission ||
              (pfEvent as any).mode === 'screening' ||
              (pfEvent as any).mode === 'submission')
          ) {
            const { data: pfReg } = await auth.db
              .from('prefest_registrations')
              .select('id')
              .eq('college_affl_no', collegeAfflNo)
              .eq('event_id', pfEvent.id)
              .maybeSingle();

            if (pfReg?.id) {
              await auth.db.from('prefest_submissions').upsert(
                {
                  registration_id: pfReg.id,
                  college_id: `col-${collegeAfflNo}`,
                  college_affl_no: collegeAfflNo,
                  event_id: pfEvent.id,
                  youtube_url: fileUrl,
                  submission_status: status === 'fine' ? 'fine' : status === 'late' ? 'late' : 'submitted',
                  submitted_at: nowIso,
                  updated_at: new Date().toISOString()
                },
                { onConflict: 'registration_id' }
              );
            }
          }
        } catch (pfErr) {
          console.warn('Notice: prefest_submissions mirror sync deferred:', pfErr);
        }
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
