-- Migration: Create replacements table and RLS policies
CREATE TABLE IF NOT EXISTS public.replacements (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  registration_id uuid NULL,
  original_student_id uuid NULL,
  replacement_student_id uuid NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'Pending'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT replacements_pkey PRIMARY KEY (id),
  CONSTRAINT replacements_original_student_id_fkey FOREIGN KEY (original_student_id) REFERENCES students (id) ON DELETE SET NULL,
  CONSTRAINT replacements_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES registrations (id) ON DELETE CASCADE,
  CONSTRAINT replacements_replacement_student_id_fkey FOREIGN KEY (replacement_student_id) REFERENCES students (id) ON DELETE SET NULL,
  CONSTRAINT replacements_status_check CHECK (
    (
      status = ANY (
        ARRAY[
          'Pending'::text,
          'Approved'::text,
          'Rejected'::text
        ]
      )
    )
  )
);

-- Enable RLS
ALTER TABLE public.replacements ENABLE ROW LEVEL SECURITY;

-- Create Permissive RLS Policies for Anon / Authenticated roles
DROP POLICY IF EXISTS "Allow public select replacements" ON public.replacements;
CREATE POLICY "Allow public select replacements" ON public.replacements
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public insert replacements" ON public.replacements;
CREATE POLICY "Allow public insert replacements" ON public.replacements
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update replacements" ON public.replacements;
CREATE POLICY "Allow public update replacements" ON public.replacements
  FOR UPDATE TO public USING (true) WITH CHECK (true);
