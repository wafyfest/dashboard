import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['admin', 'result_entry', 'convenor'];

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

    if (action === 'submit') {
      const payloads = Array.isArray(body?.results) ? body.results : [];

      const { error: delErr } = await auth.db
        .from('results')
        .delete()
        .eq('item_id', itemId);

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }

      if (payloads.length > 0) {
        const cleanPayloads = payloads.map((r: Record<string, unknown>) => ({
          item_id: itemId,
          code_letter: r.code_letter,
          college_affl_no: Number(r.college_affl_no),
          chest_no: r.chest_no,
          mark_percentage: Number(r.mark_percentage),
          grade: r.grade,
          rank: Number(r.rank),
          points: Number(r.points),
          published: Boolean(r.published),
          best_in_fest: Boolean(r.best_in_fest),
        }));

        const { error: insErr } = await auth.db.from('results').insert(cleanPayloads);
        if (insErr) {
          return NextResponse.json({ error: insErr.message }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'publish') {
      const publish = Boolean(body?.publish);
      const { error } = await auth.db
        .from('results')
        .update({ published: publish })
        .eq('item_id', itemId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
