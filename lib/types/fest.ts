export type UserRole = 'admin' | 'college' | 'student' | 'stage_controller' | 'result_entry';

export type CollegeType = 'wafy' | 'prof';

export type ItemMode = 'onstage' | 'offstage' | 'submission';

export type PointType = 'individual' | 'group';

export type SubmissionStatus = 'on_time' | 'fine' | 'late';

export type StageStatus = 'Upcoming' | 'Next_Item' | 'Starting_Soon' | 'On_Going' | 'Ended';

export type AppealStatus = 'Pending' | 'Approved' | 'Rejected';

export type StudentCategory = 'Sub_Junior' | 'Junior' | 'Senior' | 'General';
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
  admission_no: string;
  college_affl_no: number;
  college_id?: string;
  class?: string | null;
  phase: string;
  category?: string; // alias for phase
  chest_no: string;
  phone?: string | null;
  photo_url?: string | null;
  created_at?: string;
  college?: College;
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
  chest_no?: string | null;
  code_letter?: string | null;
  appeal_description?: string | null;
  reason_for_appeal: string;
  reason?: string; // alias
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

export interface CollegeItemLock {
  id: string;
  college_affl_no: number;
  college_id?: string;
  item_id: number;
  is_unlocked: boolean;
  unlocked_until?: string | null;
}

export interface FestSettings {
  id: number;
  fest_name: string;
  reg_deadline: string;
  fine_deadline: string;
  rulebook_url?: string | null;
}
