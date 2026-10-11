-- Migration: 20261011000006_update_colleges_with_14th_wafy_fest_data.sql
-- Description: Updates all 25 participating colleges with official 14th Wafy Fest response data
-- Replaces placeholder coordinator contacts and updates student strengths and campus addresses.

UPDATE colleges SET
  name = 'KKHM ISLAMIC & ARTS COLLEGE',
  short_name = 'KKHM, Valanchery',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 60,
  st_aliya = 0,
  email = 'kkhmiac@gmail.com',
  address = 'KKHM ISLAMIC & ARTS COLLEGE 
MARKAZ CAMPUS
KARTHALA (PO)
ATHAVANAD 
MALAPPURAM',
  union_name = 'Masrahul Mawahib Students Association (MMSA)',
  contact_no = NULL,
  union_email = 'kkhmunion@gmail.com',
  staff_coordinator_name = 'JUNAID WAFY',
  staff_coordinator_phone = '+91 62829 90092',
  staff_coordinator_whatsapp = '+91 62829 90092',
  team_manager_name = 'MOHAMMED AMEEN',
  team_manager_phone = '+91 75588 37993',
  team_manager_whatsapp = '+91 75588 37993',
  asst_team_manager_name = 'AHMAD NAJAD',
  asst_team_manager_phone = '+91 90487 79095',
  asst_team_manager_whatsapp = '+91 90487 79095'
WHERE affl_no = 1;

UPDATE colleges SET
  name = 'RASHEEDIYYA ISLAMIC & ARTS COLLEGE',
  short_name = 'Rasheediyya, Edavannappara',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 32,
  st_aliya = 0,
  email = 'rasheediyyacollege@gmail.com',
  address = 'Rasheediyya arabic college 
edavannappara, cheruvayoor (po)
malappuram (dt) kerala. pin: 673645',
  union_name = 'Rasheediyya students association',
  contact_no = NULL,
  union_email = 'rsawafyedp@gmail.com',
  staff_coordinator_name = 'Abdul Kareem Wafy',
  staff_coordinator_phone = '9633074682',
  staff_coordinator_whatsapp = '9633074682',
  team_manager_name = 'Hafiz Najmudheen CN',
  team_manager_phone = '7510266559',
  team_manager_whatsapp = '7510266559',
  asst_team_manager_name = 'Ameen Moosa kp',
  asst_team_manager_phone = '+91 88914 52949',
  asst_team_manager_whatsapp = '+91 88914 52949'
WHERE affl_no = 2;

UPDATE colleges SET
  name = 'MAJMA''A SHAREE-ATH & ARTS COLLEGE',
  short_name = 'Majma, Kavanoor',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 29,
  st_aliya = 51,
  email = 'kavanurmajmaa@gmail.com',
  address = 'MAJMA''A SHAREEATH AND ARTS COLLEGE KAVANUR
RAHMATH NAGAR, KAVANUR
KAVANUR PO
673639
MALAPPURAM',
  union_name = 'Noorul Huda Students Association',
  contact_no = NULL,
  union_email = 'nsamajmaakvr@gmail.com',
  staff_coordinator_name = 'USAMA RAHMANI',
  staff_coordinator_phone = '+91 95620 14529',
  staff_coordinator_whatsapp = '+91 95620 14529',
  team_manager_name = 'SHAKKIR',
  team_manager_phone = '+91 85908 77748',
  team_manager_whatsapp = '+91 85908 77748',
  asst_team_manager_name = 'MUZAMMIL',
  asst_team_manager_phone = '+91 96059 76547',
  asst_team_manager_whatsapp = '+91 96059 76547'
WHERE affl_no = 4;

UPDATE colleges SET
  name = 'PMSA POOKOYA THANGAL ISLAMIC & ARTS COLLEGE',
  short_name = 'PMSA, Kattilangadi',
  type = 'wafy'::college_type,
  st_foundation = 99,
  st_thamheediya = 0,
  st_aliya = 72,
  email = 'wafypmsa@gmail.com',
  address = 'KATTILANGADI, ATHAVANAD (PO), VETTICHIRA VIA',
  union_name = 'Munthajul Afnan Students'' Association (MASA)',
  contact_no = NULL,
  union_email = 'masapmsawafy@gmail.com',
  staff_coordinator_name = 'SHIYAS ALI WAFY',
  staff_coordinator_phone = '9495734473',
  staff_coordinator_whatsapp = '9495734473',
  team_manager_name = 'MOHAMMED SINAN TP',
  team_manager_phone = '75939 75534',
  team_manager_whatsapp = '75939 75534',
  asst_team_manager_name = 'VASEEM KM',
  asst_team_manager_phone = '9544725625',
  asst_team_manager_whatsapp = '9544725625'
