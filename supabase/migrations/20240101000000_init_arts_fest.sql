-- ====================================================================
-- Wafy Inter-College Arts Fest Management System: Database Schema & RLS
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums
CREATE TYPE user_role AS ENUM ('admin', 'college', 'stage_controller', 'result_entry');
CREATE TYPE college_type AS ENUM ('wafy', 'prof');
CREATE TYPE item_mode AS ENUM ('onstage', 'offstage', 'submission');
CREATE TYPE point_type AS ENUM ('individual', 'group');
CREATE TYPE submission_status AS ENUM ('on_time', 'fine', 'late');
CREATE TYPE stage_status AS ENUM ('Upcoming', 'Next_Item', 'Starting_Soon', 'On_Going', 'Ended');
CREATE TYPE appeal_status AS ENUM ('Pending', 'Approved', 'Rejected');

-- 2. Colleges Table
CREATE TABLE colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affl_no INT UNIQUE NOT NULL, -- 3-digit number (e.g. 101, 102...)
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  type college_type NOT NULL DEFAULT 'wafy',
  st_foundation INT DEFAULT 0,
  st_thamheediya INT DEFAULT 0,
  st_aliya INT DEFAULT 0,
  email TEXT,
  address TEXT,
  union_name TEXT,
  contact_no TEXT,
  union_email TEXT,
  staff_coordinator_name TEXT,
  staff_coordinator_phone TEXT,
  staff_coordinator_whatsapp TEXT,
  team_manager_name TEXT,
  team_manager_phone TEXT,
  team_manager_whatsapp TEXT,
  asst_team_manager_name TEXT,
  asst_team_manager_phone TEXT,
  asst_team_manager_whatsapp TEXT,
  fine_status BOOLEAN DEFAULT false,
  manual_lock_override BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Profiles (Tied to Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'college',
  college_affl_no INT REFERENCES colleges(affl_no) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Items (Events)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id INT UNIQUE NOT NULL, -- 2-digit number (e.g. 1, 2, 10...)
  item_code TEXT UNIQUE NOT NULL, -- Alphanumeric (e.g. ITM-01)
  name_eng TEXT NOT NULL,
  name_mal TEXT NOT NULL,
  phase TEXT NOT NULL, -- Sub_Junior, Junior, Senior, General, Thamheediya, Aliya
  mode item_mode NOT NULL DEFAULT 'onstage',
  category CHAR(1) DEFAULT 'A', -- A, B, C
  tabulation BOOLEAN DEFAULT true,
  point_type point_type NOT NULL DEFAULT 'individual',
  no_of_participants INT DEFAULT 1,
  reg_deadline TIMESTAMPTZ,
  fine_deadline TIMESTAMPTZ,
  l_star BOOLEAN DEFAULT false,
  em_star BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admission_no TEXT NOT NULL,
  college_affl_no INT REFERENCES colleges(affl_no) ON DELETE CASCADE,
  class TEXT,
  phase TEXT NOT NULL,
  chest_no TEXT UNIQUE NOT NULL,
  phone TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(college_affl_no, admission_no)
);

-- 6. Max Participation Quotas
CREATE TABLE max_participation (
  phase TEXT PRIMARY KEY,
  off_max INT NOT NULL DEFAULT 3,
  on_max INT NOT NULL DEFAULT 2,
  total_max INT NOT NULL DEFAULT 4,
  group_max INT NOT NULL DEFAULT 2
);

-- 7. Registrations (Multiple rows for group entries!)
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
  college_affl_no INT REFERENCES colleges(affl_no) ON DELETE CASCADE,
  chest_no TEXT REFERENCES students(chest_no) ON DELETE CASCADE,
  code_letter CHAR(2), -- Optional fast reference
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, chest_no)
);

