import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string;

    if (action === 'allocate_chest_numbers') {
      const auth = await requireServerRole(['admin', 'convenor']);
      if (!auth.ok) return auth.response;

      const dbClient = (auth as any).sessionDb || auth.db;
      const { data, error } = await dbClient.rpc('allocate_numeric_chest_numbers', {
        p_only_registered: Boolean(body?.onlyRegistered),
        p_reset: Boolean(body?.reset),
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const row = Array.isArray(data) ? data[0] : data;
      return NextResponse.json({
        success: true,
        totalAssigned: Number(row?.total_assigned ?? 0),
        newlyAssigned: Number(row?.newly_assigned ?? 0),
        minChestNo: row?.min_chest_no != null ? Number(row.min_chest_no) : null,
        maxChestNo: row?.max_chest_no != null ? Number(row.max_chest_no) : null,
      });
    }

    const auth = await requireServerRole(['admin', 'college']);
    if (!auth.ok) return auth.response;

    const student = body?.student;
    if (!student || typeof student !== 'object') {
      return NextResponse.json({ error: 'Invalid student payload.' }, { status: 400 });
    }

    const targetAffl = Number(student.college_affl_no);
    if (
      auth.role === 'college' &&
      (auth.collegeAfflNo === null || Number.isNaN(targetAffl) || Number(auth.collegeAfflNo) !== targetAffl)
    ) {
      return NextResponse.json(
        { error: 'Forbidden: you can only manage students for your own college.' },
        { status: 403 }
      );
    }

    if (action === 'upsert') {
      if (auth.role === 'college' && student.id) {
        const { data: existing } = await auth.db
          .from('students')
          .select('college_affl_no')
          .eq('id', student.id)
          .maybeSingle();
        if (existing && Number(existing.college_affl_no) !== Number(auth.collegeAfflNo)) {
          return NextResponse.json(
            { error: 'Forbidden: cannot overwrite a student from another college.' },
            { status: 403 }
          );
        }
      }
      const { error } = await auth.db.from('students').upsert(student);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'insert') {
      const { error } = await auth.db.from('students').insert(student);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
