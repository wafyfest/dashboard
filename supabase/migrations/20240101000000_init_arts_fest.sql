-- ====================================================================
-- Inter-College Arts Fest Management System: Schema & RLS Migrations
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums
CREATE TYPE user_role AS ENUM ('admin', 'college', 'stage_controller', 'result_entry');
CREATE TYPE student_category AS ENUM ('Sub_Junior', 'Junior', 'Senior', 'General');
CREATE TYPE item_type AS ENUM ('Single', 'Group');
CREATE TYPE stage_status AS ENUM ('Upcoming', 'Next_Item', 'Starting_Soon', 'On_Going', 'Ended');
CREATE TYPE appeal_status AS ENUM ('Pending', 'Approved', 'Rejected');

-- 2. Colleges Table
CREATE TABLE colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  affiliation_no TEXT,
  email TEXT,
  address TEXT,
  coordinator_name TEXT,
  coordinator_phone TEXT,
  manager_name TEXT,
  manager_phone TEXT,
  fine_status BOOLEAN DEFAULT false,
  manual_lock_override BOOLEAN DEFAULT false, -- If true, overrides global locks
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Profiles & Roles (Tied to Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'college',
  college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
  admission_no TEXT NOT NULL,
  full_name TEXT NOT NULL,
  category student_category NOT NULL,
  phone TEXT,
  photo_url TEXT,
  chest_no TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(college_id, admission_no)
);

-- 5. Items (Events)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category student_category NOT NULL,
  item_type item_type NOT NULL,
  min_participants INT DEFAULT 1,
  max_participants INT DEFAULT 1,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. System Settings (Registration Deadlines)
CREATE TABLE fest_settings (
  id INT PRIMARY KEY DEFAULT 1,
  fest_name TEXT NOT NULL,
  reg_deadline TIMESTAMPTZ NOT NULL,
  fine_deadline TIMESTAMPTZ NOT NULL,
  rulebook_url TEXT
);

-- 7. College Specific Item Overrides (Granular Unlocks)
CREATE TABLE college_item_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  is_unlocked BOOLEAN NOT NULL DEFAULT true,
  unlocked_until TIMESTAMPTZ,
  UNIQUE(college_id, item_id)
);

-- 8. Registrations & Group Members
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  code_letter TEXT, -- Assigned by stage controller for blind judging (A, B, C...)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(college_id, item_id)
);

CREATE TABLE registration_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(registration_id, student_id)
);

-- 9. Stages & Schedules
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT
);

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  scheduled_start TIMESTAMPTZ NOT NULL,
  status stage_status DEFAULT 'Upcoming',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Results & Points
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) UNIQUE,
  first_reg_id UUID REFERENCES registrations(id),
  second_reg_id UUID REFERENCES registrations(id),
  third_reg_id UUID REFERENCES registrations(id),
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  last_edited_by UUID REFERENCES auth.users(id)
);

-- 11. Appeals & Replacements
CREATE TABLE appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id),
  item_id UUID REFERENCES items(id),
  reason TEXT NOT NULL,
  fee_receipt_url TEXT,
  status appeal_status DEFAULT 'Pending',
  admin_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE replacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id),
  original_student_id UUID REFERENCES students(id),
  replacement_student_id UUID REFERENCES students(id),
  reason TEXT NOT NULL,
  status appeal_status DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- Row Level Security (RLS) Configuration
-- ====================================================================

-- Helper Functions to read current user role & college from profiles
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_college_id()
RETURNS UUID AS $$
  SELECT college_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fest_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_item_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE replacements ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- Policies: profiles
-- --------------------------------------------------------------------
CREATE POLICY "Profiles viewable by owner or admin"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR auth_user_role() = 'admin');

CREATE POLICY "Profiles updatable by admin or owner"
  ON profiles FOR UPDATE
  USING (id = auth.uid() OR auth_user_role() = 'admin');

-- --------------------------------------------------------------------
-- Policies: colleges
-- --------------------------------------------------------------------
CREATE POLICY "Colleges viewable by everyone authenticated"
  ON colleges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Colleges managed by admin"
  ON colleges FOR ALL
  USING (auth_user_role() = 'admin');

CREATE POLICY "Colleges update own contact info"
  ON colleges FOR UPDATE
  USING (id = auth_user_college_id())
  WITH CHECK (id = auth_user_college_id());

-- --------------------------------------------------------------------
-- Policies: students
-- --------------------------------------------------------------------
CREATE POLICY "Students readable by authenticated or public viewers"
  ON students FOR SELECT
  USING (true);

CREATE POLICY "Colleges manage own students"
  ON students FOR ALL
  USING (auth_user_role() = 'admin' OR college_id = auth_user_college_id())
  WITH CHECK (auth_user_role() = 'admin' OR college_id = auth_user_college_id());

-- --------------------------------------------------------------------
-- Policies: items & fest_settings
-- --------------------------------------------------------------------
CREATE POLICY "Items readable by everyone"
  ON items FOR SELECT
  USING (true);

