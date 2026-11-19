import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';
import { evaluateEventDeadlineSetting } from '@/lib/utils/istDate';
import { EventDeadlineSetting, isSpecialGroupEvent } from '@/lib/types/fest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['admin', 'convenor', 'college', 'stage_controller', 'result_entry'];

export async function GET(req: NextRequest) {
  const auth = await requireServerRole(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const collegeAfflNo = url.searchParams.get('collegeAfflNo');

    let query = auth.db.from('registrations').select('*').order('created_at', { ascending: true });
    if (auth.role === 'college') {
      if (!auth.collegeAfflNo) {
        return NextResponse.json({ error: 'No college affiliation associated with this account.' }, { status: 403 });
      }
      query = query.eq('college_affl_no', auth.collegeAfflNo);
    } else if (collegeAfflNo) {
      query = query.eq('college_affl_no', Number(collegeAfflNo));
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ registrations: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch registrations' }, { status: 500 });
  }
}

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

      // Submission-gated rule: qualification requires an uploaded submission/video link
      if (status === 'qualified') {
        const { data: targetRegs, error: fetchErr } = await auth.db
          .from('registrations')
          .select('id, item_id, college_affl_no, chest_no')
          .in('id', ids);

        if (fetchErr) {
          return NextResponse.json({ error: fetchErr.message }, { status: 500 });
        }

        if (targetRegs && targetRegs.length > 0) {
          for (const reg of targetRegs) {
            const { data: subEntry } = await auth.db
              .from('submission_entries')
              .select('id, file_url')
              .eq('item_id', reg.item_id)
              .or(`college_affl_no.eq.${reg.college_affl_no},chest_no.eq.${reg.chest_no}`)
              .not('file_url', 'is', null)
              .limit(1)
              .maybeSingle();

            let hasValidSub = Boolean(subEntry?.file_url && subEntry.file_url.trim());

            if (!hasValidSub) {
              const { data: evRow } = await auth.db
                .from('events')
                .select('id')
                .eq('item_id', reg.item_id)
                .maybeSingle();

              if (evRow?.id) {
                const { data: pfSub } = await auth.db
                  .from('prefest_submissions')
                  .select('id, youtube_url')
                  .eq('event_id', evRow.id)
                  .eq('college_affl_no', reg.college_affl_no)
                  .not('youtube_url', 'is', null)
                  .limit(1)
                  .maybeSingle();

                if (pfSub?.youtube_url && pfSub.youtube_url.trim()) {
                  hasValidSub = true;
                }
              }
            }

            if (!hasValidSub) {
              return NextResponse.json(
                {
                  error: 'Cannot qualify participant: A video or submission link has not been uploaded yet.',
                },
                { status: 400 }
              );
            }
          }
        }
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
    if (action === 'register' || action === 'unregister') {
      if (auth.role !== 'college') {
        return NextResponse.json(
          { error: 'Forbidden: only college representatives can register or unregister participants. Administrative registration is disabled.' },
          { status: 403 }
        );
      }
      if (auth.collegeAfflNo === null || Number(auth.collegeAfflNo) !== collegeAfflNo) {
        return NextResponse.json(
          { error: 'Forbidden: you can only manage registrations for your own college.' },
          { status: 403 }
        );
      }
      const [eventRes, settingsRes, collegeRes, cellRes, deadlineRes] = await Promise.all([
        auth.db.from('events').select('id, item_id, item_code, reg_deadline, fine_deadline, is_locked, is_screening, is_submission, mode, min_participants, max_participants, no_of_participants, name_eng, point_type, phase, category').eq('item_id', itemId).maybeSingle(),
        auth.db.from('fest_settings').select('reg_deadline, fine_deadline').limit(1).maybeSingle(),
        auth.db.from('colleges').select('id, affl_no, manual_lock_override').eq('affl_no', collegeAfflNo).maybeSingle(),
        auth.db.from('entry_locks').select('is_open, updated_at').eq('item_id', itemId).eq('college_affl_no', collegeAfflNo).maybeSingle(),
        auth.db.from('event_deadline_settings').select('*'),
      ]);

      if (eventRes.error) {
        return NextResponse.json({ error: `Database error querying event ${itemId}: ${eventRes.error.message}` }, { status: 500 });
      }
      if (!eventRes.data) {
        return NextResponse.json({ error: `Event ${itemId} not found.` }, { status: 404 });
      }
      if (collegeRes.error) {
        return NextResponse.json({ error: `Database error querying college ${collegeAfflNo}: ${collegeRes.error.message}` }, { status: 500 });
      }
      if (!collegeRes.data) {
        return NextResponse.json({ error: `College ${collegeAfflNo} not found.` }, { status: 404 });
      }

      const isScreening = Boolean(eventRes.data.is_screening || eventRes.data.mode === 'screening');
      const isSubmission = Boolean(eventRes.data.is_submission || eventRes.data.mode === 'submission');
      const isOnstage = eventRes.data.mode === 'onstage';
      const eventKind = isScreening ? 'screening' : isSubmission ? 'submission' : isOnstage ? 'onstage' : (eventRes.data.mode === 'offstage' ? 'offstage' : 'general');

      const dlList: EventDeadlineSetting[] = deadlineRes.data || [];
      const kindSetting = dlList.find(s => s.event_kind === eventKind) || dlList.find(s => s.event_kind === 'general');
      const activeSetting = kindSetting || {
        no_fine_deadline: eventRes.data.reg_deadline || settingsRes.data?.reg_deadline,
        fine_deadline: eventRes.data.fine_deadline || settingsRes.data?.fine_deadline
      };
      const deadlineEval = evaluateEventDeadlineSetting(activeSetting, new Date());

      // Cutoff time: after super_fine (or fine / no_fine) deadline has passed
      const cutoffIso = (activeSetting as any).super_fine_deadline || (activeSetting as any).fine_deadline || (activeSetting as any).no_fine_deadline;
      const cutoffMs = cutoffIso ? new Date(cutoffIso).getTime() : Infinity;
      const isPastDeadline = deadlineEval.tier === 'closed' || (cutoffMs !== Infinity && Date.now() > cutoffMs);

      const isCollegeUnlocked = Boolean(collegeRes.data?.manual_lock_override);
      const isCellExplicitlyClosed = cellRes.data?.is_open === false;
      const isItemLocked = Boolean(eventRes.data?.is_locked);

      if (auth.role === 'college') {
        if (!isCollegeUnlocked) {
          return NextResponse.json(
            {
              error: `Registration locked: Your institution (#${collegeAfflNo}) has been locked by fest administration.`,
            },
            { status: 403 }
          );
        }

        if (deadlineEval.tier === 'upcoming') {
          return NextResponse.json(
            {
              error: `Registration has not opened yet for event ${eventRes.data.item_code || itemId}.`,
            },
            { status: 403 }
          );
        }

        if (isCellExplicitlyClosed || isItemLocked) {
          return NextResponse.json(
            { error: `Registration locked: Event ${eventRes.data.item_code || itemId} is locked.` },
            { status: 403 }
          );
        }

        if ((activeSetting as any)?.is_active === false) {
          const kindLabel = eventKind === 'onstage' ? 'On-Stage' : eventKind === 'offstage' ? 'Off-Stage' : eventKind === 'screening' ? 'Screening' : eventKind === 'submission' ? 'Digital Submission' : 'General';
          return NextResponse.json(
            {
              error: `Registration disabled: Registrations for ${kindLabel} events are currently disabled by administration.`,
            },
            { status: 403 }
          );
        }

        if (isPastDeadline || !deadlineEval.canRegister) {
          return NextResponse.json(
            {
              error: `Registration locked: Deadline passed for event ${eventRes.data.item_code || itemId}.`,
            },
            { status: 403 }
          );
        }
      }

      const dbClient = (auth as any).sessionDb || auth.db;

      if (action === 'register') {
        let chestNos = Array.isArray(body?.chestNos)
          ? body.chestNos.map((c: unknown) => String(c ?? '').trim()).filter(Boolean)
          : [];

        const isSpecialGroup = isSpecialGroupEvent(eventRes.data);
        const isInstitutionalEntry = isSpecialGroup || chestNos.some((c: string) => c.startsWith('COL-') || c === 'COLLEGE');

        if (isInstitutionalEntry) {
          // For Special Group Events, register under the College institutional identifier
          chestNos = [`COL-${collegeAfflNo}`];
        } else {
          // Validate participant count against event min/max bounds for standard events
          const minReq = eventRes.data.min_participants ?? eventRes.data.no_of_participants ?? 1;
          const maxReq = eventRes.data.max_participants ?? eventRes.data.no_of_participants ?? (eventRes.data.no_of_participants == null ? 50 : 1);

          if (chestNos.length < minReq) {
            return NextResponse.json(
              { error: `Registration rejected: ${eventRes.data.name_eng || 'This event'} requires at least ${minReq} participants (submitted ${chestNos.length}).` },
              { status: 400 }
            );
          }

          if (chestNos.length > maxReq) {
            return NextResponse.json(
              { error: `Registration rejected: ${eventRes.data.name_eng || 'This event'} allows at most ${maxReq} participants (submitted ${chestNos.length}).` },
              { status: 400 }
            );
          }

          // Pre-validate against blocked_students
          if (chestNos.length > 0) {
            const { data: blockedList } = await auth.db
              .from('blocked_students')
              .select('student_id, cic_no, reason, students(name)')
              .eq('is_active', true)
              .eq('college_affl_no', collegeAfflNo);

            if (blockedList && blockedList.length > 0) {
              const numericLookups = chestNos
                .filter((c: string) => /^\d+$/.test(c))
                .map((c: string) => Number(c));

              for (const b of (blockedList as any[])) {
                const match = chestNos.some((cn: string) =>
                  cn === String(b.cic_no) ||
                  cn === b.student_id ||
                  cn === `ST-${b.cic_no}` ||
                  numericLookups.includes(Number(b.cic_no))
                );
                if (match) {
                  const studentName = (b.students as any)?.name || 'Participant';
                  return NextResponse.json(
                    { error: `Registration rejected: Student "${studentName}" (CIC: ${b.cic_no}) is blocked from festival participation (${b.reason}).` },
                    { status: 403 }
                  );
                }
              }
            }
          }
        }

        let dbRows: any = null;
        let rpcError: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          const res = await dbClient.rpc('register_college_for_item_tx', {
            p_item_id: itemId,
            p_college_affl_no: collegeAfflNo,
            p_chest_nos: chestNos,
          });
          dbRows = res.data;
          rpcError = res.error;
          if (
            rpcError &&
            attempt === 0 &&
            (rpcError.message?.includes('fetch failed') ||
              rpcError.code === 'PGRST000' ||
              rpcError.code === '57P01')
          ) {
            await new Promise(r => setTimeout(r, 250));
            continue;
          }
          break;
        }

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
                college_id: collegeRes.data.id,
                college_affl_no: collegeAfflNo,
                event_id: (eventRes.data as any).id,
                event_type: eventType,
                registration_status: 'registered',
              },
              { onConflict: 'college_id,event_id' }
            );
          } catch (pfErr) {
            console.warn('Pre-fest registration sync notice:', pfErr);
          }
        }

        return NextResponse.json({
          success: true,
          rows: dbRows ?? [],
          deadlineTier: deadlineEval.tier,
          fineAmount: deadlineEval.fineAmount,
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
