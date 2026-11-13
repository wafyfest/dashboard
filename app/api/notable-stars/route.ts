import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SafeStarStudent {
  id: string;
  name: string;
  cic_no: string | number | null;
  phase: string;
  chest_no: string;
}

interface NotableStarEntry {
  student: SafeStarStudent;
  points: number;
  golds: number;
  silvers: number;
  bronzes: number;
}

export async function GET(req: NextRequest) {
  const rawAffl = req.nextUrl.searchParams.get('college_affl_no');
  const afflNo = rawAffl ? Number(rawAffl) : NaN;

  if (!Number.isInteger(afflNo) || afflNo <= 0) {
    return NextResponse.json({ stars: [] }, { status: 200 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'your-service-role-key') {
    return NextResponse.json({ stars: [] }, { status: 200 });
  }

  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: resultsData, error: resErr } = await adminClient
      .from('results')
      .select('chest_no, rank, points, published')
      .eq('college_affl_no', afflNo)
      .eq('published', true);

    if (resErr || !resultsData || resultsData.length === 0) {
      return NextResponse.json({ stars: [] }, { status: 200 });
    }

    const { data: studentsData, error: stuErr } = await adminClient
      .from('students')
      .select('id, name, cic_no, phase')
      .eq('college_affl_no', afflNo);

    if (stuErr || !studentsData || studentsData.length === 0) {
      return NextResponse.json({ stars: [] }, { status: 200 });
    }

    const cicList = studentsData
      .map((s) => s.cic_no)
      .filter((c): c is number | string => c !== null && c !== undefined && String(c).trim() !== '');

    const chestByCic = new Map<string, string>();
    if (cicList.length > 0) {
      const { data: chestRows } = await adminClient
        .from('chest_no')
        .select('cic_no, chest_no')
        .in('cic_no', cicList);

      if (chestRows) {
        for (const row of chestRows) {
          if (row.cic_no != null && row.chest_no != null) {
            chestByCic.set(String(row.cic_no).trim(), String(row.chest_no).trim());
          }
        }
      }
    }

    // Build fast lookup maps for chest_no and cic_no -> student
    const studentByKey = new Map<string, SafeStarStudent>();
    for (const s of studentsData) {
      const cicStr = s.cic_no != null ? String(s.cic_no).trim() : '';
      const mappedChest = (cicStr && chestByCic.get(cicStr)) || '';
      const safeStu: SafeStarStudent = {
        id: String(s.id),
        name: String(s.name || 'Participant'),
        cic_no: s.cic_no ?? null,
        phase: String(s.phase || ''),
        chest_no: mappedChest,
      };
      if (mappedChest) {
        studentByKey.set(mappedChest.toUpperCase(), safeStu);
      }
      if (cicStr) {
        studentByKey.set(cicStr.toUpperCase(), safeStu);
        studentByKey.set(`ST-${cicStr}`.toUpperCase(), safeStu);
      }
      studentByKey.set(safeStu.id.toUpperCase(), safeStu);
    }

    const tally = new Map<string, NotableStarEntry>();
    for (const res of resultsData) {
      const rawIdentifier = String(res.chest_no ?? '').trim();
      if (!rawIdentifier) continue;

      const upper = rawIdentifier.toUpperCase();
      const digits = rawIdentifier.replace(/\D/g, '');
      const matched =
        studentByKey.get(upper) || (digits ? studentByKey.get(digits) : undefined);

      if (!matched) continue;

      const entry = tally.get(matched.id) ?? {
        student: matched,
        points: 0,
        golds: 0,
        silvers: 0,
        bronzes: 0,
      };

      entry.points += Number(res.points) || 0;
      const rank = Number(res.rank);
      if (rank === 1) entry.golds += 1;
      else if (rank === 2) entry.silvers += 1;
      else if (rank === 3) entry.bronzes += 1;

      tally.set(matched.id, entry);
    }

    const stars = Array.from(tally.values())
      .filter((e) => e.points > 0)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.golds !== a.golds) return b.golds - a.golds;
        if (b.silvers !== a.silvers) return b.silvers - a.silvers;
        return b.bronzes - a.bronzes;
      })
      .slice(0, 4);

    return NextResponse.json({ stars }, { status: 200 });
  } catch (err) {
    console.error('[API /api/notable-stars] Error:', err);
    return NextResponse.json({ stars: [] }, { status: 200 });
  }
}
