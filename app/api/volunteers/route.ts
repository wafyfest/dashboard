import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['admin', 'convenor', 'college'];

export async function POST(req: NextRequest) {
  const auth = await requireServerRole(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const action = body?.action as string;

    if (action === 'register') {
      const payload = body?.payload;
      if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ error: 'Invalid volunteer payload.' }, { status: 400 });
      }
      const targetAffl = Number(payload.college_affl_no);
      if (
        auth.role === 'college' &&
        (auth.collegeAfflNo === null || Number.isNaN(targetAffl) || Number(auth.collegeAfflNo) !== targetAffl)
      ) {
        return NextResponse.json(
          { error: 'Forbidden: you can only register volunteers for your own college.' },
          { status: 403 }
        );
      }

      const { data, error } = await auth.db
        .from('volunteers')
        .insert(payload)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'update') {
      const volunteerId = String(body?.volunteerId ?? '').trim();
      const updates = body?.updates;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!volunteerId || !uuidRegex.test(volunteerId) || !updates || typeof updates !== 'object') {
        return NextResponse.json({ error: 'Valid volunteer UUID and updates are required.' }, { status: 400 });
      }

      if (auth.role === 'college') {
        const { data: existing } = await auth.db
          .from('volunteers')
          .select('college_affl_no')
          .eq('id', volunteerId)
          .maybeSingle();
        if (
          !existing ||
          auth.collegeAfflNo === null ||
          Number(existing.college_affl_no) !== Number(auth.collegeAfflNo)
        ) {
          return NextResponse.json(
            { error: 'Forbidden: you can only update volunteers for your own college.' },
            { status: 403 }
          );
        }
      }

      const cleanUpdates: Record<string, unknown> = {
        updated_at: updates.updated_at || new Date().toISOString(),
      };
      if (updates.duty_preference !== undefined) cleanUpdates.duty_preference = updates.duty_preference;
      if (updates.phone !== undefined) cleanUpdates.phone = updates.phone;
      if (updates.tshirt_size !== undefined) cleanUpdates.tshirt_size = updates.tshirt_size;
      if (updates.notes !== undefined) cleanUpdates.notes = updates.notes;
      if (updates.status !== undefined && (auth.role === 'admin' || auth.role === 'convenor')) {
        cleanUpdates.status = updates.status;
      }

      const { error } = await auth.db.from('volunteers').update(cleanUpdates).eq('id', volunteerId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      const idOrStudentId = String(body?.idOrStudentId ?? '').trim();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!idOrStudentId || !uuidRegex.test(idOrStudentId)) {
        return NextResponse.json({ error: 'Valid volunteer UUID is required.' }, { status: 400 });
      }

      if (auth.role === 'college') {
        const { data: existing } = await auth.db
          .from('volunteers')
          .select('college_affl_no')
          .or(`id.eq.${idOrStudentId},student_id.eq.${idOrStudentId}`)
          .maybeSingle();
        if (
          !existing ||
          auth.collegeAfflNo === null ||
          Number(existing.college_affl_no) !== Number(auth.collegeAfflNo)
        ) {
          return NextResponse.json(
            { error: 'Forbidden: you can only delete volunteers for your own college.' },
            { status: 403 }
          );
        }
      }

      const { error } = await auth.db
        .from('volunteers')
        .delete()
        .or(`id.eq.${idOrStudentId},student_id.eq.${idOrStudentId}`);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
