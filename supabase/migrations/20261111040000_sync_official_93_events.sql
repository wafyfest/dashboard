-- ============================================================================
-- Migration: 20261111040000_sync_official_93_events.sql
-- Description:
--   Rewrites `public.events` to match the official 93-event rulebook catalog
--   (FN001–FF024 Foundation, TN025–TF052 Thamheediyya, AN053–AF087 Aliya,
--    GN088–GN089 General, SE090–SE093 Special Program) with exact English
--   and Malayalam spellings.
--   Uses a 2-hop ID swap to preserve all existing schedules, results,
--   registrations, entry locks, appeals, and audit logs across shifted IDs.
-- ============================================================================

BEGIN;

-- 0. Add explicit `is_submission` flag so stage mode stays strictly `'onstage'` or `'offstage'`
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_submission BOOLEAN NOT NULL DEFAULT false;

-- 1. Canonical 93-event specification + mapping from old item_id (NULL if brand new)
CREATE TEMP TABLE _event_spec (
  target_id INT PRIMARY KEY,
  old_id INT,
  item_code TEXT NOT NULL,
  name_eng TEXT NOT NULL,
  name_mal TEXT NOT NULL,
  phase TEXT NOT NULL,
  mode public.item_mode NOT NULL,
  is_submission BOOLEAN NOT NULL DEFAULT false
) ON COMMIT DROP;

