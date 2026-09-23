-- ====================================================================
-- Wafy Inter-College Arts Fest Seed Data
-- ====================================================================

-- 1. Fest Settings
INSERT INTO fest_settings (id, fest_name, reg_deadline, fine_deadline, rulebook_url)
VALUES (
  1,
  'WSF Arts Fest 2025',
  now() + interval '5 days',
  now() + interval '8 days',
  'https://example.com/wsf_arts_manual.pdf'
) ON CONFLICT (id) DO UPDATE SET
  fest_name = EXCLUDED.fest_name,
  reg_deadline = EXCLUDED.reg_deadline;

-- 2. Max Participation Quotas
INSERT INTO max_participation (phase, off_max, on_max, total_max, group_max) VALUES
  ('Sub_Junior', 2, 2, 3, 2),
  ('Junior', 3, 2, 4, 2),
  ('Senior', 3, 3, 5, 2),
  ('General', 2, 2, 4, 3)
ON CONFLICT (phase) DO NOTHING;

-- 3. Stages
INSERT INTO stages (stage_number, name, location) VALUES
  (1, 'Stage 1: Main Auditorium (Kalam Hall)', 'Campus Block A - Ground Floor'),
  (2, 'Stage 2: Open Air Theatre (OAT)', 'Central Quadrangle'),
  (3, 'Stage 3: Mini Hall 1 (Symphony)', 'Fine Arts Block - Level 2'),
  (4, 'Stage 4: Seminar Hall 3', 'Administrative Wing')
ON CONFLICT (stage_number) DO NOTHING;

-- 4. Colleges
INSERT INTO colleges (
  affl_no, name, short_name, type, st_foundation, st_thamheediya, st_aliya,
  email, address, union_name, contact_no, union_email,
  staff_coordinator_name, staff_coordinator_phone, staff_coordinator_whatsapp,
  team_manager_name, team_manager_phone, team_manager_whatsapp,
  asst_team_manager_name, asst_team_manager_phone, asst_team_manager_whatsapp,
  fine_status, manual_lock_override
) VALUES
  (
    11,
    'PMSA POOKOYA THANGAL ISLAMIC & ARTS COLLEGE',
    'PMSA',
    'wafy',
    56, 61, 59,
    'masapmsawafy@gmail.com',
    'Kattilangadi, Athavanad, Athikkattukunnu Rd, Kurumbathur, Kerala 676310',
    'MASA Students Union',
    '9645845185',
    'union@pmsacollege.com',
    'Usthad Shafi Wafy', '9645845185', '9645845185',
    'Akbar shuhaib', '9539629410', '9539629410',
    'Muhammed Minhaj', '7306729618', '7306729618',
    false, false
  ),
  (
    102,
    'Markaz Garden Wafy College',
    'MGWC',
    'wafy',
    42, 50, 48,
    'contact@markazgarden.edu',
    'Poonoor, Unnikulam, Kozhikode, Kerala 673574',
    'Garden Union',
    '9847122334',
    'union@markazgarden.edu',
    'Prof. Abdul Latheef', '9847122334', '9847122334',
    'Zainudheen K.', '9745233445', '9745233445',
    'Rashid Ali', '9447344556', '9447344556',
    false, false
  ),
  (
    103,
    'Darul Uloom Wafy College',
    'DUWC',
    'prof',
    38, 45, 40,
    'office@darululoom.ac.in',
    'Vazhakkad, Malappuram, Kerala 673640',
    'Al-Huda Union',
    '9447311223',
    'union@darululoom.ac.in',
    'Dr. Hameed K.K.', '9447311223', '9447311223',
    'Salman Faris', '9895055667', '9895055667',
    'Anas M.', '9847166778', '9847166778',
    true, false
  )
ON CONFLICT (affl_no) DO NOTHING;

