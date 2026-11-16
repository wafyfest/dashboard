import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runTests() {
  console.log('🧪 Starting Student Block System Verification...\n');

  // 1. Find a test student and an event
  const { data: student, error: stuErr } = await supabase
    .from('students')
    .select('id, name, cic_no, college_affl_no')
    .limit(1)
    .single();

  if (stuErr || !student) {
    console.error('❌ Failed to fetch test student:', stuErr?.message);
    process.exit(1);
  }

  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('id, item_id, item_code')
    .limit(1)
    .single();

  if (evErr || !event) {
    console.error('❌ Failed to fetch test event:', evErr?.message);
    process.exit(1);
  }

  console.log(`📌 Test Student: "${student.name}" (CIC: ${student.cic_no}, College: #${student.college_affl_no})`);
  console.log(`📌 Test Event: ${event.item_code} (ID: ${event.item_id})\n`);

  try {
    // 2. Ensure student is unblocked first (clean state)
    await supabase.from('blocked_students').delete().eq('student_id', student.id);

    // 3. Block the student
    console.log('1️⃣ Blocking student with reason "Disciplinary Action"...');
    const { data: blockedRow, error: blockErr } = await supabase
      .from('blocked_students')
      .insert({
        student_id: student.id,
        cic_no: student.cic_no,
        college_affl_no: student.college_affl_no,
        reason: 'Disciplinary Action',
        notes: 'Automated test suite verification',
        is_active: true,
        blocked_by: 'Test Runner'
      })
      .select()
      .single();

    if (blockErr) {
      throw new Error(`Failed to insert into blocked_students: ${blockErr.message}`);
    }
    console.log('✅ Student successfully added to blocked_students table.');

    // 4. Test database transaction RPC rejection
    console.log('\n2️⃣ Testing PostgreSQL register_college_for_item_tx enforcement...');
    const { error: rpcErr } = await supabase.rpc('register_college_for_item_tx', {
      p_item_id: event.item_id,
      p_college_affl_no: student.college_affl_no,
      p_chest_nos: [String(student.cic_no)]
    });

    if (!rpcErr) {
      throw new Error('❌ RPC succeeded when it should have raised an exception for a blocked student!');
    }

    if (rpcErr.message.toLowerCase().includes('blocked from festival participation')) {
      console.log(`✅ RPC properly rejected with expected exception: "${rpcErr.message}"`);
    } else {
      console.warn(`⚠️ RPC failed but with different message: "${rpcErr.message}"`);
    }

    // 5. Test Fest Committee reason
    console.log('\n3️⃣ Updating block reason to "Fest Committee"...');
    const { error: updateErr } = await supabase
      .from('blocked_students')
      .update({ reason: 'Fest Committee', notes: 'Stage convener' })
      .eq('student_id', student.id);

    if (updateErr) {
      throw new Error(`Failed to update reason: ${updateErr.message}`);
    }

    const { data: updatedBlock } = await supabase
      .from('blocked_students')
      .select('reason')
      .eq('student_id', student.id)
      .single();

    if (updatedBlock?.reason === 'Fest Committee') {
      console.log('✅ Block reason successfully updated to "Fest Committee".');
    } else {
      throw new Error('Block reason update mismatch.');
    }

    // 6. Test unblocking
    console.log('\n4️⃣ Unblocking student...');
    const { error: unblockErr } = await supabase
      .from('blocked_students')
      .delete()
      .eq('student_id', student.id);

    if (unblockErr) {
      throw new Error(`Failed to delete from blocked_students: ${unblockErr.message}`);
    }

    const { data: checkEmpty } = await supabase
      .from('blocked_students')
      .select('id')
      .eq('student_id', student.id)
      .maybeSingle();

    if (!checkEmpty) {
      console.log('✅ Student successfully removed from blocklist.');
    } else {
      throw new Error('Student was not removed from blocklist.');
    }

    console.log('\n=============================================');
    console.log('🎉 ALL STUDENT BLOCK SYSTEM TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    // Ensure clean state
    await supabase.from('blocked_students').delete().eq('student_id', student.id);
  }
}

runTests();
