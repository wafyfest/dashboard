import {
  College,
  Student,
  Item,
  FestSettings,
  CollegeItemLock,
  Registration,
  RegistrationLog,
  Stage,
  Schedule,
  Result,
  Appeal,
  MaxParticipation,
  SubmissionEntry,
  Profile
} from '../types/fest';

export const initialFestSettings: FestSettings = {
  id: 1,
  fest_name: 'WSF Arts Fest 2025',
  reg_deadline: new Date(Date.now() + 4 * 86400000).toISOString(),
  fine_deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
  rulebook_url: 'https://example.com/wsf_arts_manual.pdf'
};

export const initialMaxParticipation: MaxParticipation[] = [
  { phase: 'Sub_Junior', off_max: 2, on_max: 2, total_max: 3, group_max: 2 },
  { phase: 'Junior', off_max: 3, on_max: 2, total_max: 4, group_max: 2 },
  { phase: 'Senior', off_max: 3, on_max: 3, total_max: 5, group_max: 2 },
  { phase: 'General', off_max: 2, on_max: 2, total_max: 4, group_max: 3 }
];

export const initialColleges: College[] = [
  {
    id: 'col-11',
    affl_no: 11,
    name: 'PMSA POOKOYA THANGAL ISLAMIC & ARTS COLLEGE',
    short_name: 'PMSA',
    type: 'wafy',
    st_foundation: 56,
    st_thamheediya: 61,
    st_aliya: 59,
    email: 'masapmsawafy@gmail.com',
    address: 'Kattilangadi, Athavanad, Athikkattukunnu Rd, Kurumbathur, Kerala 676310',
    union_name: 'MASA Students Union',
    contact_no: '9645845185',
    union_email: 'union@pmsacollege.com',
    staff_coordinator_name: 'Usthad Shafi Wafy',
    staff_coordinator_phone: '9645845185',
    staff_coordinator_whatsapp: '9645845185',
    team_manager_name: 'Akbar shuhaib',
    team_manager_phone: '9539629410',
    team_manager_whatsapp: '9539629410',
    asst_team_manager_name: 'Muhammed Minhaj',
    asst_team_manager_phone: '7306729618',
    asst_team_manager_whatsapp: '7306729618',
    fine_status: false,
    manual_lock_override: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'col-102',
    affl_no: 102,
    name: 'Markaz Garden Wafy College',
    short_name: 'MGWC',
    type: 'wafy',
    st_foundation: 42,
    st_thamheediya: 50,
    st_aliya: 48,
    email: 'contact@markazgarden.edu',
    address: 'Poonoor, Unnikulam, Kozhikode, Kerala 673574',
    union_name: 'Garden Union',
    contact_no: '9847122334',
    union_email: 'union@markazgarden.edu',
    staff_coordinator_name: 'Prof. Abdul Latheef',
    staff_coordinator_phone: '9847122334',
    staff_coordinator_whatsapp: '9847122334',
    team_manager_name: 'Zainudheen K.',
    team_manager_phone: '9745233445',
    team_manager_whatsapp: '9745233445',
    asst_team_manager_name: 'Rashid Ali',
    asst_team_manager_phone: '9447344556',
    asst_team_manager_whatsapp: '9447344556',
    fine_status: false,
    manual_lock_override: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'col-103',
    affl_no: 103,
    name: 'Darul Uloom Wafy College',
    short_name: 'DUWC',
    type: 'prof',
    st_foundation: 38,
    st_thamheediya: 45,
    st_aliya: 40,
    email: 'office@darululoom.ac.in',
    address: 'Vazhakkad, Malappuram, Kerala 673640',
    union_name: 'Al-Huda Union',
    contact_no: '9447311223',
    union_email: 'union@darululoom.ac.in',
    staff_coordinator_name: 'Dr. Hameed K.K.',
    staff_coordinator_phone: '9447311223',
    staff_coordinator_whatsapp: '9447311223',
    team_manager_name: 'Salman Faris',
    team_manager_phone: '9895055667',
    team_manager_whatsapp: '9895055667',
    asst_team_manager_name: 'Anas M.',
    asst_team_manager_phone: '9847166778',
    asst_team_manager_whatsapp: '9847166778',
    fine_status: true,
    manual_lock_override: false,
    created_at: new Date().toISOString()
  }
];