WHERE affl_no = 11;

UPDATE colleges SET
  name = 'DARUL ULOOM ISLAMIC & ARTS COLLEGE',
  short_name = 'Darul Uloom, Thootha',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 46,
  st_aliya = 82,
  email = 'duiac.wafy@gmail.com',
  address = 'Paral, Thootha, Malappuram',
  union_name = 'AL MIRAS STUDENTS ASSOCIATION',
  contact_no = NULL,
  union_email = 'almiras.wafy@gmail.com',
  staff_coordinator_name = 'Aneesudheen wafy',
  staff_coordinator_phone = '+91 99473 12930',
  staff_coordinator_whatsapp = '+91 99473 12930',
  team_manager_name = 'Muhammad Shabil A',
  team_manager_phone = '+91 85905 40086',
  team_manager_whatsapp = '+91 85905 40086',
  asst_team_manager_name = 'Munavir',
  asst_team_manager_phone = '+91 81379 85871',
  asst_team_manager_whatsapp = '+91 81379 85871'
WHERE affl_no = 17;

UPDATE colleges SET
  name = 'BAFAKHY ISLAMIC& ARTS COLLEGE',
  short_name = 'Bafakhy Wafy, Valavannur',
  type = 'wafy'::college_type,
  st_foundation = 71,
  st_thamheediya = 28,
  st_aliya = 58,
  email = 'bafaqiwafy@gmail.com',
  address = 'Bafakhy Islamic & Arts College (WAFY)',
  union_name = 'Marta''ul hadaqa students association',
  contact_no = NULL,
  union_email = 'mhsabafaqi@gmail.com',
  staff_coordinator_name = 'Abdul rauf wafy',
  staff_coordinator_phone = '96458 17465',
  staff_coordinator_whatsapp = '96458 17465',
  team_manager_name = 'Mohammed jasil',
  team_manager_phone = '9746753543',
  team_manager_whatsapp = '9746753543',
  asst_team_manager_name = 'Amnas paleri',
  asst_team_manager_phone = '92078 60324',
  asst_team_manager_whatsapp = '92078 60324'
WHERE affl_no = 21;

UPDATE colleges SET
  name = 'ASSHUHADA ISLAMIC DA''WA COLLEGE',
  short_name = 'Assuhada, Mamba',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 27,
  st_aliya = 18,
  email = 'asshuhadamamba@gmail.com',
  address = 'Asshuhadha Wafy College, Mamba, Muzhappala (PO), Kannur, Kerala, PIN: 670611',
  union_name = 'Asshuhadha Students’ Association',
  contact_no = NULL,
  union_email = 'asamambawafy@gmail.com',
  staff_coordinator_name = 'Zubair Azhari',
  staff_coordinator_phone = '+91 94462 86338',
  staff_coordinator_whatsapp = '+91 94462 86338',
  team_manager_name = 'Marzuque C',
  team_manager_phone = '+91 91 88794 995',
  team_manager_whatsapp = '+91 91 88794 995',
  asst_team_manager_name = 'Ramshad K',
  asst_team_manager_phone = '+91 6235 837 523',
  asst_team_manager_whatsapp = '+91 6235 837 523'
WHERE affl_no = 32;

UPDATE colleges SET
  name = 'DARUSSALAM ISLAMIC & ARTS COLLEGE',
  short_name = 'Darussalam, Tirur',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 44,
  st_aliya = 60,
  email = 'Dicwafycollege@Gmail.Com',
  address = 'PERUNTHIRUTHI, CHENNARA - TIRUR, MALAPPURAM',
  union_name = 'SILM',
  contact_no = NULL,
  union_email = 'silmdictirur@gmail.com',
  staff_coordinator_name = 'Fayis Wafy Nattukal',
  staff_coordinator_phone = '99471 51681',
  staff_coordinator_whatsapp = '99471 51681',
  team_manager_name = 'Muhammed Nafih MP',
  team_manager_phone = '9567969115',
  team_manager_whatsapp = '9567969115',
  asst_team_manager_name = 'Muhammed Shahal p',
  asst_team_manager_phone = '8111807050',
  asst_team_manager_whatsapp = '8111807050'