INSERT INTO _event_spec (target_id, old_id, item_code, name_eng, name_mal, phase, mode, is_submission) VALUES
  -- 5.1 Foundation (1-24)
  (1,  1,    'FN001', 'Qira''ath',                  'ഖിറാഅത്ത്',                       'Foundation',  'onstage',  false),
  (2,  2,    'FN002', 'Speech Malayalam',           'പ്രസംഗം മലയാളം',                   'Foundation',  'onstage',  false),
  (3,  NULL, 'FN003', 'Speech Arabic',              'പ്രസംഗം അറബിക്',                   'Foundation',  'onstage',  false),
  (4,  3,    'FN004', 'Inspiring Talk English',     'ഇൻസ്പെറിംഗ് ടോക്ക് ഇംഗ്ലീഷ്',       'Foundation',  'onstage',  false),
  (5,  4,    'FN005', 'Conversation English',       'കോൺവെർസേഷൻ ഇംഗ്ലീഷ്',              'Foundation',  'onstage',  false),
  (6,  5,    'FN006', 'Story Weaving',              'സ്റ്റോറി വേവിങ്',                   'Foundation',  'onstage',  false),
  (7,  6,    'FN007', 'Read & Reflect',             'റീഡ് & റിഫ്ലക്ട്',                  'Foundation',  'onstage',  false),
  (8,  7,    'FN008', 'Padapayattu English',        'പദപയറ്റ് ഇംഗ്ലീഷ്',                 'Foundation',  'onstage',  false),
  (9,  8,    'FN009', 'Lecturing',                  'ലക്ചറിംഗ്',                        'Foundation',  'onstage',  false),
  (10, 9,    'FN010', 'Master Hunt',                'മാസ്റ്റർ ഹണ്ട്',                    'Foundation',  'onstage',  false),
  (11, 10,   'FN011', 'Instant Crafting',           'ഇൻസ്റ്റന്റ് ക്രാഫ്റ്റിംഗ്',            'Foundation',  'onstage',  false),
  (12, 11,   'FN012', 'Geo Locate',                 'ജിയോ ലൊക്കേറ്റ്',                   'Foundation',  'onstage',  false),
  (13, 12,   'FN013', 'Sudoku',                     'സുഡോക്കു',                          'Foundation',  'onstage',  false),
  (14, 13,   'FN014', 'Madh Song Malayalam',        'മദ്ഹ് ഗാനം മലയാളം',                'Foundation',  'onstage',  false),
  (15, 14,   'FN015', 'Group Song',                 'സംഘഗാനം',                          'Foundation',  'onstage',  false),
  (16, 15,   'FF016', 'Essay Malayalam',            'പ്രബന്ധം മലയാളം',                  'Foundation',  'offstage', false),
  (17, 16,   'FF017', 'Short Essay English',        'ലഘു പ്രബന്ധം ഇംഗ്ലീഷ്',             'Foundation',  'offstage', false),
  (18, 17,   'FF018', 'Story Malayalam',            'കഥ മലയാളം',                        'Foundation',  'offstage', false),
  (19, NULL, 'FF019', 'Story English',              'കഥ ഇംഗ്ലീഷ്',                       'Foundation',  'offstage', false),
  (20, 18,   'FF020', 'Poem Malayalam',             'കവിത മലയാളം',                      'Foundation',  'offstage', false),
  (21, 19,   'FF021', 'Painting',                   'പെയിന്റിംഗ്',                       'Foundation',  'offstage', false),
  (22, 20,   'FF022', 'Mental Ability Test (MAT)',  'മെന്റൽ എബിലിറ്റി ടെസ്റ്റ് (MAT)',    'Foundation',  'offstage', false),
  (23, 21,   'FF023', 'Story Telling',              'സ്റ്റോറി ടെല്ലിങ്',                 'Foundation',  'offstage', false),
  (24, NULL, 'FF024', 'Vlogging',                   'വ്ലോഗിങ്',                          'Foundation',  'offstage', true),

  -- 5.2 Thamheediyya (25-52)
  (25, 23,   'TN025', 'Qira''ath',                  'ഖിറാഅത്ത്',                       'Thamheediyya', 'onstage',  false),
  (26, 24,   'TN026', 'Speech Malayalam',           'പ്രസംഗം മലയാളം',                   'Thamheediyya', 'onstage',  false),
  (27, 25,   'TN027', 'Speech Arabic',              'പ്രസംഗം അറബിക്',                   'Thamheediyya', 'onstage',  false),
  (28, 26,   'TN028', 'Impact Talk',                'ഇമ്പാക്ട് ടോക്ക്',                  'Thamheediyya', 'onstage',  false),
  (29, 27,   'TN029', 'Debate Malayalam',           'ഡിബേറ്റ് മലയാളം',                   'Thamheediyya', 'onstage',  false),
  (30, 28,   'TN030', 'Padapayattu Arabic',         'പദപയറ്റ് അറബിക്',                  'Thamheediyya', 'onstage',  false),
  (31, 29,   'TN031', 'Word Craft',                 'വേർഡ് ക്രാഫ്റ്റ്',                  'Thamheediyya', 'onstage',  false),
  (32, 30,   'TN032', 'Jange Alfaz',                'ജങ്കെ അൽഫാസ്',                     'Thamheediyya', 'onstage',  false),
  (33, 31,   'TN033', 'Master Hunt',                'മാസ്റ്റർ ഹണ്ട്',                    'Thamheediyya', 'onstage',  false),
  (34, 32,   'TN034', 'Grammar Hunt',               'ഗ്രാമർ ഹണ്ട്',                     'Thamheediyya', 'onstage',  false),
  (35, 33,   'TN035', 'Lecturing',                  'ലക്ചറിംഗ്',                        'Thamheediyya', 'onstage',  false),
  (36, 34,   'TN036', 'Song Malayalam',             'ഗാനം മലയാളം',                      'Thamheediyya', 'onstage',  false),
  (37, 35,   'TF037', 'Essay Malayalam',            'പ്രബന്ധം മലയാളം',                  'Thamheediyya', 'offstage', false),
  (38, 36,   'TF038', 'Essay Arabic',               'പ്രബന്ധം അറബിക്',                  'Thamheediyya', 'offstage', false),
  (39, 37,   'TF039', 'Essay English',              'പ്രബന്ധം ഇംഗ്ലീഷ്',                 'Thamheediyya', 'offstage', false),
  (40, 38,   'TF040', 'Poem Malayalam',             'കവിത മലയാളം',                      'Thamheediyya', 'offstage', false),
  (41, 39,   'TF041', 'Story Malayalam',            'കഥ മലയാളം',                        'Thamheediyya', 'offstage', false),
  (42, 40,   'TF042', 'Story English',              'കഥ ഇംഗ്ലീഷ്',                       'Thamheediyya', 'offstage', false),
  (43, 41,   'TF043', 'Mini Story Malayalam',       'മിനിക്കഥ മലയാളം',                   'Thamheediyya', 'offstage', false),
  (44, 42,   'TF044', 'Report Malayalam',           'റിപ്പോർട്ട് മലയാളം',                'Thamheediyya', 'offstage', false),
  (45, 43,   'TF045', 'Cartoon',                    'കാർട്ടൂൺ',                          'Thamheediyya', 'offstage', false),
  (46, 44,   'TF046', 'Painting',                   'പെയിന്റിംഗ്',                       'Thamheediyya', 'offstage', false),
  (47, 45,   'TF047', 'Photography',                'ഫോട്ടോഗ്രാഫി',                     'Thamheediyya', 'offstage', true),
  (48, 46,   'TF048', 'Digital Designing',          'ഡിജിറ്റൽ ഡിസൈനിങ്',                'Thamheediyya', 'offstage', true),
  (49, 47,   'TF049', 'AI Video Creation',          'എ.ഐ വീഡിയോ ക്രിയേഷൻ',             'Thamheediyya', 'offstage', true),
  (50, 48,   'TF050', 'Mental Ability Test (MAT)',  'മെന്റൽ എബിലിറ്റി ടെസ്റ്റ് (MAT)',    'Thamheediyya', 'offstage', false),
  (51, 49,   'TF051', 'Story Telling',              'സ്റ്റോറി ടെല്ലിങ്',                 'Thamheediyya', 'offstage', false),
  (52, 50,   'TF052', 'Reacting',                   'റിയാക്റ്റിംഗ്',                      'Thamheediyya', 'offstage', false),

  -- 5.3 Aliya (53-87)
  (53, 51,   'AN053', 'Qira''ath',                  'ഖിറാഅത്ത്',                       'Aliya',       'onstage',  false),
  (54, 52,   'AN054', 'Speech Malayalam',           'പ്രസംഗം മലയാളം',                   'Aliya',       'onstage',  false),
  (55, 53,   'AN055', 'Speech Arabic',              'പ്രസംഗം അറബിക്',                   'Aliya',       'onstage',  false),
  (56, 54,   'AN056', 'Impact Talk',                'ഇമ്പാക്ട് ടോക്ക്',                  'Aliya',       'onstage',  false),
  (57, 55,   'AN057', 'Speech Urdu',                'പ്രസംഗം ഉറുദു',                    'Aliya',       'onstage',  false),
  (58, 56,   'AN058', 'Debate Malayalam',           'ഡിബേറ്റ് മലയാളം',                   'Aliya',       'onstage',  false),
  (59, 57,   'AN059', 'Encounter',                  'എൻകൗണ്ടർ',                         'Aliya',       'onstage',  false),
  (60, 58,   'AN060', 'Spot Translation (A-M)',     'സ്പോട്ട് ട്രാൻസ്ലേഷൻ (A-M)',       'Aliya',       'onstage',  false),
  (61, 59,   'AN061', 'Mock Interview',             'മോക്ക് ഇന്റർവ്യൂ',                  'Aliya',       'onstage',  false),
  (62, 60,   'AN062', 'Kaviyarang',                 'കവിയരങ്ങ്',                         'Aliya',       'onstage',  false),
  (63, 61,   'AN063', 'Pitch Perfect',              'പിച്ച് പെർഫെക്റ്റ്',                'Aliya',       'onstage',  false),
  (64, 62,   'AN064', 'Juriscope',                  'ജുരിസ്കോപ്പ്',                     'Aliya',       'onstage',  false),
  (65, 63,   'AN065', 'Master Hunt',                'മാസ്റ്റർ ഹണ്ട്',                    'Aliya',       'onstage',  false),
  (66, 64,   'AN066', 'Song Malayalam',             'ഗാനം മലയാളം',                      'Aliya',       'onstage',  false),
  (67, 65,   'AF067', 'Essay Malayalam',            'പ്രബന്ധം മലയാളം',                  'Aliya',       'offstage', false),
  (68, 66,   'AF068', 'Essay Arabic',               'പ്രബന്ധം അറബിക്',                  'Aliya',       'offstage', false),
  (69, 67,   'AF069', 'Essay English',              'പ്രബന്ധം ഇംഗ്ലീഷ്',                 'Aliya',       'offstage', false),
  (70, 68,   'AF070', 'Short Essay Urdu',           'ലഘു പ്രബന്ധം ഉറുദു',                'Aliya',       'offstage', false),
  (71, 69,   'AF071', 'Poem Arabic',                'കവിത അറബിക്',                      'Aliya',       'offstage', false),
  (72, 70,   'AF072', 'Story Malayalam',            'കഥ മലയാളം',                        'Aliya',       'offstage', false),
  (73, 71,   'AF073', 'Story English',              'കഥ ഇംഗ്ലീഷ്',                       'Aliya',       'offstage', false),
  (74, 72,   'AF074', 'Mini Story Malayalam',       'മിനിക്കഥ മലയാളം',                   'Aliya',       'offstage', false),
  (75, 73,   'AF075', 'Report Malayalam',           'റിപ്പോർട്ട് മലയാളം',                'Aliya',       'offstage', false),
  (76, 74,   'AF076', 'Report Arabic',              'റിപ്പോർട്ട് അറബിക്',                'Aliya',       'offstage', false),
  (77, 75,   'AF077', 'Report English',             'റിപ്പോർട്ട് ഇംഗ്ലീഷ്',               'Aliya',       'offstage', false),
  (78, 76,   'AF078', 'Cartoon',                    'കാർട്ടൂൺ',                          'Aliya',       'offstage', false),
  (79, 77,   'AF079', 'Photo Essay',                'ഫോട്ടോ എസ്സേ',                      'Aliya',       'offstage', true),
  (80, 78,   'AF080', 'Q & H Painting',             'Q & H പെയിന്റിംഗ്',                 'Aliya',       'offstage', false),
  (81, 79,   'AF081', 'Translation (A-M)',          'ട്രാൻസ്ലേഷൻ (A-M)',                'Aliya',       'offstage', false),
  (82, 80,   'AF082', 'Translation (E-M)',          'ട്രാൻസ്ലേഷൻ (E-M)',                'Aliya',       'offstage', false),
  (83, 81,   'AF083', 'Song Writing',               'ഗാനരചന',                           'Aliya',       'offstage', false),
  (84, 82,   'AF084', 'Short Vlogging',             'ഷോർട്ട് വ്ലോഗിങ്',                  'Aliya',       'offstage', true),
  (85, 83,   'AF085', 'Brand Building',             'ബ്രാൻഡ് ബിൽഡിംഗ്',                'Aliya',       'offstage', true),
  (86, 84,   'AF086', 'Podcast',                    'പോഡ്കാസ്റ്റ്',                      'Aliya',       'offstage', true),
  (87, NULL, 'AF087', 'Data Analysis',              'ഡാറ്റാ അനാലിസിസ്',                 'Aliya',       'offstage', false),

  -- 5.4 General (88-89) — Thamheediyya & Aliya only
  (88, NULL, 'GN088', 'Kavyapayattu',               'കാവ്യപ്പയറ്റ്',                      'General',     'onstage',  false),
  (89, NULL, 'GN089', 'Mashup',                     'മാഷപ്പ്',                          'General',     'onstage',  false),

  -- 5.5 Special Program (90-93)
  (90, NULL, 'SE090', 'Campaign Setting',           'ക്യാമ്പയിൻ സെറ്റിങ്',               'Special',              'offstage', false),
  (91, NULL, 'SE091', 'Moral Video Making',         'മോറൽ വീഡിയോ മേക്കിംഗ്',             'Special',              'offstage', true),
  (92, NULL, 'SE092', 'Expo (Foundation Only)',     'എക്സ്പോ (ഫൗണ്ടേഷൻ വിഭാഗത്തിന് മാത്രം)', 'Special - Foundation', 'offstage', false),
  (93, NULL, 'SE093', 'Live Art',                   'ലൈവ് ആർട്ട്',                      'Special',              'onstage',  false);