export const initialItems: Item[] = [
  {
    id: 'itm-1',
    item_id: 1,
    item_code: 'ITM-01',
    name_eng: 'Quran Recitation (Qiraath)',
    name_mal: 'ഖുർആൻ പാരായണം',
    phase: 'Senior',
    mode: 'onstage',
    category: 'A',
    tabulation: true,
    point_type: 'individual',
    no_of_participants: 1,
    l_star: true,
    em_star: false,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-2',
    item_id: 2,
    item_code: 'ITM-02',
    name_eng: 'Elocution (Malayalam)',
    name_mal: 'പ്രസംഗം (മലയാളം)',
    phase: 'Junior',
    mode: 'onstage',
    category: 'A',
    tabulation: true,
    point_type: 'individual',
    no_of_participants: 1,
    l_star: false,
    em_star: true,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-3',
    item_id: 3,
    item_code: 'ITM-03',
    name_eng: 'Elocution (Arabic)',
    name_mal: 'പ്രസംഗം (അറബിക്)',
    phase: 'Senior',
    mode: 'onstage',
    category: 'A',
    tabulation: true,
    point_type: 'individual',
    no_of_participants: 1,
    l_star: true,
    em_star: false,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-4',
    item_id: 4,
    item_code: 'ITM-04',
    name_eng: 'Mappila Pattu (Solo)',
    name_mal: 'മാപ്പിളപ്പാട്ട് (ഏകാംഗം)',
    phase: 'General',
    mode: 'onstage',
    category: 'B',
    tabulation: true,
    point_type: 'individual',
    no_of_participants: 1,
    l_star: false,
    em_star: false,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-5',
    item_id: 5,
    item_code: 'ITM-05',
    name_eng: 'Duff Muttu (Ensemble)',
    name_mal: 'ദഫ് മുട്ട് (സംഘം)',
    phase: 'General',
    mode: 'onstage',
    category: 'A',
    tabulation: true,
    point_type: 'group',
    no_of_participants: 6,
    l_star: true,
    em_star: true,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-6',
    item_id: 6,
    item_code: 'ITM-06',
    name_eng: 'Essay Writing (English)',
    name_mal: 'ഉപന്യാസം (ഇംഗ്ലീഷ്)',
    phase: 'Senior',
    mode: 'offstage',
    category: 'B',
    tabulation: false,
    point_type: 'individual',
    no_of_participants: 1,
    l_star: false,
    em_star: false,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-7',
    item_id: 7,
    item_code: 'ITM-07',
    name_eng: 'Calligraphy (Arabic)',
    name_mal: 'കലിഗ്രഫി (അറബിക്)',
    phase: 'General',
    mode: 'offstage',
    category: 'B',
    tabulation: false,
    point_type: 'individual',
    no_of_participants: 1,
    l_star: false,
    em_star: false,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-8',
    item_id: 8,
    item_code: 'ITM-08',
    name_eng: 'Digital Fest Poster Design',
    name_mal: 'ഡിജിറ്റൽ പോസ്റ്റർ ഡിസൈൻ',
    phase: 'General',
    mode: 'submission',
    category: 'C',
    tabulation: false,
    point_type: 'individual',
    no_of_participants: 1,
    l_star: false,
    em_star: false,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-9',
    item_id: 9,
    item_code: 'ITM-09',
    name_eng: 'Inter-Collegiate Quiz',
    name_mal: 'ക്വിസ് മത്സരം',
    phase: 'General',
    mode: 'onstage',
    category: 'A',
    tabulation: true,
    point_type: 'group',
    no_of_participants: 2,
    l_star: false,
    em_star: false,
    is_locked: false,
    created_at: new Date().toISOString()
  }
];