WHERE affl_no = 33;

UPDATE colleges SET
  name = 'MTM ISLAMIC & ARTS COLLEGE',
  short_name = 'MTM, Chokli',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 8,
  st_aliya = 48,
  email = 'mtmchokli@gmail.com',
  address = 'MTM WAFY COLLEGE, KADUKKA BAZAR, CHOKLI. P. O, KANNUR,PIN-670676',
  union_name = 'Sadad students union',
  contact_no = NULL,
  union_email = 'sadadmtm25@gmail.com',
  staff_coordinator_name = 'SUFIYAN HUDAWI',
  staff_coordinator_phone = '9778342866',
  staff_coordinator_whatsapp = '9778342866',
  team_manager_name = 'MUHAMMED SAEED MT',
  team_manager_phone = '8129281248',
  team_manager_whatsapp = '8129281248',
  asst_team_manager_name = 'MUHAMMED SINAN P',
  asst_team_manager_phone = '9633578317',
  asst_team_manager_whatsapp = '9633578317'
WHERE affl_no = 35;

UPDATE colleges SET
  name = 'MAQDOOMIYYA COLLEGE FOR ISLAMIC STUDIES (MIC)',
  short_name = 'MIC, Athanikkal',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 0,
  st_aliya = 13,
  email = 'micwafyathanikkal@gmail.com',
  address = 'MIC WAFY COLLEGE  ATHANIKKAL,VALLUVAMBRAM,MALAPPURAM(P.O)',
  union_name = 'SIRAJUL ADEEB STUDENTS ASSOCIATION (SIASA)',
  contact_no = NULL,
  union_email = 'siasamicwafy@gmail.com',
  staff_coordinator_name = 'SWALIH WAFY OTHUKKUNGAL',
  staff_coordinator_phone = '7736945335',
  staff_coordinator_whatsapp = '7736945335',
  team_manager_name = 'NIZAMUDHEEN M',
  team_manager_phone = '9061429431',
  team_manager_whatsapp = '9061429431',
  asst_team_manager_name = 'SAYYID MINHAJ',
  asst_team_manager_phone = '6235430233',
  asst_team_manager_whatsapp = '6235430233'
WHERE affl_no = 47;

UPDATE colleges SET
  name = 'DARUL IHSAN ISLAMIC ACADEMY',
  short_name = 'Darul Ihsan, Changaramkulam',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 0,
  st_aliya = 19,
  email = 'darulihsanpunnakkal@gmil.com',
  address = 'Malappuram Changaramkulam',
  union_name = 'Ihsanuthwalaba Students‘ Association',
  contact_no = NULL,
  union_email = 'ihsanuthwalaba@gmail.com',
  staff_coordinator_name = 'ABDURHMAN WAFY',
  staff_coordinator_phone = '9946823810',
  staff_coordinator_whatsapp = '9946823810',
  team_manager_name = 'MUHAMMED MIDLAJ A R',
  team_manager_phone = '8921319358',
  team_manager_whatsapp = '8921319358',
  asst_team_manager_name = 'MUHAMMED SHIBI K P',
  asst_team_manager_phone = '9037527687',
  asst_team_manager_whatsapp = '9037527687'
WHERE affl_no = 51;

UPDATE colleges SET
  name = 'UMERALI SHIHAB THANGAL ISLAMIC ACADEMY',
  short_name = 'Kokkachal Wafy College',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 36,
  st_aliya = 58,
  email = 'Uiakokkachal@gamil.com',
  address = 'Kokkachal P/O Kayyar, (via) uppala- 671322, Bandiyod, Kasaragod',
  union_name = 'Mansha'' al Thadreeb Students Association (MTSA)',
  contact_no = NULL,
  union_email = 'mtsakokkachal54@gmail.com',
  staff_coordinator_name = 'Rishan wafy',
  staff_coordinator_phone = '75948 69114',
  staff_coordinator_whatsapp = '75948 69114',
  team_manager_name = 'Jalal Moula Aliya-4',
  team_manager_phone = '97464 70092',
  team_manager_whatsapp = '97464 70092',
  asst_team_manager_name = 'Ibrahim Alfaz B.A',
  asst_team_manager_phone = '7356581726',
  asst_team_manager_whatsapp = '7356581726'
WHERE affl_no = 54;

