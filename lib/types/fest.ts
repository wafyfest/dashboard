export type UserRole = 'admin' | 'college' | 'student' | 'stage_controller' | 'result_entry';

export type CollegeType = 'wafy' | 'prof';

export type ItemMode = 'onstage' | 'offstage' | 'submission';

export type PointType = 'individual' | 'group';

export type SubmissionStatus = 'on_time' | 'fine' | 'late';

export type StageStatus = 'Upcoming' | 'Next_Item' | 'Starting_Soon' | 'On_Going' | 'Ended';

export type AppealStatus = 'Pending' | 'Approved' | 'Rejected';

export type StudentCategory =
  | 'Foundation'
  | 'Thamheediyya'
  | 'Aliya'
  | 'PG'
  | 'General'
  | 'foundation'
  | 'thamheediyya'
  | 'aliya'
  | 'pg'
  | 'general'
  | 'Sub_Junior'
  | 'Junior'
  | 'Senior';
export type ItemType = 'Single' | 'Group';

export interface Profile {
  id: string;
  role: UserRole;
  college_affl_no?: number | null;
  college_id?: string | null;
  full_name: string;
  phone?: string | null;
  created_at?: string;
}

export interface College {
  id: string;
  affl_no: number; // 3-digit unique number (e.g. 11, 101, 102)
  affiliation_no?: string; // alias for affl_no
  name: string;
  short_name: string;
  code?: string; // alias for short_name
  type: CollegeType;
  st_foundation: number;
  st_thamheediya: number;
  st_aliya: number;
  email?: string | null;
  address?: string | null;
  union_name?: string | null;
  contact_no?: string | null;
  union_email?: string | null;
  coordinator_name?: string | null;
  coordinator_phone?: string | null;
  staff_coordinator_name?: string | null;
  staff_coordinator_phone?: string | null;
  staff_coordinator_whatsapp?: string | null;
  manager_name?: string | null;
  manager_phone?: string | null;
  team_manager_name?: string | null;
  team_manager_phone?: string | null;
  team_manager_whatsapp?: string | null;
  asst_manager_name?: string | null;
  asst_manager_phone?: string | null;
  asst_team_manager_name?: string | null;
  asst_team_manager_phone?: string | null;
  asst_team_manager_whatsapp?: string | null;
  fine_status: boolean;
  manual_lock_override: boolean;
  created_at?: string;
}

export interface Student {
  id: string;
  name: string;
  full_name?: string; // alias for name
  cic_no?: string | number; // Primary human-facing student identifier (CIC No)
  admission_no?: string | number; // alias for cic_no
  cic_number?: string | number; // alias for cic_no
  college_affl_no: number;
  college_id?: string;
  class?: string | null;
  phase: string;
  category?: string; // formatted category e.g. Sub Junior, Junior, Senior, General
  chest_no?: string; // fest display chest number (derived from cic_no)
  phone?: string | null;
  photo_url?: string | null;
  created_at?: string;
  college?: College;
}

export function formatStudentCategory(phaseOrCat?: string | null): string {
  if (!phaseOrCat) return 'Sub Junior';
  const val = phaseOrCat.trim().toUpperCase();
  if (val === 'FD' || val === 'FOUNDATION' || val === 'PFD' || val === 'PFD1' || val === 'PRE FOUNDATION' || val === 'PRE_FOUNDATION' || val === 'SUB_JUNIOR' || val === 'SUB JUNIOR' || val === 'SUB-JUNIOR') {
    return 'Sub Junior';
  }
  if (val === 'TH' || val === 'THAMHEEDIYYA' || val === 'THAMHEEDIYA' || val === 'JUNIOR') {
    return 'Junior';
  }
  if (val === 'AL' || val === 'ALIYA' || val === 'SENIOR') {
    return 'Senior';
  }
  if (val === 'PG' || val === 'GENERAL') {
    return 'General';
  }
  return phaseOrCat;
}

export function normalizeCategoryKey(val?: string | null): string {
  if (!val) return 'GENERAL';
  const clean = val.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean === 'FD' || clean === 'FOUNDATION' || clean === 'PFD' || clean === 'PFD1' || clean === 'SUBJUNIOR' || clean === 'PREFOUNDATION') {
    return 'FOUNDATION';
  }
  if (clean === 'TH' || clean === 'THAMHEEDIYYA' || clean === 'THAMHEEDIYA' || clean === 'THAMHEED' || clean === 'JUNIOR') {
    return 'THAMHEEDIYYA';
  }
  if (clean === 'AL' || clean === 'ALIYA' || clean === 'SENIOR') {
    return 'ALIYA';
  }
  if (clean === 'PG') {
    return 'PG';
  }
  if (clean === 'GENERAL') {
    return 'GENERAL';
  }
  return clean;
}

export function isCategoryMatching(studentCatOrPhase?: string | null, itemCatOrPhase?: string | null): boolean {
  if (!itemCatOrPhase) return true;
  const itemKey = normalizeCategoryKey(itemCatOrPhase);
  if (itemKey === 'GENERAL') return true;
  const studentKey = normalizeCategoryKey(studentCatOrPhase);
  if (studentKey === 'GENERAL') return true;
  return studentKey === itemKey;
}

