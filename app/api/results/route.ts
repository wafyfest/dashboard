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
      // 1. Guard against overwriting published results unless caller is admin
      const { data: existingResults, error: checkErr } = await auth.db
        .from('results')
        .select('published')
        .eq('item_id', itemId);

      if (checkErr) {
        return NextResponse.json({ error: checkErr.message }, { status: 500 });
      }

      const isAlreadyPublished = existingResults?.some(r => r.published === true);
      if (isAlreadyPublished && auth.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: Results for this event have been officially published and write-locked.' },
          { status: 403 }
        );
      }

      // 2. Fetch authoritative code letter mapping to resolve participant and college identity securely on server
      const { data: codeLetters } = await auth.db
        .from('code_letters')
        .select('code_letter, chest_no, college_affl_no')
        .eq('item_id', itemId);

      const letterMap = new Map(
        (codeLetters || []).map(c => [String(c.code_letter || '').trim().toUpperCase(), c])
      );

      const payloads = Array.isArray(body?.results) ? body.results : [];

      const { error: delErr } = await auth.db
        .from('results')
        .delete()
        .eq('item_id', itemId);

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }

      if (payloads.length > 0) {
        const cleanPayloads = payloads.map((r: Record<string, unknown>) => {
          const letter = String(r.code_letter ?? '').trim().toUpperCase();
          const meta = letterMap.get(letter);
          const collegeAfflNo = meta?.college_affl_no != null
            ? Number(meta.college_affl_no)
            : (r.college_affl_no != null ? Number(r.college_affl_no) : null);
          const chestNo = meta?.chest_no
            ? String(meta.chest_no).trim()
            : (r.chest_no ? String(r.chest_no).trim() : null);

          // Sanitize rank: only 1, 2, 3 or null (never 0 or NaN)
          const rawRank = r.rank != null && r.rank !== '' && r.rank !== 'none' ? Number(r.rank) : null;
          const cleanRank = rawRank && [1, 2, 3].includes(rawRank) ? rawRank : null;

          return {
            item_id: itemId,
            code_letter: letter,
            college_affl_no: collegeAfflNo,
            chest_no: chestNo,
            mark_percentage: Math.min(100, Math.max(0, Number(r.mark_percentage) || 0)),
            grade: String(r.grade || 'None'),
            rank: cleanRank,
            points: Number(r.points) || 0,
            published: false,
            best_in_fest: Boolean(r.best_in_fest),
          };
        });

        const { error: insErr } = await auth.db.from('results').insert(cleanPayloads);
        if (insErr) {
          return NextResponse.json({ error: insErr.message }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'publish') {
      if (auth.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: only Chief Tabulation Officer (admin) can publish official results.' },
          { status: 403 }
        );
      }

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
