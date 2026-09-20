-- ====================================================================
-- Inter-College Arts Fest Seed Data
-- ====================================================================

-- 1. Fest Settings
INSERT INTO fest_settings (id, fest_name, reg_deadline, fine_deadline, rulebook_url)
VALUES (
  1,
  'Kala Utsav 2026 - Inter-College Arts Fest',
  now() + interval '5 days',
  now() + interval '8 days',
  'https://example.com/rulebook.pdf'
) ON CONFLICT (id) DO UPDATE SET
  fest_name = EXCLUDED.fest_name,
  reg_deadline = EXCLUDED.reg_deadline;

-- 2. Stages
INSERT INTO stages (id, name, location) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Main Auditorium (Kalam Hall)', 'Campus Block A - Ground Floor'),
  ('a2222222-2222-2222-2222-222222222222', 'Open Air Theatre (OAT)', 'Central Quadrangle'),
  ('a3333333-3333-3333-3333-333333333333', 'Mini Hall 1 (Symphony)', 'Fine Arts Block - Level 2'),
  ('a4444444-4444-4444-4444-444444444444', 'Seminar Hall 3', 'Administrative Wing');

-- 3. Colleges
INSERT INTO colleges (id, name, code, affiliation_no, email, address, coordinator_name, coordinator_phone, fine_status, manual_lock_override) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'St. Teresa National College', 'STNC', 'AF-2024-019', 'fest@stnc.edu', '12 Riverbank Road, City Center', 'Dr. Evelyn Thomas', '+91 98471 23456', false, false),
  ('b2222222-2222-2222-2222-222222222222', 'Apex Institute of Technology & Arts', 'AITA', 'AF-2024-042', 'arts@apex.edu', 'Plot 4, Knowledge Park', 'Prof. Arvind Menon', '+91 97452 88990', false, false),
  ('b3333333-3333-3333-3333-333333333333', 'Government Victoria Memorial College', 'GVMC', 'AF-2024-003', 'artsclub@gvmc.ac.in', 'Heritage Hill, North Gate', 'Dr. Radhika Nair', '+91 94473 11223', true, false),
  ('b4444444-4444-4444-4444-444444444444', 'Loyola Academy of Fine Sciences', 'LAFS', 'AF-2024-081', 'culcom@loyola.edu', 'Lake View Boulevard', 'Rev. Fr. Joseph Paul', '+91 98950 44556', false, true);

-- 4. Items (Events)
INSERT INTO items (id, code, name, category, item_type, min_participants, max_participants, is_locked) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'ITM-101', 'Classical Dance (Bharatanatyam)', 'Senior', 'Single', 1, 1, false),
  ('c2222222-2222-2222-2222-222222222222', 'ITM-102', 'Light Music Vocal (Solo)', 'General', 'Single', 1, 1, false),
  ('c3333333-3333-3333-3333-333333333333', 'ITM-103', 'Western Group Song', 'General', 'Group', 4, 8, false),
  ('c4444444-4444-4444-4444-444444444444', 'ITM-104', 'Mime (Theatrical Act)', 'Senior', 'Group', 3, 6, false),
  ('c5555555-5555-5555-5555-555555555555', 'ITM-105', 'Elocution (English)', 'Junior', 'Single', 1, 1, false),
  ('c6666666-6666-6666-6666-666666666666', 'ITM-106', 'Oil Painting & Canvas', 'General', 'Single', 1, 1, false),
  ('c7777777-7777-7777-7777-777777777777', 'ITM-107', 'Inter-Collegiate Quiz', 'General', 'Group', 2, 2, false);

-- 5. Schedules
INSERT INTO schedules (id, item_id, stage_id, scheduled_start, status) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', now() + interval '1 hour', 'Next_Item'),
  ('d2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', now() + interval '30 minutes', 'Starting_Soon'),
  ('d3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', now() + interval '2 hours', 'Upcoming'),
  ('d4444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111', now() - interval '1 hour', 'Ended');

-- 6. Sample Students
INSERT INTO students (id, college_id, admission_no, full_name, category, chest_no, phone) VALUES
  ('e1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'ST-2022-412', 'Ananya Sharma', 'Senior', 'CH-101', '+91 98471 00101'),
  ('e2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'ST-2023-118', 'Rahul Verma', 'General', 'CH-102', '+91 98471 00102'),
  ('e3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'AP-2022-809', 'Naveen Kurien', 'General', 'CH-201', '+91 97452 00201'),
  ('e4444444-4444-4444-4444-444444444444', 'b2222222-2222-2222-2222-222222222222', 'AP-2021-344', 'Pooja Bhatt', 'Senior', 'CH-202', '+91 97452 00202'),
  ('e5555555-5555-5555-5555-555555555555', 'b3333333-3333-3333-3333-333333333333', 'GV-2023-054', 'Siddharth Rao', 'Junior', 'CH-301', '+91 94473 00301');
