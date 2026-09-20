import {
  College,
  Student,
  Item,
  FestSettings,
  CollegeItemLock,
  Registration,
  Stage,
  Schedule,
  Result,
  Appeal,
  Replacement,
  Profile
} from '../types/fest';

export const initialFestSettings: FestSettings = {
  id: 1,
  fest_name: 'Kala Utsav 2026 - Inter-College Arts Fest',
  reg_deadline: new Date(Date.now() + 4 * 86400000).toISOString(), // 4 days from now
  fine_deadline: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days from now
  rulebook_url: 'https://example.com/kala_utsav_rules.pdf'
};

export const initialColleges: College[] = [
  {
    id: 'col-1',
    name: 'St. Teresa National College',
    code: 'STNC',
    affiliation_no: 'AF-2024-019',
    email: 'fest@stnc.edu',
    address: '12 Riverbank Road, City Center',
    coordinator_name: 'Dr. Evelyn Thomas',
    coordinator_phone: '+91 98471 23456',
    manager_name: 'Prof. Mathew Joseph',
    manager_phone: '+91 98471 99887',
    fine_status: false,
    manual_lock_override: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'col-2',
    name: 'Apex Institute of Technology & Arts',
    code: 'AITA',
    affiliation_no: 'AF-2024-042',
    email: 'arts@apex.edu',
    address: 'Plot 4, Knowledge Park',
    coordinator_name: 'Prof. Arvind Menon',
    coordinator_phone: '+91 97452 88990',
    manager_name: 'Dr. Priya Varma',
    manager_phone: '+91 97452 11223',
    fine_status: false,
    manual_lock_override: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'col-3',
    name: 'Government Victoria Memorial College',
    code: 'GVMC',
    affiliation_no: 'AF-2024-003',
    email: 'artsclub@gvmc.ac.in',
    address: 'Heritage Hill, North Gate',
    coordinator_name: 'Dr. Radhika Nair',
    coordinator_phone: '+91 94473 11223',
    manager_name: 'Shri. K. R. Nambiar',
    manager_phone: '+91 94473 66778',
    fine_status: true,
    manual_lock_override: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'col-4',
    name: 'Loyola Academy of Fine Sciences',
    code: 'LAFS',
    affiliation_no: 'AF-2024-081',
    email: 'culcom@loyola.edu',
    address: 'Lake View Boulevard',
    coordinator_name: 'Rev. Fr. Joseph Paul',
    coordinator_phone: '+91 98950 44556',
    manager_name: 'Prof. Anita Philip',
    manager_phone: '+91 98950 77889',
    fine_status: false,
    manual_lock_override: true,
    created_at: new Date().toISOString()
  }
];

export const initialItems: Item[] = [
  {
    id: 'itm-101',
    code: 'ITM-101',
    name: 'Classical Dance (Bharatanatyam)',
    category: 'Senior',
    item_type: 'Single',
    min_participants: 1,
    max_participants: 1,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-102',
    code: 'ITM-102',
    name: 'Light Music Vocal (Solo)',
    category: 'General',
    item_type: 'Single',
    min_participants: 1,
    max_participants: 1,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-103',
    code: 'ITM-103',
    name: 'Western Group Song',
    category: 'General',
    item_type: 'Group',
    min_participants: 4,
    max_participants: 8,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-104',
    code: 'ITM-104',
    name: 'Mime (Theatrical Act)',
    category: 'Senior',
    item_type: 'Group',
    min_participants: 3,
    max_participants: 6,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-105',
    code: 'ITM-105',
    name: 'Elocution (English)',
    category: 'Junior',
    item_type: 'Single',
    min_participants: 1,
    max_participants: 1,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-106',
    code: 'ITM-106',
    name: 'Oil Painting & Canvas',
    category: 'General',
    item_type: 'Single',
    min_participants: 1,
    max_participants: 1,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-107',
    code: 'ITM-107',
    name: 'Inter-Collegiate Quiz',
    category: 'General',
    item_type: 'Group',
    min_participants: 2,
    max_participants: 2,
    is_locked: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'itm-108',
    code: 'ITM-108',
    name: 'Classical Carnatic Vocal',
    category: 'Senior',
    item_type: 'Single',
    min_participants: 1,
    max_participants: 1,
    is_locked: true,
    created_at: new Date().toISOString()
  }
];