export function isItemEligibleForCollege(
  item: Item,
  students: Student[],
  college?: College,
  registeredItemIds?: Set<number | string>
): boolean {
  if (registeredItemIds && (registeredItemIds.has(item.item_id) || registeredItemIds.has(item.id))) {
    return true;
  }

  const itemPhase = item.phase || item.category;
  if (!itemPhase || normalizeCategoryKey(itemPhase) === 'GENERAL') return true;

  if (students && students.length > 0) {
    return students.some(s => isCategoryMatching(s.category || s.phase, itemPhase));
  }

  if (college) {
    const key = normalizeCategoryKey(itemPhase);
    if (key === 'FOUNDATION') return (college.st_foundation ?? 0) > 0;
    if (key === 'THAMHEEDIYYA') return (college.st_thamheediya ?? 0) > 0;
    if (key === 'ALIYA') return (college.st_aliya ?? 0) > 0;
  }

  return true;
}

export interface Item {
  id: string;
  item_id: number; // 2-digit number
  item_code: string; // alphanumeric (e.g. ITM-01)
  code?: string; // alias for item_code
  name_eng: string;
  name_mal: string;
  name?: string; // alias for name_eng
  phase: string;
  category: string; // A, B, C or StudentCategory
  mode: ItemMode;
  tabulation: boolean;
  point_type: PointType;
  item_type?: 'Single' | 'Group'; // alias
  no_of_participants: number;
  min_participants?: number; // alias
  max_participants?: number; // alias
  reg_deadline?: string | null;
  fine_deadline?: string | null;
  l_star: boolean;
  em_star: boolean;
  is_locked: boolean;
  created_at?: string;
}

export interface MaxParticipation {
  phase: string;
  off_max: number;
  on_max: number;
  total_max: number;
  group_max: number;
}

export interface Registration {
  id: string;
  item_id: number;
  college_affl_no: number;
  college_id?: string;
  chest_no: string;
  code_letter?: string | null;
  created_at?: string;
  item?: Item;
  student?: Student;
  college?: College;
  participants?: Student[]; // group aggregated list helper
}

export interface RegistrationLog {
  id: string;
  item_id: number;
  college_affl_no: number;
  chest_no: string;
  process: 'ADD' | 'DELETE';
  timestamp: string;
}

export interface CodeLetter {
  id: string;
  item_id: number;
  college_affl_no: number;
  chest_no: string;
  code_letter: string;
}

export interface SubmissionEntry {
  id: string;
  college_affl_no: number;
  chest_no: string;
  item_id: number;
  status: SubmissionStatus;
  file_url?: string | null;
  submitted_at: string;
  item?: Item;
  student?: Student;
}

export interface Stage {
  id: string;
  stage_number: number;
  name: string;
  location?: string | null;
}

export interface Schedule {
  id: string;
  item_id: number;
  stage_number: number;
  stage_id?: string;
  starting: string;
  scheduled_start?: string; // alias
  ending?: string | null;
  status: StageStatus;
  updated_at?: string;
  item?: Item;
  stage?: Stage;
}

export interface PointsMatrix {
  id: string;
  phase: string;
  category: string;
  grade?: string | null;
  rank?: number | null;
  points: number;
}

export interface Result {
  id: string;
  item_id: number;
  code_letter?: string | null;
  college_affl_no?: number | null;
  chest_no?: string | null;
  mark_percentage?: number | null;
  grade?: string | null;
  rank?: number | null;
  points?: number | null;
  published: boolean;
  best_in_fest: boolean;
  created_at?: string;
  item?: Item;
  college?: College;
  student?: Student;
  first_reg?: any;
  second_reg?: any;
  third_reg?: any;
  scores_breakdown?: any[];
}

export interface Appeal {
  id: string;
  phase: string;
  item_id: number;
  participant_name?: string | null;
  chest_no?: string | null;
  code_letter?: string | null;
  appeal_description?: string | null;
  reason_for_appeal: string;
  reason?: string; // alias
  payment_mode?: 'Cash' | 'GPay' | string | null;
  paid_to?: string | null;
  transaction_number: string;
  fee_receipt_url?: string | null;
  team_manager_name: string;
  mobile_number: string;
  acknowledgment: boolean;
  current_status: AppealStatus;
  status?: AppealStatus; // alias
  admin_remarks?: string | null;
  created_at?: string;
  item?: Item;
  college?: College;
}

export interface Replacement {
  id: string;
  registration_id: string;
  original_student_id: string;
  replacement_student_id: string;
  reason: string;
  status: AppealStatus;
  created_at?: string;
  registration?: Registration;
  original_student?: Student;
  replacement_student?: Student;
}

export interface EntryLock {
  item_id: number;
  college_affl_no: number;
  is_open: boolean;
  updated_at?: string;
}

// Backwards-compatibility alias
export type CollegeItemLock = EntryLock;

export interface FestSettings {
  id: number;
  fest_name: string;
  reg_deadline: string;
  fine_deadline: string;
  rulebook_url?: string | null;
}
