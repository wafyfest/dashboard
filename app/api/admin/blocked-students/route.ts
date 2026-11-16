import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireServerRole(['admin', 'convenor', 'college']);
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const collegeAfflNo = url.searchParams.get('collegeAfflNo');

    let query = auth.db
      .from('blocked_students')
      .select(`
        id,
        student_id,
        cic_no,
        college_affl_no,
        reason,
        notes,
        is_active,
        blocked_by,
        blocked_at,
        created_at,
        updated_at,
        students!student_id (
          id,
          name,
          cic_no,
          college_affl_no,
          class,
          phase,
          phone,
          photo_url
        ),
        colleges!college_affl_no (
          id,
          name,
          affl_no
        )
      `)
      .eq('is_active', true)
      .order('blocked_at', { ascending: false });

    if (auth.role === 'college') {
      if (!auth.collegeAfflNo) {
        return NextResponse.json({ error: 'No college affiliation found' }, { status: 403 });
      }
      query = query.eq('college_affl_no', auth.collegeAfflNo);
    } else if (collegeAfflNo) {
      query = query.eq('college_affl_no', Number(collegeAfflNo));
    }

    const { data, error } = await query;
    if (error) {
      console.error('[API /api/admin/blocked-students GET Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (data || []).map((row: any) => ({
      ...row,
      student: row.students,
      college: row.colleges,
    }));

    return NextResponse.json({ blockedStudents: formatted });
  } catch (err: unknown) {
    console.error('[API /api/admin/blocked-students Uncaught Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireServerRole(['admin', 'convenor']);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const action = String(body?.action || '').trim();

    // ------------------------------------------------------------------------
    // ACTION: block
    // ------------------------------------------------------------------------
    if (action === 'block') {
      const studentId = String(body?.student_id || '').trim();
      const reason = String(body?.reason || '').trim();
      const notes = body?.notes ? String(body.notes).trim() : null;

      if (!studentId || !reason) {
        return NextResponse.json(
          { error: 'Both student_id and reason are required.' },
          { status: 400 }
        );
      }

      // Fetch student to get cic_no and college_affl_no
      const { data: student, error: stuErr } = await auth.db
        .from('students')
        .select('id, name, cic_no, college_affl_no')
        .eq('id', studentId)
        .single();

      if (stuErr || !student) {
        return NextResponse.json(
          { error: `Student not found: ${stuErr?.message || 'Invalid ID'}` },
          { status: 404 }
        );
      }

      const blockedBy = (auth as any).user?.email || auth.role || 'Admin';
      const nowIso = new Date().toISOString();

      const { data: upserted, error: blockErr } = await auth.db
        .from('blocked_students')
        .upsert(
          {
            student_id: student.id,
            cic_no: student.cic_no,
            college_affl_no: student.college_affl_no,
            reason,
            notes,
            is_active: true,
            blocked_by: blockedBy,
            blocked_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: 'student_id' }
        )
        .select()
        .single();

      if (blockErr) {
        return NextResponse.json({ error: blockErr.message }, { status: 500 });
      }

      // Log to system audit logs
      try {
        await auth.db.from('system_audit_logs').insert({
          action_type: 'STUDENT_BLOCKED',
          category: 'REGISTRATION',
          severity: 'warning',
          actor_role: auth.role,
          actor_name: blockedBy,
          college_affl_no: student.college_affl_no,
          target_id: student.id,
          description: `Blocked student "${student.name}" (CIC: ${student.cic_no}, College: #${student.college_affl_no}). Reason: ${reason}. Notes: ${notes || 'None'}.`,
        });
      } catch (logErr) {
        console.warn('Notice: Audit log failed for student block:', logErr);
      }

      return NextResponse.json({ success: true, data: upserted });
    }

    // ------------------------------------------------------------------------
    // ACTION: unblock
    // ------------------------------------------------------------------------
    if (action === 'unblock') {
      const studentId = String(body?.student_id || '').trim();
      if (!studentId) {
        return NextResponse.json({ error: 'student_id is required.' }, { status: 400 });
      }

      // Fetch student details for audit log before deletion
      const { data: existing } = await auth.db
        .from('blocked_students')
        .select('id, student_id, cic_no, college_affl_no, reason')
        .eq('student_id', studentId)
        .maybeSingle();

      const { error: delErr } = await auth.db
        .from('blocked_students')
        .delete()
        .eq('student_id', studentId);

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }

      if (existing) {
        try {
          await auth.db.from('system_audit_logs').insert({
            action_type: 'STUDENT_UNBLOCKED',
            category: 'REGISTRATION',
            severity: 'info',
            actor_role: auth.role,
            actor_name: (auth as any).user?.email || auth.role || 'Admin',
            college_affl_no: existing.college_affl_no,
            target_id: studentId,
            description: `Unblocked student (CIC: ${existing.cic_no}, College: #${existing.college_affl_no}). Previously blocked for: ${existing.reason}.`,
          });
        } catch (logErr) {
          console.warn('Notice: Audit log failed for student unblock:', logErr);
        }
      }

      return NextResponse.json({ success: true });
    }

    // ------------------------------------------------------------------------
    // ACTION: update
    // ------------------------------------------------------------------------
    if (action === 'update') {
      const studentId = String(body?.student_id || '').trim();
      const reason = String(body?.reason || '').trim();
      const notes = body?.notes !== undefined ? String(body.notes).trim() : undefined;

      if (!studentId || !reason) {
        return NextResponse.json(
          { error: 'Both student_id and reason are required.' },
          { status: 400 }
        );
      }

      const updatePayload: Record<string, unknown> = {
        reason,
        updated_at: new Date().toISOString(),
      };
      if (notes !== undefined) {
        updatePayload.notes = notes;
      }

      const { error: upErr } = await auth.db
        .from('blocked_students')
        .update(updatePayload)
        .eq('student_id', studentId);

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
