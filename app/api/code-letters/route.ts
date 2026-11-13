import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['admin', 'stage_controller'];

export async function POST(req: NextRequest) {
  const auth = await requireServerRole(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const action = body?.action as string;
    const itemId = Number(body?.itemId);

    if (!itemId || Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Valid itemId is required.' }, { status: 400 });
    }

    if (action === 'assign') {
      const chestNo = String(body?.chestNo ?? '').trim().toUpperCase();
      const collegeAfflNo = Number(body?.collegeAfflNo);
      const codeLetter = String(body?.codeLetter ?? '').trim();

      if (!chestNo || !codeLetter || Number.isNaN(collegeAfflNo)) {
        return NextResponse.json({ error: 'Invalid code letter assignment payload.' }, { status: 400 });
      }

      const { error: delErr } = await auth.db
        .from('code_letters')
        .delete()
        .match({ item_id: itemId, chest_no: chestNo });

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }

      const { error: insErr } = await auth.db.from('code_letters').insert({
        item_id: itemId,
        college_affl_no: collegeAfflNo,
        chest_no: chestNo,
        code_letter: codeLetter,
      });

      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }

      const { error: updErr } = await auth.db
        .from('registrations')
        .update({ code_letter: codeLetter })
        .match({ item_id: itemId, chest_no: chestNo });

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'randomize_all') {
      const entries = Array.isArray(body?.entries) ? body.entries : [];

      const { error: delErr } = await auth.db
        .from('code_letters')
        .delete()
        .eq('item_id', itemId);

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }

      if (entries.length > 0) {
        const cleanEntries = entries.map((e: Record<string, unknown>) => ({
          item_id: itemId,
          college_affl_no: Number(e.college_affl_no),
          chest_no: String(e.chest_no ?? '').trim().toUpperCase(),
          code_letter: String(e.code_letter ?? '').trim(),
        }));

        const { error: insErr } = await auth.db.from('code_letters').insert(cleanEntries);
        if (insErr) {
          return NextResponse.json({ error: insErr.message }, { status: 500 });
        }

        const updResults = await Promise.all(
          cleanEntries.map((ins: { chest_no: string; code_letter: string }) =>
            auth.db
              .from('registrations')
              .update({ code_letter: ins.code_letter })
              .match({ item_id: itemId, chest_no: ins.chest_no })
          )
        );
        const updErr = updResults.find(r => r.error)?.error;
        if (updErr) {
          return NextResponse.json({ error: updErr.message }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'assign_legacy') {
      const collegeAfflNo = Number(body?.collegeAfflNo);
      const codeLetter = String(body?.codeLetter ?? '').trim().toUpperCase();
      if (Number.isNaN(collegeAfflNo)) {
        return NextResponse.json({ error: 'Valid collegeAfflNo is required.' }, { status: 400 });
      }
      const { error } = await auth.db
        .from('registrations')
        .update({ code_letter: codeLetter })
        .match({ item_id: itemId, college_affl_no: collegeAfflNo });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'remove') {
      const chestNo = String(body?.chestNo ?? '').trim().toUpperCase();
      if (!chestNo) {
        return NextResponse.json({ error: 'chestNo is required.' }, { status: 400 });
      }

      const { error: delErr } = await auth.db
        .from('code_letters')
        .delete()
        .match({ item_id: itemId, chest_no: chestNo });

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }

      const { error: updErr } = await auth.db
        .from('registrations')
        .update({ code_letter: null })
        .match({ item_id: itemId, chest_no: chestNo });

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