UPDATE colleges SET
  name = 'MAJLIS UMARIYYA ISLAMIC & ARTS COLLEGE',
  short_name = 'Majlis, Puramannur',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 55,
  st_aliya = 74,
  email = 'umariyyawafi@gmail.com',
  address = 'Majlis Nagar,Puramannur, Malappuram',
  union_name = 'Majlis Umariyya Students Federation',
  contact_no = NULL,
  union_email = 'musfpuramannur@gmail.com',
  staff_coordinator_name = 'SHAFEEQ WAFY',
  staff_coordinator_phone = '+91 98467 14064',
  staff_coordinator_whatsapp = '+91 98467 14064',
  team_manager_name = 'MOHAMMED SANI PV',
  team_manager_phone = '+91 9847949255',
  team_manager_whatsapp = '+91 9847949255',
  asst_team_manager_name = 'HASHIM MV',
  asst_team_manager_phone = '+91 81379 71269',
  asst_team_manager_whatsapp = '+91 81379 71269'
WHERE affl_no = 76;

UPDATE colleges SET
  name = 'WAFY CAMPUS',
  short_name = 'Wafy Campus, Kalikavu',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 0,
  st_aliya = 0,
  email = NULL,
  address = NULL,
  union_name = 'Wafy campus students union (WCSU)',
  contact_no = NULL,
  union_email = NULL,
  staff_coordinator_name = NULL,
  staff_coordinator_phone = NULL,
  staff_coordinator_whatsapp = NULL,
  team_manager_name = NULL,
  team_manager_phone = NULL,
  team_manager_whatsapp = NULL,
  asst_team_manager_name = NULL,
  asst_team_manager_phone = NULL,
  asst_team_manager_whatsapp = NULL
WHERE affl_no = 77;

UPDATE colleges SET
  name = 'SHIHAB THANGAL ISLAMIC & ARTS COLLEGE',
  short_name = 'Shihab Thangal, Munduparamba',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 21,
  st_aliya = 0,
  email = 'Mioinfomunduparamba@gmail.com',
  address = 'Shihab Thangal Islamic And Arts (Wafy) College
Manarool Islam Academy
Munduparamba Post
Malappuram 676509
Kerala',
  union_name = 'Martha''ul Funoon Students Association 2026-27',
  contact_no = NULL,
  union_email = 'Stiacmfsa@gmail.com',
  staff_coordinator_name = 'Anas Wafy',
  staff_coordinator_phone = '8547357851',
  staff_coordinator_whatsapp = '8547357851',
  team_manager_name = 'Muhammed aflah AK',
  team_manager_phone = '9947229556',
  team_manager_whatsapp = '9947229556',
  asst_team_manager_name = 'Muhammed shamil C',
  asst_team_manager_phone = '9645050387',
  asst_team_manager_whatsapp = '9645050387'
WHERE affl_no = 85;

UPDATE colleges SET
  name = 'MADARIJUSSUNNA ISLAMIC COLLEGE',
  short_name = 'Madarijussunna, Kalanthode',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 18,
  st_aliya = 0,
  email = 'madarijusunna@gmail.com',
  address = 'Madarijussunna islamic college,
NIT,Kattangal,
CALICUT',
  union_name = 'AL MISC STUDENTS UNION',
  contact_no = NULL,
  union_email = 'almiscstudentsunion@gmail.com',
  staff_coordinator_name = 'Abubacker wafy',
  staff_coordinator_phone = '+91 96050 08652',
  staff_coordinator_whatsapp = '+91 96050 08652',
  team_manager_name = 'Muhammed Sinan CP',
  team_manager_phone = '+91 9778127292',
  team_manager_whatsapp = '+91 9778127292',
  asst_team_manager_name = 'Aslam Muhammed',
  asst_team_manager_phone = '+91 9847220531',
  asst_team_manager_whatsapp = '+91 9847220531'
WHERE affl_no = 101;

UPDATE colleges SET
  name = 'MALIK DEENAR QURAN RESEARCH INSTITUTE - WAFY CAMPUS',
  short_name = 'Wafy Campus, Thiruvallur',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 0,
  st_aliya = 0,
  email = NULL,
  address = NULL,
  union_name = NULL,
  contact_no = NULL,
  union_email = NULL,
  staff_coordinator_name = NULL,
  staff_coordinator_phone = NULL,
  staff_coordinator_whatsapp = NULL,
  team_manager_name = NULL,
  team_manager_phone = NULL,
  team_manager_whatsapp = NULL,
  asst_team_manager_name = NULL,
  asst_team_manager_phone = NULL,
  asst_team_manager_whatsapp = NULL