-- 2. Disable user triggers temporarily so quota/audit triggers don't interfere with ID re-indexing
ALTER TABLE public.registrations DISABLE TRIGGER USER;
ALTER TABLE public.results DISABLE TRIGGER USER;
ALTER TABLE public.schedules DISABLE TRIGGER USER;
ALTER TABLE public.entry_locks DISABLE TRIGGER USER;
ALTER TABLE public.appeals DISABLE TRIGGER USER;

-- 3. Hop 1: Insert shadow target events at item_id = target_id + 10000
INSERT INTO public.events (
  item_id, item_code, name_eng, name_mal, phase, mode, is_submission,
  category, tabulation, point_type, no_of_participants,
  reg_deadline, fine_deadline, l_star, em_star, is_locked
)
SELECT
  s.target_id + 10000,
  'TMP_' || s.item_code,
  s.name_eng,
  s.name_mal,
  s.phase,
  s.mode,
  s.is_submission,
  COALESCE(e.category, 'A'),
  COALESCE(e.tabulation, true),
  COALESCE(e.point_type, 'individual'::public.point_type),
  COALESCE(e.no_of_participants, 1),
  e.reg_deadline,
  e.fine_deadline,
  COALESCE(e.l_star, false),
  COALESCE(e.em_star, false),
  COALESCE(e.is_locked, false)