export const initialStages: Stage[] = [
  {
    id: 'stg-1',
    name: 'Stage 1: Main Auditorium (Kalam Hall)',
    location: 'Campus Block A - Ground Floor'
  },
  {
    id: 'stg-2',
    name: 'Stage 2: Open Air Theatre (OAT)',
    location: 'Central Quadrangle'
  },
  {
    id: 'stg-3',
    name: 'Stage 3: Mini Hall 1 (Symphony)',
    location: 'Fine Arts Block - Level 2'
  },
  {
    id: 'stg-4',
    name: 'Stage 4: Seminar Hall 3',
    location: 'Administrative Wing'
  }
];

export const initialStudents: Student[] = [
  {
    id: 'stu-101',
    college_id: 'col-1',
    admission_no: 'ST-2022-412',
    full_name: 'Ananya Sharma',
    category: 'Senior',
    chest_no: 'CH-101',
    phone: '+91 98471 00101',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-102',
    college_id: 'col-1',
    admission_no: 'ST-2023-118',
    full_name: 'Rahul Verma',
    category: 'General',
    chest_no: 'CH-102',
    phone: '+91 98471 00102',
    photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-103',
    college_id: 'col-1',
    admission_no: 'ST-2023-205',
    full_name: 'Deepika Raman',
    category: 'Junior',
    chest_no: 'CH-103',
    phone: '+91 98471 00103',
    photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-104',
    college_id: 'col-1',
    admission_no: 'ST-2021-991',
    full_name: 'Kavita Menon',
    category: 'Senior',
    chest_no: 'CH-104',
    phone: '+91 98471 00104',
    photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-201',
    college_id: 'col-2',
    admission_no: 'AP-2022-809',
    full_name: 'Naveen Kurien',
    category: 'General',
    chest_no: 'CH-201',
    phone: '+91 97452 00201',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-202',
    college_id: 'col-2',
    admission_no: 'AP-2021-344',
    full_name: 'Pooja Bhatt',
    category: 'Senior',
    chest_no: 'CH-202',
    phone: '+91 97452 00202',
    photo_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-203',
    college_id: 'col-2',
    admission_no: 'AP-2023-112',
    full_name: 'Rohan Mehra',
    category: 'Junior',
    chest_no: 'CH-203',
    phone: '+91 97452 00203',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-301',
    college_id: 'col-3',
    admission_no: 'GV-2023-054',
    full_name: 'Siddharth Rao',
    category: 'Junior',
    chest_no: 'CH-301',
    phone: '+91 94473 00301',
    photo_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stu-302',
    college_id: 'col-3',
    admission_no: 'GV-2022-771',
    full_name: 'Meera Namboodiri',
    category: 'Senior',
    chest_no: 'CH-302',
    phone: '+91 94473 00302',
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  }
];

export const initialRegistrations: Registration[] = [
  {
    id: 'reg-1',
    college_id: 'col-1',
    item_id: 'itm-101',
    code_letter: 'A',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'reg-2',
    college_id: 'col-2',
    item_id: 'itm-101',
    code_letter: 'B',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'reg-3',
    college_id: 'col-3',
    item_id: 'itm-101',
    code_letter: 'C',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'reg-4',
    college_id: 'col-1',
    item_id: 'itm-102',
    code_letter: 'A',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'reg-5',
    college_id: 'col-2',
    item_id: 'itm-102',
    code_letter: 'B',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'reg-6',
    college_id: 'col-1',
    item_id: 'itm-103',
    code_letter: null,
    created_at: new Date().toISOString()
  },
  {
    id: 'reg-7',
    college_id: 'col-2',
    item_id: 'itm-104',
    code_letter: 'A',
    created_at: new Date().toISOString()
  }
];

