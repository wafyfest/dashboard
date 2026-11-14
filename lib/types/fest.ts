export type UserRole = 'admin' | 'college' | 'student' | 'stage_controller' | 'result_entry' | 'convenor';

export type CollegeType = 'wafy' | 'prof';

export type ItemMode = 'onstage' | 'offstage' | 'submission';

export type PointType = 'individual' | 'group';

export type SubmissionStatus = 'on_time' | 'fine' | 'late';

export type ScreeningStatus = 'pending' | 'qualified' | 'eliminated';

export type StageStatus = 'Upcoming' | 'Next_Item' | 'Starting_Soon' | 'On_Going' | 'Ended';

export type AppealStatus = 'Pending' | 'Approved' | 'Rejected';

export type StudentCategory =
  | 'Foundation'
  | 'Thamheediyya'
  | 'Aliya'
  | 'PG'
  | 'General'
  | 'Special'
  | 'Special - Foundation'
  | 'foundation'
  | 'thamheediyya'
  | 'aliya'
  | 'pg'
  | 'general'
  | 'special'
  | 'special - foundation'
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
  st_pre_foundation?: number;
  st_foundation: number;
  st_thamheediya: number;
  st_aliya: number;
  st_pg?: number;
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
  manual_fine_amount?: number;
  fine_reason?: string | null;
  manual_lock_override: boolean;
  created_at?: string;
}

export interface LeaderboardEntry {
  rank: number;
  college: College;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
  total_medals?: number;
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
  password?: string | null;
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
  if (clean === 'SPECIALFOUNDATION' || clean === 'SPFOUNDATION' || clean === 'SPECIALFD') {
    return 'SPECIAL_FOUNDATION';
  }
  if (clean === 'SPECIAL' || clean === 'SP' || clean === 'SPECIALPROGRAM') {
    return 'SPECIAL';
  }
  if (clean === 'GENERAL') {
    return 'GENERAL';
  }
  return clean;
}

/**
 * Returns true for Special Program / Category D events (e.g. SE090-SE093), which do not consume
 * a student's max_participation event quotas.
 */
export function isSpecialEvent(
  item?: { phase?: string | null; category?: string | null; item_code?: string | null; code?: string | null } | null
): boolean {
  if (!item) return false;
  const key = normalizeCategoryKey(item.phase || item.category);
  if (key === 'SPECIAL' || key === 'SPECIAL_FOUNDATION') return true;
  if ((item.category || '').trim().toUpperCase() === 'D') return true;
  const code = (item.item_code || item.code || '').trim().toUpperCase();
  return /^SE\d/.test(code);
}

/**
 * Returns true when an event is excluded from official championship points tabulation
 * (e.g. Category D / SE090-SE093 with tabulation = false).
 */
export function isNonTabulationEvent(
  item?: { tabulation?: boolean | null; category?: string | null } | null
): boolean {
  if (!item) return false;
  if (item.tabulation === false) return true;
  return (item.category || '').trim().toUpperCase() === 'D';
}

export const OPEN_PARTICIPANTS_MAX = 50;

/**
 * Computes consistent min/max participant bounds per college for an event.
 * Nullable `no_of_participants` (e.g. SE090-SE093) represents an open roster (min 1, up to 50).
 */
export function getItemParticipantBounds(
  item?: {
    no_of_participants?: number | null;
    min_participants?: number | null;
    max_participants?: number | null;
  } | null
): { min: number; max: number; isOpen: boolean } {
  if (!item) return { min: 1, max: 1, isOpen: false };
  if (item.no_of_participants == null) {
    return {
      min: item.min_participants ?? 1,
      max: item.max_participants ?? OPEN_PARTICIPANTS_MAX,
      isOpen: true,
    };
  }
  const exact = Math.max(1, Number(item.no_of_participants) || 1);
  return {
    min: item.min_participants ?? exact,
    max: item.max_participants ?? exact,
    isOpen: false,
  };
}

/**
 * Formats an event's per-college participant quota for UI tables and modals.
 */