export const initialStages: Stage[] = [
  {
    id: 'stg-1',
    stage_number: 1,
    name: 'Stage 1: Main Auditorium (Kalam Hall)',
    location: 'Campus Block A - Ground Floor'
  },
  {
    id: 'stg-2',
    stage_number: 2,
    name: 'Stage 2: Open Air Theatre (OAT)',
    location: 'Central Quadrangle'
  },
  {
    id: 'stg-3',
    stage_number: 3,
    name: 'Stage 3: Mini Hall 1 (Symphony)',
    location: 'Fine Arts Block - Level 2'
  },
  {
    id: 'stg-4',
    stage_number: 4,
    name: 'Stage 4: Seminar Hall 3',
    location: 'Administrative Wing'
  }
];

export const initialStudents: Student[] = [
  {
    id: 'stu-101',
    name: 'Ahmad Bilal',
    admission_no: 'ADM-2022-101',
    college_affl_no: 11,
    class: 'Aliya Final',
    phase: 'Senior',
    chest_no: 'CH-101',
    phone: '9847100101',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-102',
    name: 'Ibrahim Faizal',
    admission_no: 'ADM-2023-118',
    college_affl_no: 11,
    class: 'Thamheediya 2',
    phase: 'Junior',
    chest_no: 'CH-102',
    phone: '9847100102',
    photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-103',
    name: 'Muhammad Safwan',
    admission_no: 'ADM-2024-205',
    college_affl_no: 11,
    class: 'Foundation 1',
    phase: 'Sub_Junior',
    chest_no: 'CH-103',
    phone: '9847100103',
    photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-104',
    name: 'Ameen Farhan',
    admission_no: 'ADM-2022-314',
    college_affl_no: 11,
    class: 'Aliya 1',
    phase: 'Senior',
    chest_no: 'CH-104',
    phone: '9847100104',
    photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-105',
    name: 'Zaid Mansoor',
    admission_no: 'ADM-2023-401',
    college_affl_no: 11,
    class: 'Thamheediya 1',
    phase: 'Junior',
    chest_no: 'CH-105',
    phone: '9847100105',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-201',
    name: 'Rayyan Tariq',
    admission_no: 'ADM-2022-509',
    college_affl_no: 102,
    class: 'Aliya 2',
    phase: 'Senior',
    chest_no: 'CH-201',
    phone: '9745200201',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-202',
    name: 'Hassan Basheer',
    admission_no: 'ADM-2023-612',
    college_affl_no: 102,
    class: 'Thamheediya 2',
    phase: 'Junior',
    chest_no: 'CH-202',
    phone: '9745200202',
    photo_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-301',
    name: 'Luqman Hakim',
    admission_no: 'ADM-2022-771',
    college_affl_no: 103,
    class: 'Aliya Final',
    phase: 'Senior',
    chest_no: 'CH-301',
    phone: '9447300301',
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  }
];

