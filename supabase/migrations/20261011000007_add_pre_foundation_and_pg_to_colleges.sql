-- Migration: 20261011000007_add_pre_foundation_and_pg_to_colleges.sql
-- Description: Adds st_pre_foundation and st_pg columns to colleges table and synchronizes all student phase counts with the students table.

ALTER TABLE colleges 
  ADD COLUMN IF NOT EXISTS st_pre_foundation INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS st_pg INT DEFAULT 0;

-- Synchronize phase student counts exactly from the registered students table
UPDATE colleges c
SET 
  st_pre_foundation = COALESCE((SELECT COUNT(*) FROM students s WHERE s.college_affl_no = c.affl_no AND s.phase = 'Pre Foundation'), 0),
  st_foundation = COALESCE((SELECT COUNT(*) FROM students s WHERE s.college_affl_no = c.affl_no AND s.phase = 'Foundation'), 0),
  st_thamheediya = COALESCE((SELECT COUNT(*) FROM students s WHERE s.college_affl_no = c.affl_no AND s.phase = 'Thamheediya'), 0),
  st_aliya = COALESCE((SELECT COUNT(*) FROM students s WHERE s.college_affl_no = c.affl_no AND s.phase = 'Aliya'), 0),
  st_pg = COALESCE((SELECT COUNT(*) FROM students s WHERE s.college_affl_no = c.affl_no AND s.phase = 'PG'), 0);