export function formatParticipantQuotaLabel(
  item?: {
    no_of_participants?: number | null;
    min_participants?: number | null;
    max_participants?: number | null;
    point_type?: PointType | string | null;
    item_type?: 'Single' | 'Group' | string | null;
  } | null
): string {
  const { min, max, isOpen } = getItemParticipantBounds(item);
  const isGroup = item?.point_type === 'group' || item?.item_type === 'Group';
  if (isOpen) {
    return isGroup ? 'Open team' : 'Open (Min 1)';
  }
  if (min === max) {
    return `${min} student${min === 1 ? '' : 's'}`;
  }
  return `${min} - ${max} students`;
}

/**
 * Returns true if the event requires pre-event submission (either explicit `is_submission`
 * or legacy `mode === 'submission'`).
 */
export function isSubmissionEvent(item?: { is_submission?: boolean | null; mode?: string | null } | null): boolean {
  if (!item) return false;
  if (item.is_submission) return true;
  return (item.mode || '').toLowerCase().trim() === 'submission';
}

/**
 * Returns true if the event requires a pre-fest screening round prior to live finals.
 */
export function isScreeningEvent(item?: { is_screening?: boolean | null } | null): boolean {
  return Boolean(item?.is_screening);
}

/**
 * Returns true if colleges must submit a digital/video link prior to judging
 * (either a Submission event or a Pre-Fest Screening event).
 */
export function requiresPreFestSubmission(
  item?: { is_submission?: boolean | null; is_screening?: boolean | null; mode?: string | null } | null
): boolean {
  return isSubmissionEvent(item) || isScreeningEvent(item);
}

export type EventKind = 'screening' | 'submission' | 'onstage' | 'offstage' | 'general';

export interface EventDeadlineSetting {
  id: string;
  event_kind: EventKind;
  display_name: string;
  description?: string | null;
  start_time: string;
  no_fine_deadline: string;
  fine_deadline: string;
  fine_amount: number;
  has_super_fine?: boolean;
  super_fine_deadline?: string | null;
  super_fine_amount?: number | null;
  /** Multi-tier schedule for link submissions (YouTube / Drive links) */
  link_start_time?: string | null;
  link_no_fine_deadline?: string | null;
  link_fine_deadline?: string | null;
  link_fine_amount?: number | null;
  link_has_super_fine?: boolean;
  link_super_fine_deadline?: string | null;
  link_super_fine_amount?: number | null;
  /** Legacy fallback alias for final link cutoff */
  link_submission_deadline?: string | null;
  is_active: boolean;
  updated_at?: string;
  updated_by?: string | null;
}