// Flat Multiple-Row Group Registrations!
export const initialRegistrations: Registration[] = [
  // Quran Recitation (Single)
  {
    id: 'reg-1',
    item_id: 1,
    college_affl_no: 11,
    chest_no: 'CH-101',
    code_letter: 'A',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'reg-2',
    item_id: 1,
    college_affl_no: 102,
    chest_no: 'CH-201',
    code_letter: 'B',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  // Mappila Pattu (Single)
  {
    id: 'reg-3',
    item_id: 4,
    college_affl_no: 11,
    chest_no: 'CH-102',
    code_letter: 'A',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  // Duff Muttu Group Event (3 members from College 11)
  {
    id: 'reg-4',
    item_id: 5,
    college_affl_no: 11,
    chest_no: 'CH-101',
    code_letter: 'B',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'reg-5',
    item_id: 5,
    college_affl_no: 11,
    chest_no: 'CH-104',
    code_letter: 'B',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'reg-6',
    item_id: 5,
    college_affl_no: 11,
    chest_no: 'CH-105',
    code_letter: 'B',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  }
];

export const initialRegistrationLogs: RegistrationLog[] = [
  {
    id: 'log-1',
    item_id: 1,
    college_affl_no: 11,
    chest_no: 'CH-101',
    process: 'ADD',
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'log-2',
    item_id: 5,
    college_affl_no: 11,
    chest_no: 'CH-101',
    process: 'ADD',
    timestamp: new Date(Date.now() - 1 * 86400000).toISOString()
  }
];

export const initialSubmissionEntries: SubmissionEntry[] = [
  {
    id: 'sub-1',
    college_affl_no: 11,
    chest_no: 'CH-104',
    item_id: 8,
    status: 'on_time',
    file_url: 'https://example.com/submissions/ch104_poster.png',
    submitted_at: new Date(Date.now() - 4 * 3600000).toISOString()
  }
];

export const initialSchedules: Schedule[] = [
  {
    id: 'sch-1',
    item_id: 1,
    stage_number: 1,
    starting: new Date(Date.now() + 15 * 60000).toISOString(),
    ending: new Date(Date.now() + 75 * 60000).toISOString(),
    status: 'Next_Item'
  },
  {
    id: 'sch-2',
    item_id: 4,
    stage_number: 2,
    starting: new Date(Date.now() + 5 * 60000).toISOString(),
    ending: new Date(Date.now() + 60 * 60000).toISOString(),
    status: 'Starting_Soon'
  },
  {
    id: 'sch-3',
    item_id: 5,
    stage_number: 1,
    starting: new Date(Date.now() + 120 * 60000).toISOString(),
    ending: new Date(Date.now() + 200 * 60000).toISOString(),
    status: 'Upcoming'
  },
  {
    id: 'sch-4',
    item_id: 9,
    stage_number: 3,
    starting: new Date(Date.now() - 45 * 60000).toISOString(),
    ending: new Date(Date.now() + 15 * 60000).toISOString(),
    status: 'Ended'
  }
];

export const initialResults: Result[] = [
  {
    id: 'res-1',
    item_id: 9,
    code_letter: 'A',
    college_affl_no: 11,
    chest_no: 'CH-101',
    mark_percentage: 94.5,
    grade: 'A+',
    rank: 1,
    points: 10,
    published: true,
    best_in_fest: false,
    created_at: new Date(Date.now() - 30 * 60000).toISOString()
  }
];

export const initialAppeals: Appeal[] = [
  {
    id: 'app-1',
    phase: 'Senior',
    item_id: 1,
    chest_no: 'CH-301',
    code_letter: 'C',
    appeal_description: 'Audio microphone feedback disrupted Qiraath during Tajweed recitation.',
    reason_for_appeal: 'Microphone glitch',
    transaction_number: 'UPI/2026/89471928371',
    fee_receipt_url: 'https://example.com/receipts/rec-001.pdf',
    team_manager_name: 'Salman Faris',
    mobile_number: '9895055667',
    acknowledgment: true,
    current_status: 'Pending',
    admin_remarks: null,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString()
  }
];

export const initialCollegeItemLocks: CollegeItemLock[] = [
  {
    id: 'cil-1',
    college_affl_no: 11,
    item_id: 3,
    is_unlocked: true,
    unlocked_until: new Date(Date.now() + 2 * 86400000).toISOString()
  }
];

export const mockProfiles: Record<string, Profile> = {
  admin: {
    id: 'usr-admin',
    role: 'admin',
    full_name: 'Dr. Vikram Malhotra (General Secretary)',
    phone: '9800011111'
  },
  college: {
    id: 'usr-college',
    role: 'college',
    college_affl_no: 11,
    full_name: 'Usthad Shafi Wafy (PMSA Coordinator)',
    phone: '9645845185'
  },
  student: {
    id: 'usr-student',
    role: 'student',
    college_affl_no: 11,
    full_name: 'Ahmad Bilal (CH-101)',
    phone: '9847100101'
  },
  stage_controller: {
    id: 'usr-stage',
    role: 'stage_controller',
    full_name: 'Prof. Sandeep V. (Stage 1 Master)',
    phone: '9800022222'
  },
  result_entry: {
    id: 'usr-results',
    role: 'result_entry',
    full_name: 'Kiran Kumar (Tabulator Officer)',
    phone: '9800033333'
  }
};