export const initialRegistrationParticipants = [
  { registration_id: 'reg-1', student_id: 'stu-101' },
  { registration_id: 'reg-2', student_id: 'stu-202' },
  { registration_id: 'reg-3', student_id: 'stu-302' },
  { registration_id: 'reg-4', student_id: 'stu-102' },
  { registration_id: 'reg-5', student_id: 'stu-201' },
  { registration_id: 'reg-6', student_id: 'stu-101' },
  { registration_id: 'reg-6', student_id: 'stu-102' },
  { registration_id: 'reg-6', student_id: 'stu-103' },
  { registration_id: 'reg-6', student_id: 'stu-104' },
  { registration_id: 'reg-7', student_id: 'stu-201' },
  { registration_id: 'reg-7', student_id: 'stu-202' },
  { registration_id: 'reg-7', student_id: 'stu-203' }
];

export const initialSchedules: Schedule[] = [
  {
    id: 'sch-1',
    item_id: 'itm-101',
    stage_id: 'stg-1',
    scheduled_start: new Date(Date.now() + 15 * 60000).toISOString(),
    status: 'Next_Item'
  },
  {
    id: 'sch-2',
    item_id: 'itm-102',
    stage_id: 'stg-3',
    scheduled_start: new Date(Date.now() + 5 * 60000).toISOString(),
    status: 'Starting_Soon'
  },
  {
    id: 'sch-3',
    item_id: 'itm-103',
    stage_id: 'stg-2',
    scheduled_start: new Date(Date.now() + 90 * 60000).toISOString(),
    status: 'Upcoming'
  },
  {
    id: 'sch-4',
    item_id: 'itm-104',
    stage_id: 'stg-1',
    scheduled_start: new Date(Date.now() - 45 * 60000).toISOString(),
    status: 'Ended'
  }
];

export const initialResults: Result[] = [
  {
    id: 'res-1',
    item_id: 'itm-104',
    first_reg_id: 'reg-7',
    second_reg_id: null,
    third_reg_id: null,
    published: true,
    published_at: new Date(Date.now() - 30 * 60000).toISOString(),
    scores_breakdown: [
      { code_letter: 'A', criteria_a: 38, criteria_b: 36, criteria_c: 18, total: 92, rank: 1, reg_id: 'reg-7' }
    ]
  }
];

export const initialCollegeItemLocks: CollegeItemLock[] = [
  {
    id: 'cil-1',
    college_id: 'col-1',
    item_id: 'itm-108',
    is_unlocked: true,
    unlocked_until: new Date(Date.now() + 2 * 86400000).toISOString()
  }
];

export const initialAppeals: Appeal[] = [
  {
    id: 'app-1',
    college_id: 'col-3',
    item_id: 'itm-104',
    reason: 'Audio equipment malfunctioned during the 2nd minute of mime performance, leading to audio desynchronization.',
    fee_receipt_url: 'https://example.com/receipts/rec-001.pdf',
    status: 'Pending',
    admin_remarks: null,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString()
  }
];

export const initialReplacements: Replacement[] = [
  {
    id: 'rep-1',
    registration_id: 'reg-6',
    original_student_id: 'stu-104',
    replacement_student_id: 'stu-103',
    reason: 'Original vocal participant developed acute laryngitis and was medically advised voice rest.',
    status: 'Approved',
    created_at: new Date(Date.now() - 5 * 3600000).toISOString()
  }
];

export const mockProfiles: Record<string, Profile> = {
  admin: {
    id: 'usr-admin',
    role: 'admin',
    full_name: 'Dr. Vikram Malhotra (General Secretary)',
    phone: '+91 98000 11111'
  },
  college: {
    id: 'usr-college',
    role: 'college',
    college_id: 'col-1',
    full_name: 'Dr. Evelyn Thomas (STNC Coordinator)',
    phone: '+91 98471 23456'
  },
  student: {
    id: 'usr-student',
    role: 'student',
    college_id: 'col-1',
    full_name: 'Ananya Sharma (CH-101)',
    phone: '+91 98471 00101'
  },
  stage_controller: {
    id: 'usr-stage',
    role: 'stage_controller',
    full_name: 'Prof. Sandeep V. (Stage 1 Master)',
    phone: '+91 98000 22222'
  },
  result_entry: {
    id: 'usr-results',
    role: 'result_entry',
    full_name: 'Kiran Kumar (Tabulator Officer)',
    phone: '+91 98000 33333'
  }
};