FROM _event_spec s
LEFT JOIN public.events e ON e.item_id = s.old_id;

-- 4. Hop 1: Repoint all referencing child rows from old_id -> target_id + 10000
UPDATE public.registrations t SET item_id = s.target_id + 10000 FROM _event_spec s WHERE t.item_id = s.old_id;
UPDATE public.registration_logs t SET item_id = s.target_id + 10000 FROM _event_spec s WHERE t.item_id = s.old_id;
UPDATE public.code_letters t SET item_id = s.target_id + 10000 FROM _event_spec s WHERE t.item_id = s.old_id;
UPDATE public.submission_entries t SET item_id = s.target_id + 10000 FROM _event_spec s WHERE t.item_id = s.old_id;
UPDATE public.schedules t SET item_id = s.target_id + 10000 FROM _event_spec s WHERE t.item_id = s.old_id;
UPDATE public.results t SET item_id = s.target_id + 10000 FROM _event_spec s WHERE t.item_id = s.old_id;
UPDATE public.appeals t SET item_id = s.target_id + 10000 FROM _event_spec s WHERE t.item_id = s.old_id;
UPDATE public.entry_locks t SET item_id = s.target_id + 10000 FROM _event_spec s WHERE t.item_id = s.old_id;
UPDATE public.late_registrations t SET item_id = s.target_id + 10000 FROM _event_spec s WHERE t.item_id = s.old_id;
UPDATE public.system_audit_logs t SET item_id = s.target_id + 10000 FROM _event_spec s WHERE t.item_id = s.old_id;

