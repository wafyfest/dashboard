-- ============================================================================
-- Migration: Sync Official 93 Events Catalog from Updated Fest Spreadsheet
-- Date: 2026-11-11
-- Description:
--   Synchronizes all 93 events (item_id 1..93) with updated:
--     - Bilingual English & Malayalam titles (fixing typos + keeping 'Thamheediyya')
--     - Phases (keeping 'Special' on SE090/SE091/SE093 and 'Special - Foundation' on SE092)
--     - Stage modes ('onstage' / 'offstage'; keeping 'offstage' on SE092 Expo)
--     - Categories ('A', 'B', 'C', 'D')
--     - Tabulation flags (true for 1..89, false for 90..93)
--     - Point types & participant counts (FN015 Group Song = group / 3;
--       SE090-SE093 no_of_participants = NULL)
--   Preserves existing UUIDs, item_ids, is_submission, is_screening,
--   deadlines, star flags, lock states, and all foreign-key child rows.
-- ============================================================================

BEGIN;

WITH official_events (
  item_id,
  item_code,
  name_eng,
  name_mal,
  phase,
  mode,
  category,
  tabulation,
  point_type,
  no_of_participants,
  is_submission,
  is_screening
) AS (
  VALUES
    -- Foundation (1-24)
    (1,  'FN001', 'Qira''ath',                  'ഖിറാഅത്ത്',                    'Foundation',   'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (2,  'FN002', 'Speech Malayalam',           'പ്രസംഗം മലയാളം',                'Foundation',   'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (3,  'FN003', 'Speech Arabic',              'പ്രസംഗം അറബിക്',                'Foundation',   'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (4,  'FN004', 'Inspiring Talk English',     'ഇൻസ്പയറിംഗ് ടോക്ക് ഇംഗ്ലീഷ്',   'Foundation',   'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (5,  'FN005', 'Conversation English',       'കോൺവെർസേഷൻ ഇംഗ്ലീഷ്',           'Foundation',   'onstage'::public.item_mode,  'A'::char(1), true,  'group'::public.point_type,      2,    false, false),
    (6,  'FN006', 'Story Weaving',              'സ്റ്റോറി വേവിംഗ്',                'Foundation',   'onstage'::public.item_mode,  'B'::char(1), true,  'group'::public.point_type,      3,    false, false),
    (7,  'FN007', 'Read & Reflect',             'റീഡ് & റിഫ്ലക്ട്',               'Foundation',   'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (8,  'FN008', 'Word Play English',          'പദപ്പയറ്റ് ഇംഗ്ലീഷ്',              'Foundation',   'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (9,  'FN009', 'Lecturing',                  'ലക്ചറിംഗ്',                     'Foundation',   'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (10, 'FN010', 'Master Hunt',                'മാസ്റ്റർ ഹണ്ട്',                 'Foundation',   'onstage'::public.item_mode,  'A'::char(1), true,  'group'::public.point_type,      2,    false, false),
    (11, 'FN011', 'Instant Crafting',           'ഇൻസ്റ്റൻ്റ് ക്രാഫ്റ്റിംഗ്',         'Foundation',   'onstage'::public.item_mode,  'B'::char(1), true,  'group'::public.point_type,      2,    false, false),
    (12, 'FN012', 'Geo Locate',                 'ജിയോ ലൊക്കേറ്റ്',                'Foundation',   'onstage'::public.item_mode,  'B'::char(1), true,  'group'::public.point_type,      2,    false, false),
    (13, 'FN013', 'Sudoku',                     'സുഡോകു',                       'Foundation',   'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (14, 'FN014', 'Madh Song Malayalam',        'മദ്ഹ് ഗാനം മലയാളം',             'Foundation',   'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (15, 'FN015', 'Group Song',                 'സംഘഗാനം',                       'Foundation',   'onstage'::public.item_mode,  'C'::char(1), true,  'group'::public.point_type,      3,    false, false),
    (16, 'FF016', 'Essay Malayalam',            'പ്രബന്ധം മലയാളം',               'Foundation',   'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (17, 'FF017', 'Short Essay English',        'ലഘു പ്രബന്ധം ഇംഗ്ലീഷ്',          'Foundation',   'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (18, 'FF018', 'Story Malayalam',            'കഥ മലയാളം',                     'Foundation',   'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (19, 'FF019', 'Story English',              'കഥ ഇംഗ്ലീഷ്',                    'Foundation',   'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (20, 'FF020', 'Poem Malayalam',             'കവിത മലയാളം',                   'Foundation',   'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (21, 'FF021', 'Painting',                   'പെയിന്റിംഗ്',                    'Foundation',   'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (22, 'FF022', 'Mental Ability Test (MAT)',  'മെന്റൽ എബിലിറ്റി ടെസ്റ്റ് (MAT)', 'Foundation',   'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (23, 'FF023', 'Story Telling',              'സ്റ്റോറി ടെല്ലിംഗ്',              'Foundation',   'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (24, 'FF024', 'Vlogging',                   'വ്ളോഗിംഗ്',                      'Foundation',   'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    true,  false),

    -- Thamheediyya (25-52)
    (25, 'TN025', 'Qira''ath',                  'ഖിറാഅത്ത്',                    'Thamheediyya', 'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (26, 'TN026', 'Speech Malayalam',           'പ്രസംഗം മലയാളം',                'Thamheediyya', 'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, true),
    (27, 'TN027', 'Speech Arabic',              'പ്രസംഗം അറബിക്',                'Thamheediyya', 'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, true),
    (28, 'TN028', 'Impact Talk',                'ഇംപാക്റ്റ് ടോക്ക്',               'Thamheediyya', 'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, true),
    (29, 'TN029', 'Debate Malayalam',           'ഡിബേറ്റ് മലയാളം',                'Thamheediyya', 'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (30, 'TN030', 'Word Play Arabic',           'പദപ്പയറ്റ് അറബിക്',               'Thamheediyya', 'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (31, 'TN031', 'Word Craft',                 'വേർഡ് ക്രാഫ്റ്റ്',               'Thamheediyya', 'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (32, 'TN032', 'Jange Alfaz',                'ജങ്കെ അൽഫാസ്',                  'Thamheediyya', 'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (33, 'TN033', 'Master Hunt',                'മാസ്റ്റർ ഹണ്ട്',                 'Thamheediyya', 'onstage'::public.item_mode,  'A'::char(1), true,  'group'::public.point_type,      2,    false, false),
    (34, 'TN034', 'Grammar Hunt',               'ഗ്രാമർ ഹണ്ട്',                  'Thamheediyya', 'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (35, 'TN035', 'Lecturing',                  'ലക്ചറിംഗ്',                     'Thamheediyya', 'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, true),
    (36, 'TN036', 'Song Malayalam',             'ഗാനം മലയാളം',                   'Thamheediyya', 'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, true),
    (37, 'TF037', 'Essay Malayalam',            'പ്രബന്ധം മലയാളം',               'Thamheediyya', 'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (38, 'TF038', 'Essay Arabic',               'പ്രബന്ധം അറബിക്',               'Thamheediyya', 'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (39, 'TF039', 'Essay English',              'പ്രബന്ധം ഇംഗ്ലീഷ്',              'Thamheediyya', 'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (40, 'TF040', 'Poem Malayalam',             'കവിത മലയാളം',                   'Thamheediyya', 'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (41, 'TF041', 'Story Malayalam',            'കഥ മലയാളം',                     'Thamheediyya', 'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (42, 'TF042', 'Story English',              'കഥ ഇംഗ്ലീഷ്',                    'Thamheediyya', 'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (43, 'TF043', 'Mini Story Malayalam',       'മിനിക്കഥ മലയാളം',                'Thamheediyya', 'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (44, 'TF044', 'Report Malayalam',           'റിപ്പോർട്ട് മലയാളം',             'Thamheediyya', 'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (45, 'TF045', 'Cartoon',                    'കാർട്ടൂൺ',                       'Thamheediyya', 'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (46, 'TF046', 'Painting',                   'പെയിന്റിംഗ്',                    'Thamheediyya', 'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (47, 'TF047', 'Photography',                'ഫോട്ടോഗ്രാഫി',                  'Thamheediyya', 'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    true,  false),
    (48, 'TF048', 'Digital Designing',          'ഡിജിറ്റൽ ഡിസൈനിംഗ്',             'Thamheediyya', 'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    true,  false),
    (49, 'TF049', 'AI Video Creation',          'എ ഐ വീഡിയോ ക്രിയേഷൻ',          'Thamheediyya', 'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    true,  false),
    (50, 'TF050', 'Mental Ability Test (MAT)',  'മെന്റൽ എബിലിറ്റി ടെസ്റ്റ് (MAT)', 'Thamheediyya', 'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (51, 'TF051', 'Story Telling',              'സ്റ്റോറി ടെല്ലിംഗ്',              'Thamheediyya', 'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (52, 'TF052', 'Reacting',                   'റിയാക്റ്റിംഗ്',                   'Thamheediyya', 'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),

    -- Aliya (53-87)
    (53, 'AN053', 'Qira''ath',                  'ഖിറാഅത്ത്',                    'Aliya',        'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (54, 'AN054', 'Speech Malayalam',           'പ്രസംഗം മലയാളം',                'Aliya',        'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, true),
    (55, 'AN055', 'Speech Arabic',              'പ്രസംഗം അറബിക്',                'Aliya',        'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, true),
    (56, 'AN056', 'Impact Talk',                'ഇംപാക്റ്റ് ടോക്ക്',               'Aliya',        'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, true),
    (57, 'AN057', 'Speech Urdu',                'പ്രസംഗം ഉറുദു',                 'Aliya',        'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, true),
    (58, 'AN058', 'Debate Malayalam',           'ഡിബേറ്റ് മലയാളം',                'Aliya',        'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (59, 'AN059', 'Encounter',                  'എൻകൗണ്ടർ',                      'Aliya',        'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, true),
    (60, 'AN060', 'Spot Translation (A-M)',     'സ്പോട്ട് ട്രാൻസ്ലേഷൻ (A-M)',    'Aliya',        'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, true),
    (61, 'AN061', 'Mock Interview',             'മോക്ക് ഇന്റർവ്യൂ',               'Aliya',        'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (62, 'AN062', 'Kaviyarang',                 'കവിയരങ്ങ്',                      'Aliya',        'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (63, 'AN063', 'Pitch Perfect',              'പിച്ച് പെർഫെക്റ്റ്',             'Aliya',        'onstage'::public.item_mode,  'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (64, 'AN064', 'Juriscope',                  'ജൂറിസ്കോപ്പ്',                  'Aliya',        'onstage'::public.item_mode,  'A'::char(1), true,  'group'::public.point_type,      3,    false, false),
    (65, 'AN065', 'Master Hunt',                'മാസ്റ്റർ ഹണ്ട്',                 'Aliya',        'onstage'::public.item_mode,  'A'::char(1), true,  'group'::public.point_type,      2,    false, false),
    (66, 'AN066', 'Song Malayalam',             'ഗാനം മലയാളം',                   'Aliya',        'onstage'::public.item_mode,  'B'::char(1), true,  'individual'::public.point_type, 1,    false, true),
    (67, 'AF067', 'Essay Malayalam',            'പ്രബന്ധം മലയാളം',               'Aliya',        'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (68, 'AF068', 'Essay Arabic',               'പ്രബന്ധം അറബിക്',               'Aliya',        'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (69, 'AF069', 'Essay English',              'പ്രബന്ധം ഇംഗ്ലീഷ്',              'Aliya',        'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (70, 'AF070', 'Short Essay Urdu',           'ലഘു പ്രബന്ധം ഉറുദു',             'Aliya',        'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (71, 'AF071', 'Poem Arabic',                'കവിത അറബിക്',                    'Aliya',        'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (72, 'AF072', 'Story Malayalam',            'കഥ മലയാളം',                     'Aliya',        'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (73, 'AF073', 'Story English',              'കഥ ഇംഗ്ലീഷ്',                    'Aliya',        'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (74, 'AF074', 'Mini Story Malayalam',       'മിനിക്കഥ മലയാളം',                'Aliya',        'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (75, 'AF075', 'Report Malayalam',           'റിപ്പോർട്ട് മലയാളം',             'Aliya',        'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (76, 'AF076', 'Report Arabic',              'റിപ്പോർട്ട് അറബിക്',             'Aliya',        'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (77, 'AF077', 'Report English',             'റിപ്പോർട്ട് ഇംഗ്ലീഷ്',            'Aliya',        'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (78, 'AF078', 'Cartoon',                    'കാർട്ടൂൺ',                       'Aliya',        'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (79, 'AF079', 'Photo Essay',                'ഫോട്ടോ എസ്സേ',                   'Aliya',        'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    true,  false),
    (80, 'AF080', 'Q & H Painting',             'Q & H പെയിന്റിംഗ്',              'Aliya',        'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (81, 'AF081', 'Translation (A-M)',          'ട്രാൻസ്ലേഷൻ (A-M)',             'Aliya',        'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (82, 'AF082', 'Translation (E-M)',          'ട്രാൻസ്ലേഷൻ (E-M)',             'Aliya',        'offstage'::public.item_mode, 'A'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (83, 'AF083', 'Song Writing',               'ഗാനരചന',                        'Aliya',        'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    false, false),
    (84, 'AF084', 'Short Vlogging',             'ഷോർട്ട് വ്ലോഗിംഗ്',             'Aliya',        'offstage'::public.item_mode, 'B'::char(1), true,  'individual'::public.point_type, 1,    true,  false),
    (85, 'AF085', 'Brand Building',             'ബ്രാൻഡ് ബിൽഡിംഗ്',             'Aliya',        'offstage'::public.item_mode, 'C'::char(1), true,  'individual'::public.point_type, 1,    true,  false),
    (86, 'AF086', 'Podcast',                    'പോഡ്കാസ്റ്റ്',                   'Aliya',        'offstage'::public.item_mode, 'C'::char(1), true,  'group'::public.point_type,      3,    true,  false),
    (87, 'AF087', 'Data Analysis',              'ഡാറ്റാ അനാലിസിസ്',              'Aliya',        'offstage'::public.item_mode, 'A'::char(1), true,  'group'::public.point_type,      2,    false, false),

    -- General (88-89)
    (88, 'GN088', 'Kavyappayattu',              'കാവ്യപ്പയറ്റ്',                   'General',      'onstage'::public.item_mode,  'C'::char(1), true,  'group'::public.point_type,      3,    false, false),
    (89, 'GN089', 'Mashup',                     'മാഷപ്പ്',                       'General',      'onstage'::public.item_mode,  'C'::char(1), true,  'group'::public.point_type,      4,    false, true),

    -- Special / Category D Non-Tabulation Events (90-93, Special Program phases & blank participant limits)
    (90, 'SE090', 'Campaign Setting',           'കാമ്പയിൻ സെറ്റിംഗ്',            'Special',              'offstage'::public.item_mode, 'D'::char(1), false, 'group'::public.point_type,      NULL, false, false),
    (91, 'SE091', 'Moral Video Making',         'മോറൽ വീഡിയോ മേക്കിംഗ്',          'Special',              'offstage'::public.item_mode, 'D'::char(1), false, 'group'::public.point_type,      NULL, true,  false),
    (92, 'SE092', 'Expo',                       'എക്സ്പോ',                        'Special - Foundation', 'offstage'::public.item_mode, 'D'::char(1), false, 'individual'::public.point_type, NULL, false, false),
    (93, 'SE093', 'Live Art',                   'ലൈവ് ആർട്ട്',                   'Special',              'onstage'::public.item_mode,  'D'::char(1), false, 'individual'::public.point_type, NULL, false, false)
)
INSERT INTO public.events (
  item_id,
  item_code,
  name_eng,
  name_mal,
  phase,
  mode,
  category,
  tabulation,
  point_type,
  no_of_participants,
  is_submission,
  is_screening
)
SELECT
  item_id,
  item_code,
  name_eng,
  name_mal,
  phase,
  mode,
  category,
  tabulation,
  point_type,
  no_of_participants,
  is_submission,
  is_screening
FROM official_events
ON CONFLICT (item_id) DO UPDATE
SET
  item_code = EXCLUDED.item_code,
  name_eng = EXCLUDED.name_eng,
  name_mal = EXCLUDED.name_mal,
  phase = EXCLUDED.phase,
  mode = EXCLUDED.mode,
  category = EXCLUDED.category,
  tabulation = EXCLUDED.tabulation,
  point_type = EXCLUDED.point_type,
  no_of_participants = EXCLUDED.no_of_participants;

SELECT setval('public.events_item_id_seq', COALESCE((SELECT MAX(item_id) FROM public.events), 0) + 1, false);

COMMIT;
