import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';
import { createClient as createServerSupabase } from '@/lib/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

// Cached check whether 'topic' text column exists on the topics table
let _hasTopicColumn: boolean | null = null;
async function checkHasTopicColumn(db: any): Promise<boolean> {
  if (_hasTopicColumn !== null) return _hasTopicColumn;
  try {
    const { error } = await db.from('topics').select('topic').limit(1);
    _hasTopicColumn = !error || !error.message.includes('topic');
  } catch {
    _hasTopicColumn = false;
  }
  return _hasTopicColumn;
}

/**
 * GET /api/topics
 * - Admins receive all topic configurations (including future and hidden).
 * - Colleges and other roles receive ONLY topics where hide is false AND outing_time <= current time.
 */
export async function GET(req: NextRequest) {
  try {
    const adminDb = getAdminClient();
    if (!adminDb) {
      return NextResponse.json({ error: 'Supabase admin client unavailable' }, { status: 503 });
    }

    // Determine caller role from session cookie
    let isAdmin = false;
    try {
      const sessionClient = await createServerSupabase();
      const { data: { user } } = await sessionClient.auth.getUser();
      if (user) {
        const { data: profile } = await sessionClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.role === 'admin' || profile?.role === 'convenor') {
          isAdmin = true;
        }
      }
    } catch {
      // If session retrieval fails, treat as view-only (non-admin)
      isAdmin = false;
    }

    // Fetch topics from database
    const nowIso = new Date().toISOString();
    let query = adminDb.from('topics').select('*');

    if (!isAdmin) {
      // College view-only filter: hide must be false AND outing_time must have arrived
      query = query.eq('hide', false).lte('outing_time', nowIso).order('outing_time', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: topicsData, error: topicsErr } = await query;
    if (topicsErr) {
      console.error('Error fetching topics:', topicsErr.message);
      return NextResponse.json({ error: topicsErr.message, topics: [] }, { status: 500 });
    }

    // Resolve event details for each topic
    const { data: eventsData } = await adminDb
      .from('events')
      .select('item_id, item_code, name_eng, name_mal, phase, category, mode, is_submission, is_screening');

    const eventMap = new Map<number, any>();
    if (eventsData) {
      eventsData.forEach(ev => eventMap.set(Number(ev.item_id), ev));
    }

    const resolvedTopics = (topicsData || []).map(t => ({
      ...t,
      item: eventMap.get(Number(t.item_id)) || null
    }));

    return NextResponse.json({
      topics: resolvedTopics,
      isAdmin,
      serverTime: nowIso
    });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/topics:', err);
    return NextResponse.json({ error: err.message || 'Internal server error', topics: [] }, { status: 500 });
  }
}

/**
 * POST /api/topics
 * - Creates a new topic (Admin only)
 */
export async function POST(req: NextRequest) {
  const auth = await requireServerRole(['admin', 'convenor']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const itemId = Number(body?.item_id);
    const outingTime = body?.outing_time;
    const hide = Boolean(body?.hide);
    const topicText = body?.topic !== undefined ? String(body?.topic).trim() : null;

    if (!itemId || Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'A valid subject (item_id) is required.' }, { status: 400 });
    }

    if (!outingTime) {
      return NextResponse.json({ error: 'Outing time is required.' }, { status: 400 });
    }

    // Build payload
    const payload: Record<string, any> = {
      item_id: itemId,
      outing_time: new Date(outingTime).toISOString(),
      hide: hide
    };

    const hasTopicCol = await checkHasTopicColumn(auth.db);
    if (hasTopicCol && topicText !== null) {
      payload.topic = topicText;
    }

    const { data, error } = await auth.db
      .from('topics')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error inserting topic:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Attach item details
    const { data: ev } = await auth.db
      .from('events')
      .select('item_id, item_code, name_eng, name_mal, phase, category, mode')
      .eq('item_id', itemId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      topic: {
        ...data,
        item: ev || null
      }
    });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/topics:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/topics
 * - Updates an existing topic (Admin only)
 */
export async function PUT(req: NextRequest) {
  const auth = await requireServerRole(['admin', 'convenor']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const id = Number(body?.id);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'Valid topic ID is required.' }, { status: 400 });
    }

    const payload: Record<string, any> = {};

    if (body.item_id !== undefined) {
      const itemId = Number(body.item_id);
      if (Number.isNaN(itemId)) {
        return NextResponse.json({ error: 'Invalid item_id.' }, { status: 400 });
      }
      payload.item_id = itemId;
    }

    if (body.outing_time !== undefined) {
      payload.outing_time = new Date(body.outing_time).toISOString();
    }

    if (body.hide !== undefined) {
      payload.hide = Boolean(body.hide);
    }

    const hasTopicCol = await checkHasTopicColumn(auth.db);
    if (hasTopicCol && body.topic !== undefined) {
      payload.topic = body.topic ? String(body.topic).trim() : null;
    }

    const { data, error } = await auth.db
      .from('topics')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating topic:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Resolve event details
    let ev = null;
    if (data?.item_id) {
      const { data: itemData } = await auth.db
        .from('events')
        .select('item_id, item_code, name_eng, name_mal, phase, category, mode')
        .eq('item_id', data.item_id)
        .maybeSingle();
      ev = itemData;
    }

    return NextResponse.json({
      success: true,
      topic: {
        ...data,
        item: ev || null
      }
    });
  } catch (err: any) {
    console.error('Unexpected error in PUT /api/topics:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/topics?id=123
 * - Deletes a topic entry (Admin only)
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireServerRole(['admin', 'convenor']);
  if (!auth.ok) return auth.response;

  try {
    const rawId = req.nextUrl.searchParams.get('id');
    const id = rawId ? Number(rawId) : NaN;

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'Valid topic ID is required.' }, { status: 400 });
    }

    const { error } = await auth.db
      .from('topics')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting topic:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Unexpected error in DELETE /api/topics:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