-- 8. Registration Audit Log
CREATE TABLE registration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id INT REFERENCES items(item_id),
  college_affl_no INT,
  chest_no TEXT,
  process TEXT NOT NULL, -- 'ADD' or 'DELETE'
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- 9. Code Letters (Blind Judging Allotment)
CREATE TABLE code_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
  college_affl_no INT REFERENCES colleges(affl_no) ON DELETE CASCADE,
  chest_no TEXT REFERENCES students(chest_no) ON DELETE CASCADE,
  code_letter CHAR(2) NOT NULL, -- A, B, C...
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Submission Entries (Offstage / Digital Submissions)
CREATE TABLE submission_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_affl_no INT REFERENCES colleges(affl_no) ON DELETE CASCADE,
  chest_no TEXT REFERENCES students(chest_no) ON DELETE CASCADE,
  item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
  status submission_status DEFAULT 'on_time',
  file_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Stages & Schedules
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_number INT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT
);

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
  stage_number INT REFERENCES stages(stage_number),
  starting TIMESTAMPTZ NOT NULL,
  ending TIMESTAMPTZ,
  status stage_status DEFAULT 'Upcoming',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Points Rubric Matrix
CREATE TABLE points_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL,
  category CHAR(1) NOT NULL, -- A, B, C
  grade TEXT, -- A, B, C
  rank INT, -- 1, 2, 3
  points NUMERIC NOT NULL
);

-- 13. Results
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
  code_letter CHAR(2),
  college_affl_no INT REFERENCES colleges(affl_no),
  chest_no TEXT REFERENCES students(chest_no),
  mark_percentage NUMERIC(5, 2),
  grade TEXT,
  rank INT,
  points NUMERIC,
  published BOOLEAN DEFAULT false,
  best_in_fest BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Appeals
CREATE TABLE appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL,
  item_id INT REFERENCES items(item_id),
  chest_no TEXT REFERENCES students(chest_no),
  code_letter CHAR(2),
  appeal_description TEXT,
  reason_for_appeal TEXT NOT NULL,
  transaction_number TEXT NOT NULL,
  fee_receipt_url TEXT,
  team_manager_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  acknowledgment BOOLEAN NOT NULL DEFAULT false,
  current_status appeal_status DEFAULT 'Pending',
  admin_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. College Item Granular Locks
CREATE TABLE college_item_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_affl_no INT REFERENCES colleges(affl_no) ON DELETE CASCADE,
  item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
  is_unlocked BOOLEAN NOT NULL DEFAULT true,
  unlocked_until TIMESTAMPTZ,
  UNIQUE(college_affl_no, item_id)
);

-- 16. System Settings
CREATE TABLE fest_settings (
  id INT PRIMARY KEY DEFAULT 1,
  fest_name TEXT NOT NULL,
  reg_deadline TIMESTAMPTZ NOT NULL,
  fine_deadline TIMESTAMPTZ NOT NULL,
  rulebook_url TEXT
);

-- ====================================================================
-- Row Level Security (RLS) Configuration
-- ====================================================================

-- Helper functions
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_affl_no()
RETURNS INT AS $$
  SELECT college_affl_no FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_item_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fest_settings ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles readable by owner or admin"
  ON profiles FOR SELECT USING (id = auth.uid() OR auth_user_role() = 'admin');

CREATE POLICY "Profiles updatable by owner or admin"
  ON profiles FOR UPDATE USING (id = auth.uid() OR auth_user_role() = 'admin');

-- Colleges
CREATE POLICY "Colleges readable by all authenticated"
  ON colleges FOR SELECT USING (true);

CREATE POLICY "Colleges managed by admin"
  ON colleges FOR ALL USING (auth_user_role() = 'admin');

CREATE POLICY "Colleges update own contact info"
  ON colleges FOR UPDATE
  USING (affl_no = auth_user_affl_no())
  WITH CHECK (affl_no = auth_user_affl_no());

-- Items & Fest Settings
CREATE POLICY "Items readable by everyone" ON items FOR SELECT USING (true);
CREATE POLICY "Items managed by admin" ON items FOR ALL USING (auth_user_role() = 'admin');

CREATE POLICY "Fest settings readable by all" ON fest_settings FOR SELECT USING (true);
CREATE POLICY "Fest settings managed by admin" ON fest_settings FOR ALL USING (auth_user_role() = 'admin');

