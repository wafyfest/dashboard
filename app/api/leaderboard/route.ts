import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LeaderboardEntry, College } from '@/lib/types/fest';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Database credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Try fetching from the server-side PostgreSQL view 'fest_leaderboard'
    const { data: viewData, error: viewError } = await supabase
      .from('fest_leaderboard')
      .select('*')
      .order('rank', { ascending: true });

    if (!viewError && Array.isArray(viewData) && viewData.length > 0) {
      const formatted: LeaderboardEntry[] = viewData.map(row => ({
        rank: Number(row.rank),
        college: {
          id: row.college_id || `col-${row.affl_no}`,
          affl_no: Number(row.affl_no),
          affiliation_no: String(row.affl_no),
          name: row.college_name || '',
          short_name: row.college_short_name || '',
          code: row.college_short_name || '',
          type: row.college_type || 'wafy',
          st_foundation: 0,
          st_thamheediya: 0,
          st_aliya: 0,
          manual_lock_override: false,
        } as College,
        points: Number(row.points) || 0,
        gold: Number(row.gold) || 0,
        silver: Number(row.silver) || 0,
        bronze: Number(row.bronze) || 0,
        total_medals: Number(row.total_medals) || 0,
      }));

      return NextResponse.json(
        {
          success: true,
          source: 'postgresql_view',
          data: formatted,
          count: formatted.length,
          generated_at: new Date().toISOString(),
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
          },
        }
      );
    }

    // 2. Server-side fallback computation (if view is not yet applied in Postgres)
    if (viewError) {
      console.warn('[API /api/leaderboard] View query failed, falling back to aggregate:', viewError.message);
    }

    const [collegesRes, resultsRes] = await Promise.all([
      supabase
        .from('colleges')
        .select('id, affl_no, name, short_name, type')
        .order('affl_no', { ascending: true }),
      supabase
        .from('results')
        .select('id, college_affl_no, rank, points, published')
        .eq('published', true),
    ]);

    if (collegesRes.error || resultsRes.error) {
      const dbError = collegesRes.error || resultsRes.error;
      console.error('[API /api/leaderboard] Fallback query error:', {
        viewError: viewError?.message,
        collegesError: collegesRes.error?.message,
        resultsError: resultsRes.error?.message,
      });
      return NextResponse.json(
        {
          success: false,
          error: dbError?.message || 'Database error computing leaderboard',
        },
        { status: 500 }
      );
    }

    const colleges = collegesRes.data || [];
    const results = resultsRes.data || [];

    const standingsMap = new Map<
      number,
      { points: number; gold: number; silver: number; bronze: number }
    >();

    colleges.forEach(c => {
      standingsMap.set(Number(c.affl_no), { points: 0, gold: 0, silver: 0, bronze: 0 });
    });

    results.forEach(res => {
      if (res.college_affl_no) {
        const affl = Number(res.college_affl_no);
        const curr = standingsMap.get(affl) || { points: 0, gold: 0, silver: 0, bronze: 0 };
        curr.points += Number(res.points) || 0;
        if (Number(res.rank) === 1) curr.gold += 1;
        else if (Number(res.rank) === 2) curr.silver += 1;
        else if (Number(res.rank) === 3) curr.bronze += 1;
        standingsMap.set(affl, curr);
      }
    });

    // Sort by points DESC, then gold DESC, silver DESC, bronze DESC
    const sorted = colleges
      .map(c => {
        const affl = Number(c.affl_no);
        const stats = standingsMap.get(affl) || { points: 0, gold: 0, silver: 0, bronze: 0 };
        return {
          college: {
            ...c,
            affl_no: affl,
            code: c.short_name,
            st_foundation: 0,
            st_thamheediya: 0,
            st_aliya: 0,
            manual_lock_override: false,
          } as College,
          points: stats.points,
          gold: stats.gold,
          silver: stats.silver,
          bronze: stats.bronze,
          total_medals: stats.gold + stats.silver + stats.bronze,
        };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gold !== a.gold) return b.gold - a.gold;
        if (b.silver !== a.silver) return b.silver - a.silver;
        if (b.bronze !== a.bronze) return b.bronze - a.bronze;
        return (a.college.name || '').localeCompare(b.college.name || '');
      });

    // Calculate Dense Rank
    let currentRank = 1;
    const ranked: LeaderboardEntry[] = sorted.map((entry, index) => {
      if (index > 0) {
        const prev = sorted[index - 1];
        const isTie =
          prev.points === entry.points &&
          prev.gold === entry.gold &&
          prev.silver === entry.silver &&
          prev.bronze === entry.bronze;
        if (!isTie) {
          currentRank += 1;
        }
      }
      return {
        ...entry,
        rank: currentRank,
      };
    });

    return NextResponse.json(
      {
        success: true,
        source: 'server_aggregate',
        data: ranked,
        count: ranked.length,
        generated_at: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/leaderboard] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error computing leaderboard' },
      { status: 500 }
    );
  }
}

