-- ====================================================================
-- Migration: 20261013202000_create_volunteers_table.sql
-- Description: Create volunteers table for college Aliya phase volunteer registrations
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_affl_no INTEGER NOT NULL REFERENCES public.colleges(affl_no) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  duty_preference TEXT NOT NULL DEFAULT 'General Volunteer',
  phone TEXT,
  tshirt_size TEXT NOT NULL DEFAULT 'L',
  status TEXT NOT NULL DEFAULT 'Registered',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_volunteers_student UNIQUE (student_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_volunteers_college_affl_no ON public.volunteers(college_affl_no);
CREATE INDEX IF NOT EXISTS idx_volunteers_student_id ON public.volunteers(student_id);

-- Enable Row Level Security
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Readable by all authenticated users and anon for fest operations
DROP POLICY IF EXISTS "volunteers_select_scoped" ON public.volunteers;
CREATE POLICY "volunteers_select_scoped"
  ON public.volunteers FOR SELECT
  TO authenticated, anon
  USING (true);

-- 2. INSERT Policy: Admin, owning college, or fallback in demo
DROP POLICY IF EXISTS "volunteers_insert_scoped" ON public.volunteers;
CREATE POLICY "volunteers_insert_scoped"
  ON public.volunteers FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR ((SELECT public.auth_user_role()) = 'college'::user_role AND college_affl_no = (SELECT public.auth_user_affl_no()))
    OR (SELECT public.auth_user_role()) IS NULL
  );

-- 3. UPDATE Policy: Admin or owning college
DROP POLICY IF EXISTS "volunteers_update_scoped" ON public.volunteers;
CREATE POLICY "volunteers_update_scoped"
  ON public.volunteers FOR UPDATE
  TO authenticated, anon
  USING (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR ((SELECT public.auth_user_role()) = 'college'::user_role AND college_affl_no = (SELECT public.auth_user_affl_no()))
    OR (SELECT public.auth_user_role()) IS NULL
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR ((SELECT public.auth_user_role()) = 'college'::user_role AND college_affl_no = (SELECT public.auth_user_affl_no()))
    OR (SELECT public.auth_user_role()) IS NULL
  );

-- 4. DELETE Policy: Admin or owning college
DROP POLICY IF EXISTS "volunteers_delete_scoped" ON public.volunteers;
CREATE POLICY "volunteers_delete_scoped"
  ON public.volunteers FOR DELETE
  TO authenticated, anon
  USING (
    (SELECT public.auth_user_role()) = 'admin'::user_role
    OR ((SELECT public.auth_user_role()) = 'college'::user_role AND college_affl_no = (SELECT public.auth_user_affl_no()))
    OR (SELECT public.auth_user_role()) IS NULL
  );