CREATE POLICY "Max participation readable by all" ON max_participation FOR SELECT USING (true);
CREATE POLICY "Max participation managed by admin" ON max_participation FOR ALL USING (auth_user_role() = 'admin');

CREATE POLICY "Points matrix readable by all" ON points_matrix FOR SELECT USING (true);
CREATE POLICY "Points matrix managed by admin" ON points_matrix FOR ALL USING (auth_user_role() = 'admin');

-- Students
CREATE POLICY "Students readable by all" ON students FOR SELECT USING (true);
CREATE POLICY "Students managed by admin or owning college"
  ON students FOR ALL
  USING (auth_user_role() = 'admin' OR college_affl_no = auth_user_affl_no())
  WITH CHECK (auth_user_role() = 'admin' OR college_affl_no = auth_user_affl_no());

-- Registrations & Logs
CREATE POLICY "Registrations readable by all authenticated" ON registrations FOR SELECT USING (true);
CREATE POLICY "Registrations managed by admin or owning college"
  ON registrations FOR ALL
  USING (auth_user_role() = 'admin' OR college_affl_no = auth_user_affl_no())
  WITH CHECK (auth_user_role() = 'admin' OR college_affl_no = auth_user_affl_no());

CREATE POLICY "Registration logs insertable by college or admin"
  ON registration_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Registration logs readable by admin or owning college"
  ON registration_logs FOR SELECT
  USING (auth_user_role() = 'admin' OR college_affl_no = auth_user_affl_no());

-- Code Letters
CREATE POLICY "Code letters readable by admin and stage controller"
  ON code_letters FOR SELECT
  USING (auth_user_role() IN ('admin', 'stage_controller') OR college_affl_no = auth_user_affl_no());

CREATE POLICY "Code letters managed by stage controller or admin"
  ON code_letters FOR ALL
  USING (auth_user_role() IN ('admin', 'stage_controller'));

-- Submissions
CREATE POLICY "Submissions viewable by owning college or admin"
  ON submission_entries FOR SELECT
  USING (auth_user_role() = 'admin' OR college_affl_no = auth_user_affl_no());

CREATE POLICY "Submissions insertable by owning college"
  ON submission_entries FOR INSERT
  WITH CHECK (college_affl_no = auth_user_affl_no() OR auth_user_role() = 'admin');

-- Stages & Schedules
CREATE POLICY "Stages readable by all" ON stages FOR SELECT USING (true);
CREATE POLICY "Stages managed by admin" ON stages FOR ALL USING (auth_user_role() = 'admin');

CREATE POLICY "Schedules readable by all" ON schedules FOR SELECT USING (true);
CREATE POLICY "Schedules updatable by stage controller or admin"
  ON schedules FOR UPDATE
  USING (auth_user_role() IN ('admin', 'stage_controller'));

-- Results
CREATE POLICY "Results readable if published or staff"
  ON results FOR SELECT
  USING (published = true OR auth_user_role() IN ('admin', 'result_entry'));

CREATE POLICY "Results insertable by result entry or admin"
  ON results FOR INSERT
  WITH CHECK (auth_user_role() IN ('admin', 'result_entry'));

CREATE POLICY "Results updatable by admin only"
  ON results FOR UPDATE
  USING (auth_user_role() = 'admin');

-- Appeals
CREATE POLICY "Appeals readable by author college or admin"
  ON appeals FOR SELECT
  USING (auth_user_role() = 'admin' OR mobile_number IS NOT NULL);

CREATE POLICY "Appeals insertable by anyone"
  ON appeals FOR INSERT WITH CHECK (true);

CREATE POLICY "Appeals updatable by admin"
  ON appeals FOR UPDATE
  USING (auth_user_role() = 'admin');

-- Granular Locks
CREATE POLICY "Locks readable by admin or college"
  ON college_item_locks FOR SELECT
  USING (auth_user_role() = 'admin' OR college_affl_no = auth_user_affl_no());

CREATE POLICY "Locks managed by admin"
  ON college_item_locks FOR ALL
  USING (auth_user_role() = 'admin');