WHERE affl_no = 115;

UPDATE colleges SET
  name = 'SWAHABA ISLAMIC ACADEMY',
  short_name = 'Swahaba, Ettikkullam',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 56,
  st_aliya = 0,
  email = 'swahabaislamicacademy@gmail.com',
  address = 'Swahaba Islamic Academy (wafy),
Ettikulam P.O, Pin:670308, Kannur',
  union_name = 'SIASA(SWAHABA ISLAMIC ACADEMY STUDENTS ASSOCIATION)',
  contact_no = NULL,
  union_email = 'siasaettikulam@gmail.com',
  staff_coordinator_name = 'Musammil Wafy',
  staff_coordinator_phone = '+91 85928 86811',
  staff_coordinator_whatsapp = '+91 85928 86811',
  team_manager_name = 'Razeen Ahammed P',
  team_manager_phone = '+91 8589852086',
  team_manager_whatsapp = '+91 8589852086',
  asst_team_manager_name = 'Amanshan Muhammed',
  asst_team_manager_phone = '+91 97450 10185',
  asst_team_manager_whatsapp = '+91 97450 10185'
WHERE affl_no = 117;

UPDATE colleges SET
  name = 'RAHMANIYA ISLAMIC & ARTS COLLEGE',
  short_name = 'Rahmaniyya, Irikkur',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 10,
  st_aliya = 38,
  email = 'rahmaniyawafy123@gmail.com',
  address = 'Rahmaniya campus,Peruvalathuparamba, Irikkur, Kannur, 670 593',
  union_name = 'Rahmaniya students association (RSA)',
  contact_no = NULL,
  union_email = 'rahmaniyaartscollegeirikkur@gmail.com',
  staff_coordinator_name = 'NUHMAN WAFY',
  staff_coordinator_phone = '+91 86064 51886',
  staff_coordinator_whatsapp = '+91 86064 51886',
  team_manager_name = 'SAFVAN K',
  team_manager_phone = '9778584933',
  team_manager_whatsapp = '9778584933',
  asst_team_manager_name = 'SWALIH P',
  asst_team_manager_phone = '+91 90721 52189',
  asst_team_manager_whatsapp = '+91 90721 52189'
WHERE affl_no = 123;

UPDATE colleges SET
  name = 'PANGIL AHMED KUTTY MUSLIYAR WAFY COLLEGE',
  short_name = 'Pang Wafy College',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 14,
  st_aliya = 0,
  email = 'wafypang@gmail.com',
  address = 'HO Wafa Campus, Pang south P.o, Malappuram, Keralam, 679338',
  union_name = NULL,
  contact_no = NULL,
  union_email = 'wafypang@gmail.com',
  staff_coordinator_name = 'APM SUHAIL WAFY',
  staff_coordinator_phone = '9745941695',
  staff_coordinator_whatsapp = '9745941695',
  team_manager_name = 'HAMDAN ABDULLA K',
  team_manager_phone = '+91 79948 89976',
  team_manager_whatsapp = '+91 79948 89976',
  asst_team_manager_name = 'APM SUHAIL WAFY',
  asst_team_manager_phone = '9745941695',
  asst_team_manager_whatsapp = '9745941695'
WHERE affl_no = 126;

UPDATE colleges SET
  name = 'HUJJATHUL ISLAM WAFY COLLEGE',
  short_name = 'Hujjathul Islam Kakkaramukk',
  type = 'wafy'::college_type,
  st_foundation = 41,
  st_thamheediya = 10,
  st_aliya = 0,
  email = 'hiwcwafy@gmail.com',
  address = 'Ccheruvannur (po), Perambra, Kozhikode, Kerala, Pin:673524',
  union_name = NULL,
  contact_no = NULL,
  union_email = 'hiadaperambra@gmail.com',
  staff_coordinator_name = 'Muhammad Shafih Wafy',
  staff_coordinator_phone = '8086585111',
  staff_coordinator_whatsapp = '8086585111',
  team_manager_name = 'Sinan vp',
  team_manager_phone = '+91 94469 91520',
  team_manager_whatsapp = '+91 94469 91520',
  asst_team_manager_name = 'Safwan',
  asst_team_manager_phone = '8086585111',
  asst_team_manager_whatsapp = '8086585111'