-- Clean any retired/unmapped legacy event references (e.g., old item_id 22 Quiz)
DELETE FROM public.registration_logs WHERE item_id < 10000;
DELETE FROM public.appeals WHERE item_id < 10000;
UPDATE public.system_audit_logs SET item_id = NULL WHERE item_id < 10000;

-- Remove old event rows (now unreferenced by mapped children)
DELETE FROM public.events WHERE item_id < 10000;

-- 5. Hop 2: Insert final canonical 93 events at item_id = 1..93
INSERT INTO public.events (
  item_id, item_code, name_eng, name_mal, phase, mode, is_submission,
  category, tabulation, point_type, no_of_participants,
  reg_deadline, fine_deadline, l_star, em_star, is_locked
)
SELECT
  s.target_id,
  s.item_code,
  s.name_eng,
  s.name_mal,
  s.phase,
  s.mode,
  s.is_submission,
  tmp.category,
  tmp.tabulation,
  tmp.point_type,
  tmp.no_of_participants,
  tmp.reg_deadline,
  tmp.fine_deadline,
  tmp.l_star,
  tmp.em_star,
  tmp.is_locked
FROM _event_spec s
JOIN public.events tmp ON tmp.item_id = s.target_id + 10000;

-- 6. Hop 2: Repoint all child rows from target_id + 10000 -> target_id
UPDATE public.registrations SET item_id = item_id - 10000 WHERE item_id >= 10000;
UPDATE public.registration_logs SET item_id = item_id - 10000 WHERE item_id >= 10000;
UPDATE public.code_letters SET item_id = item_id - 10000 WHERE item_id >= 10000;
UPDATE public.submission_entries SET item_id = item_id - 10000 WHERE item_id >= 10000;
UPDATE public.schedules SET item_id = item_id - 10000 WHERE item_id >= 10000;
UPDATE public.results SET item_id = item_id - 10000 WHERE item_id >= 10000;
UPDATE public.appeals SET item_id = item_id - 10000 WHERE item_id >= 10000;
UPDATE public.entry_locks SET item_id = item_id - 10000 WHERE item_id >= 10000;
UPDATE public.late_registrations SET item_id = item_id - 10000 WHERE item_id >= 10000;
UPDATE public.system_audit_logs SET item_id = item_id - 10000 WHERE item_id >= 10000;

