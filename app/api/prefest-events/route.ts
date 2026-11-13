import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole } from '@/lib/serverAuth';
import { createClient } from '@supabase/supabase-js';
import { isValidYouTubeUrl } from '@/lib/utils/youtube';
import { evaluateDeadlineTierAtTime } from '@/lib/utils/istDate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publicKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!serviceRoleKey && !publicKey)) {
      return NextResponse.json({ error: 'Database credentials not configured.' }, { status: 503 });
    }

    // Attempt staff/college role authentication if session cookie exists
    const auth = await requireServerRole(['admin', 'convenor', 'college']);
    const isStaff = auth.ok;

    // Use admin client if available, else session/public client
    const fallbackDb = createClient(supabaseUrl, serviceRoleKey || publicKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const db = isStaff ? auth.db : fallbackDb;

    // 1. Fetch settings
    const { data: settingsData } = await db
      .from('prefest_registration_settings')
      .select('*');

    // 2. Fetch pre-fest events directly from public.events
    const { data: eventsData, error: eventsError } = await db
      .from('events')
      .select('*')
      .or('is_screening.eq.true,is_submission.eq.true');

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
    }

    // 3. Fetch registrations (scoped by college for authenticated 'college' role)
    let regQuery = db.from('prefest_registrations').select('*');
    if (isStaff && auth.role === 'college' && auth.collegeAfflNo !== null) {
      regQuery = regQuery.eq('college_affl_no', auth.collegeAfflNo);
    }
    const { data: regData } = await regQuery;

    // 4. Fetch submissions (scoped by college for authenticated 'college' role)
    let subQuery = db.from('prefest_submissions').select('*');
    if (isStaff && auth.role === 'college' && auth.collegeAfflNo !== null) {
      subQuery = subQuery.eq('college_affl_no', auth.collegeAfflNo);
    }
    const { data: subData } = await subQuery;

    return NextResponse.json({
      settings: settingsData || [],
      events: eventsData || [],
      registrations: regData || [],
      submissions: subData || [],
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch pre-fest events data.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body?.action || '').trim();

    // ------------------------------------------------------------------------
    // ACTION: update_settings (Admin only)
    // ------------------------------------------------------------------------
    if (action === 'update_settings') {
      const auth = await requireServerRole(['admin']);
      if (!auth.ok) return auth.response;

      const {
        event_type,
        registration_enabled,
        registration_opens_at,
        registration_closes_at,
        youtube_submission_enabled,
        youtube_submission_opens_at,
        youtube_submission_closes_at,
        disabled_event_ids
      } = body?.payload || {};

      if (event_type !== 'SCREENING' && event_type !== 'SUBMISSION') {
        return NextResponse.json({ error: 'Invalid event_type. Must be SCREENING or SUBMISSION.' }, { status: 400 });
      }

      const { data, error } = await auth.db
        .from('prefest_registration_settings')
        .upsert(
          {
            event_type,
            registration_enabled: Boolean(registration_enabled),
            registration_opens_at: registration_opens_at ? new Date(registration_opens_at).toISOString() : null,
            registration_closes_at: registration_closes_at ? new Date(registration_closes_at).toISOString() : null,
            youtube_submission_enabled: Boolean(youtube_submission_enabled),
            youtube_submission_opens_at: youtube_submission_opens_at ? new Date(youtube_submission_opens_at).toISOString() : null,
            youtube_submission_closes_at: youtube_submission_closes_at ? new Date(youtube_submission_closes_at).toISOString() : null,
            disabled_event_ids: Array.isArray(disabled_event_ids) ? disabled_event_ids : [],
            updated_at: new Date().toISOString(),
            updated_by: auth.userId
          },
          { onConflict: 'event_type' }
        )
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Propagate deadlines to screening events if applicable
      if (event_type === 'SCREENING' && registration_closes_at) {
        try {
          const regCloseIso = new Date(registration_closes_at).toISOString();
          const fineCloseIso = body?.payload?.fine_closes_at
            ? new Date(body.payload.fine_closes_at).toISOString()
            : null;
          await auth.db
            .from('events')
            .update({
              reg_deadline: regCloseIso,
              ...(fineCloseIso ? { fine_deadline: fineCloseIso } : {})
            })
            .or('is_screening.eq.true,mode.eq.screening');
        } catch (evErr) {
          console.warn('Notice: updating events deadlines deferred:', evErr);
        }
      }

      return NextResponse.json({ success: true, settings: { ...data, fine_closes_at: body?.payload?.fine_closes_at, fine_amount: body?.payload?.fine_amount } });
    }

    // ------------------------------------------------------------------------
    // ACTION: toggle_event_disabled (Admin only)
    // ------------------------------------------------------------------------
    if (action === 'toggle_event_disabled') {
      const auth = await requireServerRole(['admin']);
      if (!auth.ok) return auth.response;

      const { event_type, event_id, disabled } = body;
      if (!event_type || !event_id) {
        return NextResponse.json({ error: 'event_type and event_id are required.' }, { status: 400 });
      }

      const { data: curr, error: currErr } = await auth.db
        .from('prefest_registration_settings')
        .select('*')
        .eq('event_type', event_type)
        .single();

      if (currErr) {
        return NextResponse.json({ error: currErr.message }, { status: 500 });
      }

      const existingSet = new Set<string>(curr.disabled_event_ids || []);
      if (disabled) {
        existingSet.add(event_id);
      } else {
        existingSet.delete(event_id);
      }

      const { data: updated, error: updErr } = await auth.db
        .from('prefest_registration_settings')
        .update({
          disabled_event_ids: Array.from(existingSet),
          updated_at: new Date().toISOString(),
          updated_by: auth.userId
        })
        .eq('event_type', event_type)
        .select()
        .single();

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, settings: updated });
    }

    // ------------------------------------------------------------------------
    // ACTION: register (College or Admin)
    // ------------------------------------------------------------------------
    if (action === 'register') {
      const auth = await requireServerRole(['admin', 'college']);
      if (!auth.ok) return auth.response;

      const { event_id, college_id, college_affl_no } = body;
      if (!event_id) {
        return NextResponse.json({ error: 'event_id is required.' }, { status: 400 });
      }

      // Resolve college
      let targetAffl: number;
      let targetCollegeId: string;

      if (auth.role === 'college') {
        if (!auth.collegeAfflNo) {
          return NextResponse.json({ error: 'College affiliation context missing.' }, { status: 403 });
        }
        targetAffl = auth.collegeAfflNo;
        // Resolve college UUID
        const { data: cData, error: cErr } = await auth.db
          .from('colleges')
          .select('id, affl_no')
          .eq('affl_no', targetAffl)
          .single();
        if (cErr || !cData) {
          return NextResponse.json({ error: 'College record not found.' }, { status: 404 });
        }
        targetCollegeId = cData.id;
      } else {
        // Admin
        if (!college_id && !college_affl_no) {
          return NextResponse.json({ error: 'college_id or college_affl_no is required for admin registration.' }, { status: 400 });
        }
        const query = auth.db.from('colleges').select('id, affl_no');
        const { data: cData, error: cErr } = college_id
          ? await query.eq('id', college_id).single()
          : await query.eq('affl_no', Number(college_affl_no)).single();
        if (cErr || !cData) {
          return NextResponse.json({ error: 'Specified college does not exist.' }, { status: 404 });
        }
        targetCollegeId = cData.id;
        targetAffl = cData.affl_no;
      }

      // Fetch event
      const { data: event, error: eventErr } = await auth.db
        .from('events')
        .select('*')
        .eq('id', event_id)
        .single();

      if (eventErr || !event) {
        return NextResponse.json({ error: 'pre-fest event not found.' }, { status: 404 });
      }

      const isScreening = Boolean(event.is_screening);
      const isSubmission = Boolean(event.is_submission);

      if (!isScreening && !isSubmission) {
        return NextResponse.json({ error: 'Selected event is neither a screening nor a submission event.' }, { status: 400 });
      }

      const eventType = isScreening ? 'SCREENING' : 'SUBMISSION';

      // Check deadline & availability if not admin
      if (auth.role !== 'admin') {
        const { data: settings } = await auth.db
          .from('prefest_registration_settings')
          .select('*')
          .eq('event_type', eventType)
          .single();

        if (!settings || !settings.registration_enabled) {
          return NextResponse.json({ error: `Registration for ${eventType} events is currently disabled.` }, { status: 403 });
        }

        const now = new Date();
        if (settings.registration_opens_at && now < new Date(settings.registration_opens_at)) {
          return NextResponse.json({ error: `Registration for ${eventType} events has not opened yet.` }, { status: 403 });
        }

        // Apply normal tiered deadline check (Normal -> ₹500 fine -> ₹1000 super fine -> Locked)
        if (settings.registration_closes_at) {
          const tierInfo = evaluateDeadlineTierAtTime(settings.registration_closes_at, now);
          if (tierInfo.tier === 'closed') {
            return NextResponse.json({
              error: `Registration completely locked for ${eventType} events: normal, ₹500 fine (1h), and ₹1,000 super fine (2h) grace periods have ended.`
            }, { status: 403 });
          }
        }

        if (Array.isArray(settings.disabled_event_ids) && settings.disabled_event_ids.includes(event_id)) {
          return NextResponse.json({ error: 'Registration for this individual event is currently disabled.' }, { status: 403 });
        }
      }

      // Insert registration
      const { data: reg, error: regErr } = await auth.db
        .from('prefest_registrations')
        .insert({
          college_id: targetCollegeId,
          college_affl_no: targetAffl,
          event_id,
          event_type: eventType,
          registration_status: 'registered'
        })
        .select()
        .single();

      if (regErr) {
        if (regErr.code === '23505') {
          return NextResponse.json({ error: 'Your college is already registered for this event.' }, { status: 409 });
        }
        return NextResponse.json({ error: regErr.message }, { status: 500 });
      }

      // Ensure corresponding row exists in public.registrations for uniform festival records
      try {
        const { data: eventItem } = await auth.db
          .from('events')
          .select('item_id')
          .eq('id', event_id)
          .maybeSingle();

        if (eventItem?.item_id) {
          const { data: existingMainReg } = await auth.db
            .from('registrations')
            .select('id')
            .eq('item_id', eventItem.item_id)
            .eq('college_affl_no', targetAffl)
            .maybeSingle();

          if (!existingMainReg) {
            await auth.db.from('registrations').insert({
              item_id: eventItem.item_id,
              college_affl_no: targetAffl,
              chest_no: '—',
              created_at: new Date().toISOString()
            });
          }
        }
      } catch (syncErr) {
        console.warn('Notice: registrations table mirror sync deferred:', syncErr);
      }

      return NextResponse.json({ success: true, registration: reg });
    }

    // ------------------------------------------------------------------------
    // ACTION: unregister (College or Admin)
    // ------------------------------------------------------------------------
    if (action === 'unregister') {
      const auth = await requireServerRole(['admin', 'college']);
      if (!auth.ok) return auth.response;

      const { registration_id } = body;
      if (!registration_id) {
        return NextResponse.json({ error: 'registration_id is required.' }, { status: 400 });
      }

      // Check ownership
      const { data: existingReg, error: findErr } = await auth.db
        .from('prefest_registrations')
        .select('*')
        .eq('id', registration_id)
        .single();

      if (findErr || !existingReg) {
        return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
      }

      if (auth.role === 'college' && existingReg.college_affl_no !== auth.collegeAfflNo) {
        return NextResponse.json({ error: 'Forbidden: You cannot modify another college registration.' }, { status: 403 });
      }

      // If college, verify registration deadline has not passed (+2h super fine cutoff)
      if (auth.role !== 'admin') {
        const { data: settings } = await auth.db
          .from('prefest_registration_settings')
          .select('*')
          .eq('event_type', existingReg.event_type)
          .single();

        if (settings?.registration_closes_at) {
          const tierInfo = evaluateDeadlineTierAtTime(settings.registration_closes_at, new Date());
          if (tierInfo.tier === 'closed') {
            return NextResponse.json({ error: 'Cannot cancel registration after the registration and grace periods have ended.' }, { status: 403 });
          }
        }
      }

      // Delete registration (cascades to submissions)
      const { error: delErr } = await auth.db
        .from('prefest_registrations')
        .delete()
        .eq('id', registration_id);

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }

      // Also clean up mirror row in public.registrations and public.submission_entries
      try {
        const { data: eventItem } = await auth.db
          .from('events')
          .select('item_id')
          .eq('id', existingReg.event_id)
          .maybeSingle();

        if (eventItem?.item_id) {
          await Promise.all([
            auth.db.from('registrations').delete().match({
              item_id: eventItem.item_id,
              college_affl_no: existingReg.college_affl_no
            }),
            auth.db.from('submission_entries').delete().match({
              item_id: eventItem.item_id,
              college_affl_no: existingReg.college_affl_no
            })
          ]);
        }
      } catch (syncErr) {
        console.warn('Notice: registrations mirror delete deferred:', syncErr);
      }

      return NextResponse.json({ success: true });
    }

    // ------------------------------------------------------------------------
    // ACTION: submit_youtube (College or Admin)
    // ------------------------------------------------------------------------
    if (action === 'submit_youtube') {
      const auth = await requireServerRole(['admin', 'college']);
      if (!auth.ok) return auth.response;

      const { registration_id, youtube_url } = body;
      if (!registration_id) {
        return NextResponse.json({ error: 'registration_id is required.' }, { status: 400 });
      }

      const cleanUrl = String(youtube_url || '').trim();
      if (!cleanUrl) {
        return NextResponse.json({ error: 'YouTube video link is required.' }, { status: 400 });
      }

      // Validate URL format
      if (!isValidYouTubeUrl(cleanUrl)) {
        return NextResponse.json({
          error: 'Please enter a valid YouTube video link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)'
        }, { status: 400 });
      }

      // Verify registration exists
      const { data: reg, error: regErr } = await auth.db
        .from('prefest_registrations')
        .select('*')
        .eq('id', registration_id)
        .single();

      if (regErr || !reg) {
        return NextResponse.json({ error: 'Registration record not found.' }, { status: 404 });
      }

      // Check ownership
      if (auth.role === 'college' && reg.college_affl_no !== auth.collegeAfflNo) {
        return NextResponse.json({ error: 'Forbidden: You cannot submit for another college.' }, { status: 403 });
      }

      // Check YouTube submission deadlines if not admin
      if (auth.role !== 'admin') {
        // 1. Check primary event_deadline_settings table
        const eventKind = reg.event_type === 'SCREENING' ? 'screening' : 'submission';
        const { data: dlSetting } = await auth.db
          .from('event_deadline_settings')
          .select('*')
          .eq('event_kind', eventKind)
          .maybeSingle();

        if (dlSetting) {
          if (dlSetting.is_active === false) {
            return NextResponse.json({ error: `Link submission for ${dlSetting.display_name} is currently disabled.` }, { status: 403 });
          }
          const now = new Date();
          if (dlSetting.start_time && now < new Date(dlSetting.start_time)) {
            return NextResponse.json({ error: `Link submissions for ${dlSetting.display_name} have not opened yet.` }, { status: 403 });
          }
          const linkDeadline = dlSetting.link_submission_deadline || dlSetting.fine_deadline || dlSetting.no_fine_deadline;
          if (linkDeadline && now > new Date(linkDeadline)) {
            return NextResponse.json({ error: `YouTube link submission deadline for ${dlSetting.display_name} has expired.` }, { status: 403 });
          }
        } else {
          // Fallback to legacy prefest_registration_settings
          const { data: settings } = await auth.db
            .from('prefest_registration_settings')
            .select('*')
            .eq('event_type', reg.event_type)
            .single();

          if (!settings || !settings.youtube_submission_enabled) {
            return NextResponse.json({ error: `YouTube link submission for ${reg.event_type} events is currently disabled.` }, { status: 403 });
          }

          const now = new Date();
          if (settings.youtube_submission_opens_at && now < new Date(settings.youtube_submission_opens_at)) {
            return NextResponse.json({ error: `YouTube link submissions for ${reg.event_type} events have not opened yet.` }, { status: 403 });
          }

          if (settings.youtube_submission_closes_at && now > new Date(settings.youtube_submission_closes_at)) {
            return NextResponse.json({ error: `YouTube link submission deadline for ${reg.event_type} events has expired.` }, { status: 403 });
          }
        }
      }

      // Upsert submission
      const { data: sub, error: subErr } = await auth.db
        .from('prefest_submissions')
        .upsert(
          {
            registration_id,
            college_id: reg.college_id,
            college_affl_no: reg.college_affl_no,
            event_id: reg.event_id,
            youtube_url: cleanUrl,
            submission_status: 'submitted',
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { onConflict: 'registration_id' }
        )
        .select()
        .single();

      if (subErr) {
        return NextResponse.json({ error: subErr.message }, { status: 500 });
      }

      // Also mirror into public.submission_entries for universal festival reporting
      try {
        const { data: eventItem } = await auth.db
          .from('events')
          .select('item_id')
          .eq('id', reg.event_id)
          .single();

        if (eventItem?.item_id) {
          const { data: mainReg } = await auth.db
            .from('registrations')
            .select('chest_no')
            .eq('item_id', eventItem.item_id)
            .eq('college_affl_no', reg.college_affl_no)
            .maybeSingle();

          const targetChest = mainReg?.chest_no || `COL-${reg.college_affl_no}`;

          await auth.db.from('submission_entries').upsert(
            {
              college_affl_no: reg.college_affl_no,
              chest_no: targetChest,
              item_id: eventItem.item_id,
              status: 'on_time',
              file_url: cleanUrl,
              submitted_at: new Date().toISOString()
            },
            { onConflict: 'item_id,chest_no' }
          );
        }
      } catch (mirrorErr) {
        // Non-blocking mirror
      }

      return NextResponse.json({
        success: true,
        submission: sub,
        message: 'YouTube video link submitted successfully.'
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error occurred.' }, { status: 500 });
  }
}



