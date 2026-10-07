-- ====================================================================
-- Performance Tuning: Database Indexes for WSF Arts Fest
-- Adds compound indexes for high-frequency queries in student rosters,
-- registrations, stage schedules, and locks.
-- ====================================================================

-- 1. Students: Quick lookup by college and phase/category
CREATE INDEX IF NOT EXISTS idx_students_college_phase
  ON students(college_affl_no, phase);

CREATE INDEX IF NOT EXISTS idx_students_chest_no
  ON students(chest_no);

-- 2. Registrations: Quick lookup by college & item
CREATE INDEX IF NOT EXISTS idx_registrations_college_item
  ON registrations(college_affl_no, item_id);

CREATE INDEX IF NOT EXISTS idx_registrations_item
  ON registrations(item_id);

-- 3. Schedules: Quick lookup by stage and status
CREATE INDEX IF NOT EXISTS idx_schedules_stage_status
  ON schedules(stage_id, status);

CREATE INDEX IF NOT EXISTS idx_schedules_item
  ON schedules(item_id);

-- 4. Entry Locks & College Item Locks
CREATE INDEX IF NOT EXISTS idx_entry_locks_item_college
  ON entry_locks(item_id, college_affl_no);

-- 5. Profiles: Quick lookup by Auth user ID and Role
CREATE INDEX IF NOT EXISTS idx_profiles_user_role
  ON profiles(id, role);

CREATE INDEX IF NOT EXISTS idx_profiles_college_affl
  ON profiles(college_affl_no);
