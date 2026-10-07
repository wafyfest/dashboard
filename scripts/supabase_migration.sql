-- ====================================================================
-- WSF Arts Fest Management System — Database Migration
-- SQL Script: Performance Indices & Row Level Security (RLS) Policies
-- Run this script in your Supabase SQL Editor (SQL Editor -> New Query)
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Ensure Table Schemas & Columns
-- --------------------------------------------------------------------

-- Colleges Table
CREATE TABLE IF NOT EXISTS public.colleges (
  id text NOT NULL PRIMARY KEY,
  affl_no integer NOT NULL UNIQUE,
  name text NOT NULL,
  short_name text,
  type text DEFAULT 'wafy',
  st_foundation integer DEFAULT 0,
  st_thamheediya integer DEFAULT 0,
  st_aliya integer DEFAULT 0,
  email text,
  address text,
  union_name text,
  contact_no text,
  union_email text,
  staff_coordinator_name text,
  staff_coordinator_phone text,
  staff_coordinator_whatsapp text,
  team_manager_name text,
  team_manager_phone text,
  team_manager_whatsapp text,
  asst_team_manager_name text,
  asst_team_manager_phone text,
  asst_team_manager_whatsapp text,
  fine_status boolean DEFAULT false,
  manual_lock_override boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Items Table
CREATE TABLE IF NOT EXISTS public.items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id integer NOT NULL UNIQUE,
  item_code text NOT NULL UNIQUE,
  name_eng text NOT NULL,
  name_mal text,
  phase text DEFAULT 'Senior',
  mode text DEFAULT 'onstage',
  category text DEFAULT 'A',
  tabulation boolean DEFAULT true,
  point_type text DEFAULT 'individual',
  no_of_participants integer DEFAULT 1,
  l_star boolean DEFAULT false,
  em_star boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Students Table
CREATE TABLE IF NOT EXISTS public.students (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  admission_no text,
  college_affl_no integer REFERENCES public.colleges(affl_no) ON DELETE CASCADE,
  class text,
  phase text,
  phone text,
  photo_url text,
  chest_no text,
  created_at timestamp with time zone DEFAULT now()
);

-- Ensure chest_no column exists on existing students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS chest_no text;

-- Registrations Table
CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id integer REFERENCES public.items(item_id) ON DELETE CASCADE,
  college_affl_no integer REFERENCES public.colleges(affl_no) ON DELETE CASCADE,
  chest_no text,
  code_letter character(2),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT registrations_item_id_chest_no_key UNIQUE (item_id, chest_no)
);

-- Ensure chest_no and code_letter exist on existing registrations table
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS chest_no text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS code_letter character(2);

-- Appeals Table
CREATE TABLE IF NOT EXISTS public.appeals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_affl_no integer REFERENCES public.colleges(affl_no) ON DELETE CASCADE,
  item_id integer REFERENCES public.items(item_id) ON DELETE CASCADE,
  reason text NOT NULL,
  fee_receipt_url text,
  status text DEFAULT 'Pending',
  admin_remarks text,
  created_at timestamp with time zone DEFAULT now()
);

-- Entry Locks Matrix Table
CREATE TABLE IF NOT EXISTS public.entry_locks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id integer REFERENCES public.items(item_id) ON DELETE CASCADE,
  college_affl_no integer REFERENCES public.colleges(affl_no) ON DELETE CASCADE,
  is_open boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT entry_locks_item_college_key UNIQUE (item_id, college_affl_no)
);

-- Fest Settings Table
CREATE TABLE IF NOT EXISTS public.fest_settings (
  id integer NOT NULL PRIMARY KEY DEFAULT 1,
  fest_name text DEFAULT '14TH WAFY ARTS FEST',
  reg_deadline timestamp with time zone,
  fine_deadline timestamp with time zone,
  rulebook_url text,
  created_at timestamp with time zone DEFAULT now()
);


-- --------------------------------------------------------------------
-- 2. Performance Indices for High Concurrency Peak Hours
-- --------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_registrations_college_affl ON public.registrations(college_affl_no);
CREATE INDEX IF NOT EXISTS idx_registrations_item_id ON public.registrations(item_id);
CREATE INDEX IF NOT EXISTS idx_registrations_chest_no ON public.registrations(chest_no);

CREATE INDEX IF NOT EXISTS idx_students_college_affl ON public.students(college_affl_no);
CREATE INDEX IF NOT EXISTS idx_students_chest_no ON public.students(chest_no);