-- Delete shadow event rows
DELETE FROM public.events WHERE item_id >= 10000;

-- 7. Sync sequence for future event inserts
SELECT setval('public.events_item_id_seq', COALESCE((SELECT MAX(item_id) FROM public.events), 0) + 1, false);

-- 8. Re-enable user triggers
ALTER TABLE public.registrations ENABLE TRIGGER USER;
ALTER TABLE public.results ENABLE TRIGGER USER;
ALTER TABLE public.schedules ENABLE TRIGGER USER;
ALTER TABLE public.entry_locks ENABLE TRIGGER USER;
ALTER TABLE public.appeals ENABLE TRIGGER USER;

-- 9. Normalize legacy 'Thamheediya' phase spelling across related tables
UPDATE public.students SET phase = 'Thamheediyya' WHERE LOWER(TRIM(phase)) = 'thamheediya';
UPDATE public.points_matrix SET phase = 'Thamheediyya' WHERE LOWER(TRIM(phase)) = 'thamheediya';
UPDATE public.appeals SET phase = 'Thamheediyya' WHERE LOWER(TRIM(phase)) = 'thamheediya';
UPDATE public.max_participation m
SET phase = 'Thamheediyya'
WHERE LOWER(TRIM(m.phase)) = 'thamheediya'
  AND NOT EXISTS (
    SELECT 1 FROM public.max_participation m2 WHERE LOWER(TRIM(m2.phase)) = 'thamheediyya'
  );

