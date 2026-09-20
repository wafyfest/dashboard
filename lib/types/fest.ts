export type UserRole = 'admin' | 'college' | 'student' | 'stage_controller' | 'result_entry';

export type StudentCategory = 'Sub_Junior' | 'Junior' | 'Senior' | 'General';

export type ItemType = 'Single' | 'Group';

export type StageStatus = 'Upcoming' | 'Next_Item' | 'Starting_Soon' | 'On_Going' | 'Ended';

export type AppealStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Profile {
  id: string;
  role: UserRole;
  college_id?: string | null;
  full_name: string;
  phone?: string | null;
  created_at?: string;
}

export interface College {
  id: string;
  name: string;
  code: string;
  affiliation_no?: string | null;
  email?: string | null;
  address?: string | null;
  coordinator_name?: string | null;
  coordinator_phone?: string | null;
  manager_name?: string | null;
  manager_phone?: string | null;
  fine_status: boolean;
  manual_lock_override: boolean;
  created_at?: string;
}

export interface Student {
  id: string;
  college_id: string;
  admission_no: string;
  full_name: string;
  category: StudentCategory;
  phone?: string | null;
  photo_url?: string | null;
  chest_no?: string | null;
  created_at?: string;
  college?: College;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  category: StudentCategory;
  item_type: ItemType;
  min_participants: number;
  max_participants: number;
  is_locked: boolean;
  created_at?: string;
}

export interface FestSettings {
  id: number;
  fest_name: string;
  reg_deadline: string;
  fine_deadline: string;
  rulebook_url?: string | null;
}

export interface CollegeItemLock {
  id: string;
  college_id: string;
  item_id: string;
  is_unlocked: boolean;
  unlocked_until?: string | null;
  college?: College;
  item?: Item;
}

export interface Registration {
  id: string;
  college_id: string;
  item_id: string;
  code_letter?: string | null; // A, B, C...
  created_at?: string;
  college?: College;
  item?: Item;
  participants?: Student[];
}

export interface RegistrationParticipant {
  id: string;
  registration_id: string;
  student_id: string;
  student?: Student;
}

export interface Stage {
  id: string;
  name: string;
  location?: string | null;
}

export interface Schedule {
  id: string;
  item_id: string;
  stage_id: string;
  scheduled_start: string;
  status: StageStatus;
  updated_at?: string;
  item?: Item;
  stage?: Stage;
}

export interface Result {
  id: string;
  item_id: string;
  first_reg_id?: string | null;
  second_reg_id?: string | null;
  third_reg_id?: string | null;
  published: boolean;
  published_at?: string | null;
  created_by?: string | null;
  last_edited_by?: string | null;
  item?: Item;
  first_reg?: Registration;
  second_reg?: Registration;
  third_reg?: Registration;
  scores_breakdown?: {
    code_letter: string;
    criteria_a: number;
    criteria_b: number;
    criteria_c: number;
    total: number;
    rank?: number;
    reg_id?: string;
  }[];
}

export interface Appeal {
  id: string;
  college_id: string;
  item_id: string;
  reason: string;
  fee_receipt_url?: string | null;
  status: AppealStatus;
  admin_remarks?: string | null;
  created_at?: string;
  college?: College;
  item?: Item;
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