export const DEFAULT_EVENT_DEADLINES: EventDeadlineSetting[] = [
  {
    id: 'deadline-screening',
    event_kind: 'screening',
    display_name: 'Screening Events',
    description: 'Pre-Fest online preliminary screening competitions (Circular WSFWF_26_016).',
    start_time: '2026-11-13T16:30:00.000Z',
    no_fine_deadline: '2026-11-22T16:30:00.000Z',
    fine_deadline: '2026-11-24T16:30:00.000Z',
    fine_amount: 200,
    has_super_fine: false,
    super_fine_deadline: null,
    super_fine_amount: null,
    link_start_time: '2026-11-22T16:30:00.000Z',
    link_no_fine_deadline: '2026-11-26T16:30:00.000Z',
    link_fine_deadline: '2026-11-28T16:30:00.000Z',
    link_fine_amount: 100,
    link_has_super_fine: false,
    link_super_fine_deadline: null,
    link_super_fine_amount: null,
    link_submission_deadline: '2026-11-30T16:30:00.000Z',
    is_active: true,
  },
  {
    id: 'deadline-submission',
    event_kind: 'submission',
    display_name: 'Digital Submission Events',
    description: 'Pre-Fest digital submission competitions requiring video/drive upload.',
    start_time: '2026-11-01T04:30:00.000Z',
    no_fine_deadline: '2026-11-15T16:30:00.000Z',
    fine_deadline: '2026-11-17T16:30:00.000Z',
    fine_amount: 500,
    has_super_fine: true,
    super_fine_deadline: '2026-11-18T16:30:00.000Z',
    super_fine_amount: 1000,
    link_start_time: '2026-11-15T16:30:00.000Z',
    link_no_fine_deadline: '2026-11-18T16:30:00.000Z',
    link_fine_deadline: '2026-11-20T16:30:00.000Z',
    link_fine_amount: 250,
    link_has_super_fine: false,
    link_super_fine_deadline: null,
    link_super_fine_amount: null,
    link_submission_deadline: '2026-11-20T16:30:00.000Z',
    is_active: true,
  },
  {
    id: 'deadline-onstage',
    event_kind: 'onstage',
    display_name: 'On-Stage Events',
    description: 'Main festival live stage performance competitions.',
    start_time: '2026-11-01T04:30:00.000Z',
    no_fine_deadline: '2026-11-10T16:30:00.000Z',
    fine_deadline: '2026-11-11T16:30:00.000Z',
    fine_amount: 500,
    has_super_fine: true,
    super_fine_deadline: '2026-11-12T16:30:00.000Z',
    super_fine_amount: 1000,
    link_submission_deadline: null,
    is_active: false,
  },
  {
    id: 'deadline-offstage',
    event_kind: 'offstage',
    display_name: 'Off-Stage Events',
    description: 'Main festival offline writing, art, and hall competitions.',
    start_time: '2026-11-01T04:30:00.000Z',
    no_fine_deadline: '2026-11-10T16:30:00.000Z',
    fine_deadline: '2026-11-11T16:30:00.000Z',
    fine_amount: 500,
    has_super_fine: true,
    super_fine_deadline: '2026-11-12T16:30:00.000Z',
    super_fine_amount: 1000,
    link_submission_deadline: null,
    is_active: false,
  },
  {
    id: 'deadline-general',
    event_kind: 'general',
    display_name: 'General Festival Events',
    description: 'Default master schedule fallback for all standard festival events.',
    start_time: '2026-11-01T04:30:00.000Z',
    no_fine_deadline: '2026-11-30T16:30:00.000Z',
    fine_deadline: '2026-11-30T16:30:00.000Z',
    fine_amount: 500,
    has_super_fine: true,
    super_fine_deadline: '2026-11-12T16:30:00.000Z',
    super_fine_amount: 1000,
    link_submission_deadline: null,
    is_active: true,
  },
];

export function getEventKind(
  item?: { is_screening?: boolean | null; is_submission?: boolean | null; mode?: string | null } | null
): EventKind {
  if (!item) return 'general';
  if (isScreeningEvent(item) || (item as any).is_screening || (item.mode || '').toLowerCase() === 'screening') return 'screening';
  if (isSubmissionEvent(item) || (item as any).is_submission || (item.mode || '').toLowerCase() === 'submission') return 'submission';
  const stage = getEffectiveStageMode(item);
  if (stage === 'onstage') return 'onstage';
  if (stage === 'offstage') return 'offstage';
  return 'general';
}

/**
 * Normalizes an event's stage location strictly to 'onstage' or 'offstage'.
 * Legacy `'submission'` mode events belong to 'offstage'.
 */
export function getEffectiveStageMode(item?: { mode?: string | null } | null): 'onstage' | 'offstage' {
  const m = (item?.mode || '').toLowerCase().trim();
  if (m === 'onstage' || m === 'on_stage' || m === 'on stage') return 'onstage';
  return 'offstage';
}