-- 5. Items (Bilingual English & Malayalam)
INSERT INTO items (
  item_id, item_code, name_eng, name_mal, phase, mode, category, tabulation, point_type, no_of_participants, l_star, em_star, is_locked
) VALUES
  (1, 'ITM-01', 'Quran Recitation (Qiraath)', 'ഖുർആൻ പാരായണം', 'Senior', 'onstage', 'A', true, 'individual', 1, true, false, false),
  (2, 'ITM-02', 'Elocution (Malayalam)', 'പ്രസംഗം (മലയാളം)', 'Junior', 'onstage', 'A', true, 'individual', 1, false, true, false),
  (3, 'ITM-03', 'Elocution (Arabic)', 'പ്രസംഗം (അറബിക്)', 'Senior', 'onstage', 'A', true, 'individual', 1, true, false, false),
  (4, 'ITM-04', 'Mappila Pattu (Solo)', 'മാപ്പിളപ്പാട്ട് (ഏകാംഗം)', 'General', 'onstage', 'B', true, 'individual', 1, false, false, false),
  (5, 'ITM-05', 'Duff Muttu (Ensemble)', 'ദഫ് മുട്ട് (സംഘം)', 'General', 'onstage', 'A', true, 'group', 6, true, true, false),
  (6, 'ITM-06', 'Essay Writing (English)', 'ഉപന്യാസം (ഇംഗ്ലീഷ്)', 'Senior', 'offstage', 'B', false, 'individual', 1, false, false, false),
  (7, 'ITM-07', 'Calligraphy (Arabic)', 'കലിഗ്രഫി (അറബിക്)', 'General', 'offstage', 'B', false, 'individual', 1, false, false, false),
  (8, 'ITM-08', 'Digital Fest Poster Design', 'ഡിജിറ്റൽ പോസ്റ്റർ ഡിസൈൻ', 'General', 'submission', 'C', false, 'individual', 1, false, false, false),
  (9, 'ITM-09', 'Inter-Collegiate Quiz', 'ക്വിസ് മത്സരം', 'General', 'onstage', 'A', true, 'group', 2, false, false, false)
ON CONFLICT (item_id) DO NOTHING;

-- 6. Students
INSERT INTO students (name, admission_no, college_affl_no, class, phase, chest_no, phone) VALUES
  ('Ahmad Bilal', 'ADM-2022-101', 11, 'Aliya Final', 'Senior', 'CH-101', '9847100101'),
  ('Ibrahim Faizal', 'ADM-2023-118', 11, 'Thamheediya 2', 'Junior', 'CH-102', '9847100102'),
  ('Muhammad Safwan', 'ADM-2024-205', 11, 'Foundation 1', 'Sub_Junior', 'CH-103', '9847100103'),
  ('Ameen Farhan', 'ADM-2022-314', 11, 'Aliya 1', 'Senior', 'CH-104', '9847100104'),
  ('Zaid Mansoor', 'ADM-2023-401', 11, 'Thamheediya 1', 'Junior', 'CH-105', '9847100105'),
  ('Rayyan Tariq', 'ADM-2022-509', 102, 'Aliya 2', 'Senior', 'CH-201', '9745200201'),
  ('Hassan Basheer', 'ADM-2023-612', 102, 'Thamheediya 2', 'Junior', 'CH-202', '9745200202'),
  ('Luqman Hakim', 'ADM-2022-771', 103, 'Aliya Final', 'Senior', 'CH-301', '9447300301')
ON CONFLICT (chest_no) DO NOTHING;

-- 7. Schedules
INSERT INTO schedules (item_id, stage_number, starting, ending, status) VALUES
  (1, 1, now() + interval '1 hour', now() + interval '3 hours', 'Next_Item'),
  (4, 2, now() + interval '30 minutes', now() + interval '2 hours', 'Starting_Soon'),
  (5, 1, now() + interval '4 hours', now() + interval '6 hours', 'Upcoming'),
  (9, 3, now() - interval '1 hour', now(), 'Ended')
ON CONFLICT DO NOTHING;

-- 8. Registrations (Multiple rows for group items!)
INSERT INTO registrations (item_id, college_affl_no, chest_no, code_letter) VALUES
  (1, 11, 'CH-101', 'A'),
  (4, 11, 'CH-102', 'A'),
  -- Duff Muttu Group (3 members from College 11)
  (5, 11, 'CH-101', 'B'),
  (5, 11, 'CH-104', 'B'),
  (5, 11, 'CH-105', 'B'),
  -- Qiraath from College 102
  (1, 102, 'CH-201', 'B')
ON CONFLICT (item_id, chest_no) DO NOTHING;

-- 9. Entry Locks Matrix (Item IDs as rows, College Affiliation Numbers as columns)
INSERT INTO entry_locks (item_id, college_affl_no, is_open) VALUES
  (1, 11, true),  (1, 101, true),  (1, 102, true),
  (2, 11, true),  (2, 101, false), (2, 102, true),
  (3, 11, true),  (3, 101, true),  (3, 102, true),
  (4, 11, true),  (4, 101, true),  (4, 102, true),
  (5, 11, true),  (5, 101, true),  (5, 102, false),
  (6, 11, true),  (6, 101, true),  (6, 102, true),
  (7, 11, true),  (7, 101, true),  (7, 102, true),
  (8, 11, true),  (8, 101, true),  (8, 102, true),
  (9, 11, false), (9, 101, false), (9, 102, false)
ON CONFLICT (item_id, college_affl_no) DO NOTHING;