-- 10. Update check_registration_quota() to:
--     a) Restrict 'General' events (GN088, GN089) to Thamheediyya & Aliya students only
--     b) Restrict 'Special - Foundation' (SE092) to Foundation students only
--     c) Allow all student phases in 'Special' events (SE090, SE091, SE093)
--     d) Exempt all Special Programs ('Special%') from student max_participation quotas
CREATE OR REPLACE FUNCTION public.check_registration_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cic_no BIGINT;
  v_student_phase TEXT;
  v_norm_stu_phase TEXT;
  v_target_mode TEXT;
  v_target_point_type TEXT;
  v_target_item_id INT;
  v_target_phase TEXT;
  v_norm_target_phase TEXT;

  v_on_max INT;
  v_off_max INT;
  v_total_max INT;
  v_group_max INT;

  v_current_total INT := 0;
  v_current_on INT := 0;
  v_current_off INT := 0;
  v_current_group INT := 0;
BEGIN
  IF NEW.chest_no IS NULL OR TRIM(NEW.chest_no) = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_cic_no := regexp_replace(NEW.chest_no, '\D', '', 'g')::BIGINT;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  SELECT phase INTO v_student_phase
  FROM public.students
  WHERE cic_no = v_cic_no
  LIMIT 1;

  IF v_student_phase IS NULL THEN
    SELECT phase, cic_no INTO v_student_phase, v_cic_no
    FROM public.students
    WHERE id::text = NEW.chest_no
    LIMIT 1;
  END IF;

  IF v_student_phase IS NULL THEN
    v_student_phase := 'General';
  END IF;

  SELECT mode::text, point_type::text, item_id, phase
  INTO v_target_mode, v_target_point_type, v_target_item_id, v_target_phase
  FROM public.events
  WHERE item_id = NEW.item_id
  LIMIT 1;

  IF v_target_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_norm_stu_phase := LOWER(TRIM(COALESCE(v_student_phase, '')));
  v_norm_target_phase := LOWER(TRIM(COALESCE(v_target_phase, '')));

  -- Enforce phase eligibility for General (Thamheediyya & Aliya only) and Special - Foundation (Foundation only)
  IF v_norm_target_phase = 'general' THEN
    IF v_norm_stu_phase NOT IN ('thamheediyya', 'thamheediya', 'thamheed', 'th', 'junior', 'aliya', 'al', 'senior') THEN
      RAISE EXCEPTION 'Phase eligibility error: Only Thamheediyya and Aliya students can participate in General events (student phase: %).',
        v_student_phase
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_norm_target_phase IN ('special - foundation', 'special_foundation', 'foundation') THEN
    IF v_norm_stu_phase NOT IN ('foundation', 'fd', 'pre foundation', 'pre_foundation', 'pfd', 'pfd1', 'sub_junior', 'sub junior', 'sub-junior') THEN
      RAISE EXCEPTION 'Phase eligibility error: Only Foundation students can participate in % events (student phase: %).',
        v_target_phase, v_student_phase
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_norm_target_phase = 'thamheediyya' THEN
    IF v_norm_stu_phase NOT IN ('thamheediyya', 'thamheediya', 'thamheed', 'th', 'junior') THEN
      RAISE EXCEPTION 'Phase eligibility error: Only Thamheediyya students can participate in Thamheediyya events (student phase: %).',
        v_student_phase
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_norm_target_phase = 'aliya' THEN
    IF v_norm_stu_phase NOT IN ('aliya', 'al', 'senior') THEN
      RAISE EXCEPTION 'Phase eligibility error: Only Aliya students can participate in Aliya events (student phase: %).',
        v_student_phase
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_norm_target_phase = 'pg' THEN
    IF v_norm_stu_phase != 'pg' THEN
      RAISE EXCEPTION 'Phase eligibility error: Only PG students can participate in PG events (student phase: %).',
        v_student_phase
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Special Programs do NOT count toward student max_participation quotas
  IF v_norm_target_phase LIKE 'special%' THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(on_max, 99),
    COALESCE(off_max, 99),
    COALESCE(total_max, 99),
    COALESCE(group_max, 99)
  INTO v_on_max, v_off_max, v_total_max, v_group_max
  FROM public.max_participation
  WHERE (
    CASE
      WHEN LOWER(TRIM(phase)) IN ('foundation', 'fd', 'pre foundation', 'pre_foundation', 'pfd', 'pfd1', 'sub_junior', 'sub junior', 'sub-junior') THEN 'foundation'
      WHEN LOWER(TRIM(phase)) IN ('thamheediyya', 'thamheediya', 'thamheed', 'th', 'junior') THEN 'thamheediyya'
      WHEN LOWER(TRIM(phase)) IN ('aliya', 'al', 'senior') THEN 'aliya'
      ELSE LOWER(TRIM(phase))
    END
  ) = (
    CASE
      WHEN v_norm_stu_phase IN ('foundation', 'fd', 'pre foundation', 'pre_foundation', 'pfd', 'pfd1', 'sub_junior', 'sub junior', 'sub-junior') THEN 'foundation'
      WHEN v_norm_stu_phase IN ('thamheediyya', 'thamheediya', 'thamheed', 'th', 'junior') THEN 'thamheediyya'
      WHEN v_norm_stu_phase IN ('aliya', 'al', 'senior') THEN 'aliya'
      ELSE v_norm_stu_phase
    END
  )
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT
      COALESCE(on_max, 99),
      COALESCE(off_max, 99),
      COALESCE(total_max, 99),
      COALESCE(group_max, 99)
    INTO v_on_max, v_off_max, v_total_max, v_group_max
    FROM public.max_participation
    WHERE LOWER(phase) = 'general'
    LIMIT 1;
  END IF;

  IF v_total_max IS NULL THEN
    v_on_max := 3;
    v_off_max := 4;
    v_total_max := 5;
    v_group_max := 3;
  END IF;

  -- Count existing registrations excluding Special Programs
  SELECT
    COUNT(DISTINCT r.item_id),
    COUNT(DISTINCT CASE WHEN i.mode::text = 'onstage' THEN r.item_id END),
    COUNT(DISTINCT CASE WHEN i.mode::text != 'onstage' THEN r.item_id END),
    COUNT(DISTINCT CASE WHEN i.point_type::text = 'group' THEN r.item_id END)
  INTO
    v_current_total,
    v_current_on,
    v_current_off,
    v_current_group
  FROM public.registrations r
  JOIN public.events i ON i.item_id = r.item_id
  WHERE (
    regexp_replace(COALESCE(r.chest_no, ''), '\D', '', 'g') = v_cic_no::text
    OR r.chest_no = NEW.chest_no
  )
  AND (TG_OP = 'INSERT' OR r.id != NEW.id)
  AND r.item_id != NEW.item_id
  AND LOWER(TRIM(COALESCE(i.phase, ''))) NOT LIKE 'special%';

  IF (v_current_total + 1) > v_total_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed total events for phase % is % (currently registered for %).',
      v_student_phase, v_total_max, v_current_total
      USING ERRCODE = '23514';
  END IF;

  IF v_target_mode = 'onstage' AND (v_current_on + 1) > v_on_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed onstage events for phase % is % (currently registered for %).',
      v_student_phase, v_on_max, v_current_on
      USING ERRCODE = '23514';
  END IF;

  IF v_target_mode != 'onstage' AND (v_current_off + 1) > v_off_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed offstage events for phase % is % (currently registered for %).',
      v_student_phase, v_off_max, v_current_off
      USING ERRCODE = '23514';
  END IF;

  IF v_target_point_type = 'group' AND (v_current_group + 1) > v_group_max THEN
    RAISE EXCEPTION 'Student quota exceeded: maximum allowed group events for phase % is % (currently registered for %).',
      v_student_phase, v_group_max, v_current_group
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