export function isCategoryMatching(studentCatOrPhase?: string | null, itemCatOrPhase?: string | null): boolean {
  if (!itemCatOrPhase) return true;
  const itemKey = normalizeCategoryKey(itemCatOrPhase);
  const studentKey = normalizeCategoryKey(studentCatOrPhase);

  // Special Program (SE090, SE091, SE093): open to all student phases
  if (itemKey === 'SPECIAL') return true;

  // Special - Foundation (SE092 Expo): restricted strictly to Foundation phase
  if (itemKey === 'SPECIAL_FOUNDATION') {
    return studentKey === 'FOUNDATION' || studentKey === 'SPECIAL_FOUNDATION';
  }

  // General (GN088, GN089): restricted strictly to Thamheediyya and Aliya phases
  if (itemKey === 'GENERAL') {
    return studentKey === 'THAMHEEDIYYA' || studentKey === 'ALIYA';
  }

  if (!studentCatOrPhase) return false;
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
  const itemKey = normalizeCategoryKey(itemPhase);
  if (!itemPhase || itemKey === 'SPECIAL') return true;

  if (students && students.length > 0) {
    return students.some(s => isCategoryMatching(s.category || s.phase, itemPhase));
  }

  if (college) {
    if (itemKey === 'FOUNDATION' || itemKey === 'SPECIAL_FOUNDATION') {
      return ((college.st_foundation ?? 0) > 0 || (college.st_pre_foundation ?? 0) > 0);
    }
    if (itemKey === 'THAMHEEDIYYA') return (college.st_thamheediya ?? 0) > 0;
    if (itemKey === 'ALIYA') return (college.st_aliya ?? 0) > 0;
    if (itemKey === 'GENERAL') return ((college.st_thamheediya ?? 0) > 0 || (college.st_aliya ?? 0) > 0);
    if (itemKey === 'PG') return (college.st_pg ?? 0) > 0;
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
  category: string; // A, B, C, D or StudentCategory
  mode: ItemMode;
  is_submission?: boolean;
  is_screening?: boolean;
  tabulation: boolean;
  point_type: PointType;
  item_type?: 'Single' | 'Group'; // alias
  no_of_participants: number | null;
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
  cic_no?: number | string;
  chest_no: string;
  code_letter?: string | null;
  screening_status?: ScreeningStatus;
  screening_remarks?: string | null;
  screening_updated_at?: string | null;
  created_at?: string;
  item?: Item;
  student?: Student;
  college?: College;
  participants?: Student[]; // group aggregated list helper
}

export type FineTier = 'fine' | 'super_fine' | 'override';

export interface LateRegistration {
  id: string;
  item_id: number;
  college_affl_no: number;
  cic_no?: number | string;
  chest_no: string;
  late_reason: string;
  fine_tier?: FineTier | null;
  fine_amount?: number | null;
  is_waived?: boolean;
  waived_at?: string | null;
  effective_deadline?: string | null;
  registered_at?: string;
  created_at?: string;
  item?: Item;
  student?: Student;
  college?: College;
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

// ============================================================================
// Special Events (Screening & Submission) System Types
// ============================================================================
// PRE-FEST EVENTS (Screening & Digital Submission) System Types
// ============================================================================

export type PreFestEventType = 'SCREENING' | 'SUBMISSION';

export interface PreFestSettings {
  id: string;
  event_type: PreFestEventType;
  registration_enabled: boolean;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  fine_closes_at?: string | null;
  fine_amount?: number | null;
  youtube_submission_enabled: boolean;
  youtube_submission_opens_at: string | null;
  youtube_submission_closes_at: string | null;
  disabled_event_ids: string[];
  updated_at?: string;
  updated_by?: string | null;
}

export interface PreFestRegistration {
  id: string;
  college_id: string;
  college_affl_no: number;
  event_id: string;
  event_type: PreFestEventType;
  registration_status: 'registered' | 'cancelled';
  registered_at: string;
  created_at?: string;
  updated_at?: string;
  event?: Item;
  college?: College;
  submission?: PreFestSubmission;
}

export interface PreFestSubmission {
  id: string;
  registration_id: string;
  college_id: string;
  college_affl_no: number;
  event_id: string;
  youtube_url: string;
  submission_status: 'submitted' | 'approved' | 'rejected' | 'pending';
  submitted_at: string;
  created_at?: string;
  updated_at?: string;
  event?: Item;
  college?: College;
}

// Backward-compatible type aliases
export type SpecialEventType = PreFestEventType;
export type SpecialEventSettings = PreFestSettings;
export type SpecialEventRegistration = PreFestRegistration;
export type SpecialEventSubmission = PreFestSubmission;

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
  college_affl_no?: number | null;
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

export interface Volunteer {
  id: string;
  college_affl_no: number;
  student_id: string;
  student?: Student;
  duty_preference?: string;
  phone?: string | null;
  tshirt_size?: string;
  status: 'Registered' | 'Approved' | 'Standby';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function isAliyaOrPgPhase(phaseOrCategory?: string | null, studentClass?: string | null): boolean {
  if (phaseOrCategory) {
    const p = phaseOrCategory.trim().toLowerCase();
    if (
      p === 'aliya' ||
      p === 'al' ||
      p.includes('aliya') ||
      p === 'senior' ||
      p === 'pg' ||
      p.includes('post graduate') ||
      p.includes('postgraduate')
    ) {
      return true;
    }
  }
  if (studentClass) {
    const c = studentClass.trim().toLowerCase();
    if (
      c.startsWith('al-') ||
      c.startsWith('al ') ||
      c.includes('aliya') ||
      c.startsWith('pg-') ||
      c.startsWith('pg ') ||
      c === 'pg' ||
      c.includes('post graduate')
    ) {
      return true;
    }
  }
  return false;
}

// Backward-compatible alias
export const isAliyaPhase = isAliyaOrPgPhase;

export function getStudentVolunteerPhase(phaseOrCategory?: string | null, studentClass?: string | null): 'PG' | 'Aliya' {
  const p = (phaseOrCategory || '').trim().toLowerCase();
  const c = (studentClass || '').trim().toLowerCase();
  if (p === 'pg' || c.startsWith('pg') || p.includes('post graduate')) {
    return 'PG';
  }
  return 'Aliya';
}

export interface FestSettings {
  id: number;
  fest_name: string;
  reg_deadline: string;
  fine_deadline: string;
  rulebook_url?: string | null;
  volunteer_reg_locked?: boolean;
}

export type NoticePriority = 'urgent' | 'warning' | 'info' | 'success';
export type NoticeTargetType = 'global' | 'role' | 'college' | 'student' | 'stage';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: NoticePriority;
  target_type: NoticeTargetType;
  target_role?: string | null;
  target_college_affl_no?: number | null;
  target_chest_no?: string | null;
  target_stage_id?: number | null;
  action_url?: string | null;
  action_label?: string | null;
  is_active: boolean;
  require_ack: boolean;
  expires_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export type AuditLogCategory =
  | 'ALL'
  | 'REGISTRATION'
  | 'LOCKS'
  | 'SETTINGS'
  | 'APPEALS'
  | 'SCHEDULE'
  | 'RESULTS'
  | 'ANNOUNCEMENTS'
  | 'VOLUNTEERS'
  | 'SYSTEM';

export type AuditLogSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface SystemAuditLog {
  id: string;
  action_type: string;
  category: string;
  severity: AuditLogSeverity;
  actor_role?: string | null;
  actor_name?: string | null;
  college_affl_no?: number | null;
  item_id?: number | null;
  target_id?: string | null;
  description: string;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  created_at: string;
}


// ─── Fest Committee ───────────────────────────────────────────────────────
export interface CommitteeMember {
  id: string;
  name: string;
  position: string;
  category:
  | 'apex_leadership'
  | 'convenors'
  | 'executive_officers'
  | 'technical_team'
  | 'general_convenor'
  | 'fest_convenor'
  | 'technical_convenor'
  | 'chief_patron'
  | 'patron'
  | 'organizing_committee'
  | 'volunteer_lead'
  | string;
  photo_url?: string | null;
  display_order: number;
  is_active: boolean;
  campus?: string | null;
  created_at?: string;
}