CREATE INDEX IF NOT EXISTS idx_entry_locks_college ON public.entry_locks(college_affl_no);
CREATE INDEX IF NOT EXISTS idx_entry_locks_item ON public.entry_locks(item_id);


-- --------------------------------------------------------------------
-- 3. Row Level Security (RLS) Enablement
-- --------------------------------------------------------------------

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fest_settings ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------------------
-- 4. RLS Policies Configuration
-- --------------------------------------------------------------------

-- Registrations Policies
DROP POLICY IF EXISTS "Allow public read access to registrations" ON public.registrations;
CREATE POLICY "Allow public read access to registrations"
  ON public.registrations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for registrations" ON public.registrations;
CREATE POLICY "Allow insert for registrations"
  ON public.registrations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for registrations" ON public.registrations;
CREATE POLICY "Allow delete for registrations"
  ON public.registrations FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow update for registrations" ON public.registrations;
CREATE POLICY "Allow update for registrations"
  ON public.registrations FOR UPDATE USING (true);

-- Items Policies
DROP POLICY IF EXISTS "Allow public read access to items" ON public.items;
CREATE POLICY "Allow public read access to items"
  ON public.items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write access to items" ON public.items;
CREATE POLICY "Allow write access to items"
  ON public.items FOR ALL USING (true);

-- Colleges Policies
DROP POLICY IF EXISTS "Allow public read access to colleges" ON public.colleges;
CREATE POLICY "Allow public read access to colleges"
  ON public.colleges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update access to colleges" ON public.colleges;
CREATE POLICY "Allow update access to colleges"
  ON public.colleges FOR ALL USING (true);

-- Students Policies
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
CREATE POLICY "Allow public read access to students"
  ON public.students FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write access to students" ON public.students;
CREATE POLICY "Allow write access to students"
  ON public.students FOR ALL USING (true);

-- Appeals Policies
DROP POLICY IF EXISTS "Allow public read access to appeals" ON public.appeals;
CREATE POLICY "Allow public read access to appeals"
  ON public.appeals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write access to appeals" ON public.appeals;
CREATE POLICY "Allow write access to appeals"
  ON public.appeals FOR ALL USING (true);

-- Entry Locks Policies
DROP POLICY IF EXISTS "Allow public read access to entry_locks" ON public.entry_locks;
CREATE POLICY "Allow public read access to entry_locks"
  ON public.entry_locks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write access to entry_locks" ON public.entry_locks;
CREATE POLICY "Allow write access to entry_locks"
  ON public.entry_locks FOR ALL USING (true);

-- Fest Settings Policies
DROP POLICY IF EXISTS "Allow public read access to fest_settings" ON public.fest_settings;
CREATE POLICY "Allow public read access to fest_settings"
  ON public.fest_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write access to fest_settings" ON public.fest_settings;
CREATE POLICY "Allow write access to fest_settings"
  ON public.fest_settings FOR ALL USING (true);

-- --------------------------------------------------------------------
-- 5. Data Identity Normalization & Self-Healing Migration
-- Fixes legacy registrations containing raw student UUIDs or Admission Nos
-- --------------------------------------------------------------------

-- Ensure all students have a valid, non-null chest_no
UPDATE public.students
SET chest_no = CASE
  WHEN admission_no IS NOT NULL AND admission_no <> '' THEN 'ST-' || admission_no
  ELSE 'CH-' || SUBSTRING(id FROM 1 FOR 6)
END
WHERE chest_no IS NULL OR chest_no = '' OR chest_no ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Clean up registrations where chest_no was stored as student UUID
UPDATE public.registrations r
SET chest_no = s.chest_no
FROM public.students s
WHERE (r.chest_no = s.id OR r.chest_no = s.admission_no)
  AND s.chest_no IS NOT NULL
  AND s.chest_no <> '';

-- Clean up results where chest_no was stored as student UUID
UPDATE public.results r
SET chest_no = s.chest_no
FROM public.students s
WHERE (r.chest_no = s.id OR r.chest_no = s.admission_no)
  AND s.chest_no IS NOT NULL
  AND s.chest_no <> '';

-- Clean up submission entries where chest_no was stored as student UUID
UPDATE public.submission_entries sub
SET chest_no = s.chest_no
FROM public.students s
WHERE (sub.chest_no = s.id OR sub.chest_no = s.admission_no)
  AND s.chest_no IS NOT NULL
  AND s.chest_no <> '';

-- Compound index for fast student registration lookups
CREATE INDEX IF NOT EXISTS idx_registrations_item_college_chest
  ON public.registrations(item_id, college_affl_no, chest_no);

-- ====================================================================
-- Migration Script Complete
-- ====================================================================