CREATE POLICY "Items modifiable by admin"
  ON items FOR ALL
  USING (auth_user_role() = 'admin');

CREATE POLICY "Fest settings readable by all"
  ON fest_settings FOR SELECT
  USING (true);

CREATE POLICY "Fest settings modifiable by admin"
  ON fest_settings FOR ALL
  USING (auth_user_role() = 'admin');

-- --------------------------------------------------------------------
-- Policies: college_item_locks
-- --------------------------------------------------------------------
CREATE POLICY "Locks viewable by admin and respective college"
  ON college_item_locks FOR SELECT
  USING (auth_user_role() = 'admin' OR college_id = auth_user_college_id());

CREATE POLICY "Locks managed by admin"
  ON college_item_locks FOR ALL
  USING (auth_user_role() = 'admin');

-- --------------------------------------------------------------------
-- Policies: registrations & participants
-- --------------------------------------------------------------------
CREATE POLICY "Registrations viewable by related college, admin, stage controller"
  ON registrations FOR SELECT
  USING (
    auth_user_role() IN ('admin', 'stage_controller')
    OR college_id = auth_user_college_id()
  );

CREATE POLICY "Colleges insert registrations if unlocked"
  ON registrations FOR INSERT
  WITH CHECK (
    auth_user_role() = 'admin'
    OR (
      college_id = auth_user_college_id()
      AND (
        EXISTS (
          SELECT 1 FROM college_item_locks cil
          WHERE cil.college_id = auth_user_college_id()
            AND cil.item_id = registrations.item_id
            AND cil.is_unlocked = true
            AND (cil.unlocked_until IS NULL OR cil.unlocked_until > now())
        )
        OR EXISTS (
          SELECT 1 FROM colleges c, fest_settings fs
          WHERE c.id = auth_user_college_id()
            AND (c.manual_lock_override = true OR fs.reg_deadline > now())
        )
      )
    )
  );

CREATE POLICY "Stage controller update code_letter"
  ON registrations FOR UPDATE
  USING (auth_user_role() IN ('admin', 'stage_controller'));

CREATE POLICY "Participants viewable by related users"
  ON registration_participants FOR SELECT
  USING (
    auth_user_role() IN ('admin', 'stage_controller')
    OR EXISTS (
      SELECT 1 FROM registrations r
      WHERE r.id = registration_participants.registration_id
        AND r.college_id = auth_user_college_id()
    )
  );

CREATE POLICY "Participants modifiable by admin or college"
  ON registration_participants FOR ALL
  USING (
    auth_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM registrations r
      WHERE r.id = registration_participants.registration_id
        AND r.college_id = auth_user_college_id()
    )
  );

-- --------------------------------------------------------------------
-- Policies: stages & schedules
-- --------------------------------------------------------------------
CREATE POLICY "Stages and schedules readable by everyone"
  ON stages FOR SELECT USING (true);

CREATE POLICY "Stages modifiable by admin"
  ON stages FOR ALL USING (auth_user_role() = 'admin');

CREATE POLICY "Schedules readable by everyone"
  ON schedules FOR SELECT USING (true);

CREATE POLICY "Schedules updatable by stage_controller or admin"
  ON schedules FOR UPDATE
  USING (auth_user_role() IN ('admin', 'stage_controller'));

CREATE POLICY "Schedules insert/delete by admin"
  ON schedules FOR ALL
  USING (auth_user_role() = 'admin');

-- --------------------------------------------------------------------
-- Policies: results
-- --------------------------------------------------------------------
CREATE POLICY "Results viewable if published or user is admin/result_entry"
  ON results FOR SELECT
  USING (published = true OR auth_user_role() IN ('admin', 'result_entry'));

CREATE POLICY "Result entry write-once insert"
  ON results FOR INSERT
  WITH CHECK (auth_user_role() IN ('admin', 'result_entry'));

CREATE POLICY "Results update restricted to admin"
  ON results FOR UPDATE
  USING (auth_user_role() = 'admin');

-- --------------------------------------------------------------------
-- Policies: appeals & replacements
-- --------------------------------------------------------------------
CREATE POLICY "Appeals viewable by author college or admin"
  ON appeals FOR SELECT
  USING (auth_user_role() = 'admin' OR college_id = auth_user_college_id());

CREATE POLICY "Appeals insertable by college"
  ON appeals FOR INSERT
  WITH CHECK (college_id = auth_user_college_id());

CREATE POLICY "Appeals updatable by admin"
  ON appeals FOR UPDATE
  USING (auth_user_role() = 'admin');

CREATE POLICY "Replacements viewable by author college or admin"
  ON replacements FOR SELECT
  USING (
    auth_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM registrations r
      WHERE r.id = replacements.registration_id
        AND r.college_id = auth_user_college_id()
    )
  );

CREATE POLICY "Replacements insertable by college"
  ON replacements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM registrations r
      WHERE r.id = replacements.registration_id
        AND r.college_id = auth_user_college_id()
    )
  );

CREATE POLICY "Replacements updatable by admin"
  ON replacements FOR UPDATE
  USING (auth_user_role() = 'admin');