WHERE affl_no = 127;

UPDATE colleges SET
  name = 'DARUL ATHFAL WAFY ARTS COLLEGE',
  short_name = 'Darul Athfal Wafy Arts Koppam',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 21,
  st_aliya = 27,
  email = 'wafyartskoppam@gmail.com',
  address = 'Darul Athfal Wafy Arts College 
Koppam, Pullassery, Palakkad
679307',
  union_name = 'Dawac Students Union',
  contact_no = NULL,
  union_email = 'dawacstudentsunion@gmail.com',
  staff_coordinator_name = 'ASLAH WAFY',
  staff_coordinator_phone = '95620 75527',
  staff_coordinator_whatsapp = '95620 75527',
  team_manager_name = 'MUHAMMED ARSHED',
  team_manager_phone = '85920 32048',
  team_manager_whatsapp = '85920 32048',
  asst_team_manager_name = 'SABEEH VP',
  asst_team_manager_phone = '8943322306',
  asst_team_manager_whatsapp = '8943322306'
WHERE affl_no = 129;

UPDATE colleges SET
  name = 'VARAKKAL MULLAKOYA THANGAL WAFY COLLEGE',
  short_name = 'Perumundachery Wafy College',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 32,
  st_aliya = 0,
  email = 'wafyperumundachery@gmail.com',
  address = 'Varakkal mullakoya thangal Wafy College perumundachery',
  union_name = 'SIDRA',
  contact_no = NULL,
  union_email = 'sidrastudentsunion131@gmail.com',
  staff_coordinator_name = 'Safvan Wafy',
  staff_coordinator_phone = '9567491092',
  staff_coordinator_whatsapp = '9567491092',
  team_manager_name = 'Muhammed Adhil P',
  team_manager_phone = '6235189286',
  team_manager_whatsapp = '6235189286',
  asst_team_manager_name = 'Ameer Ali',
  asst_team_manager_phone = '9846540304',
  asst_team_manager_whatsapp = '9846540304'
WHERE affl_no = 131;

UPDATE colleges SET
  name = 'SHAMSUL ULAMA MEMORIAL RIYALUSSALIHEEN WAFY COLLEGE',
  short_name = 'Riyalussaliheen Koduvally',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 17,
  st_aliya = 28,
  email = 'wafycollegekdy@gmail.com',
  address = 'Riyadu Swaliheen Wafy College
Karoonhi, Karuvanpoyil (PO)
Koduvally, Kozhikode- 673572',
  union_name = 'RIYADU SWALIHEEN WAFY STUDENTS'' UNION',
  contact_no = NULL,
  union_email = 'rswsu134@gmail.com',
  staff_coordinator_name = 'UNAIS WAFY',
  staff_coordinator_phone = '+91 75940 24231',
  staff_coordinator_whatsapp = '+91 75940 24231',
  team_manager_name = 'AFNAN P',
  team_manager_phone = '+91 86067 43560',
  team_manager_whatsapp = '+91 86067 43560',
  asst_team_manager_name = 'MOHAMMED SAMEEH CH',
  asst_team_manager_phone = '+91 7306736549',
  asst_team_manager_whatsapp = '+91 7306736549'
WHERE affl_no = 134;

UPDATE colleges SET
  name = 'MUNEERUL ISLAM ARABIC (WAFY) COLLEGE , KUNDUMAN, KOLLAM',
  short_name = 'Muneerul Islam Kunduman',
  type = 'wafy'::college_type,
  st_foundation = 0,
  st_thamheediya = 23,
  st_aliya = 0,
  email = 'muneerulislamkundumon@gmail.com',
  address = 'Muneerul Islam Wafy College, Kundumon Kollam',
  union_name = 'SADAD UNION',
  contact_no = NULL,
  union_email = 'sadadwafykollam@gmail.com',
  staff_coordinator_name = 'Ajmal Wafy',
  staff_coordinator_phone = '+91 70348 08385',
  staff_coordinator_whatsapp = '+91 70348 08385',
  team_manager_name = 'Bilal Vembayam',
  team_manager_phone = '7356511182',
  team_manager_whatsapp = '7356511182',
  asst_team_manager_name = 'Ihzan Erumeli',
  asst_team_manager_phone = '+91 94978 55188',
  asst_team_manager_whatsapp = '+91 94978 55188'
WHERE affl_no = 138;

