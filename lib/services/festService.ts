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
  UserRole,
  Profile,
  StageStatus,
  AppealStatus
} from '../types/fest';

import {
  initialColleges,
  initialFestSettings,
  initialItems,
  initialStages,
  initialStudents,
  initialRegistrations,
  initialRegistrationParticipants,
  initialSchedules,
  initialResults,
  initialCollegeItemLocks,
  initialAppeals,
  initialReplacements,
  mockProfiles
} from './mockData';
import { supabase } from '../supabase/client';

const STORAGE_KEY_PREFIX = 'arts_fest_db_';

class FestService {
  private isClient = typeof window !== 'undefined';

  private getStorage<T>(key: string, fallback: T): T {
    if (!this.isClient) return fallback;
    try {
      const val = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      console.warn(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    if (!this.isClient) return;
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Error writing ${key} to storage:`, e);
    }
  }

  // --- Live Supabase Sync ---
  public async syncWithSupabase(): Promise<boolean> {
    if (!supabase) return false;
    try {
      // 1. Sync fest_settings
      const { data: festData } = await supabase.from('fest_settings').select('*').limit(1).maybeSingle();
      if (festData) {
        this.setStorage('festSettings', festData);
      }

      // 2. Sync colleges
      const { data: colData } = await supabase.from('colleges').select('*');
      if (colData && colData.length > 0) {
        this.setStorage('colleges', colData);
      }

      // 3. Sync items
      const { data: itemData } = await supabase.from('items').select('*');
      if (itemData && itemData.length > 0) {
        this.setStorage('items', itemData);
      }

      // 4. Sync students
      const { data: stuData } = await supabase.from('students').select('*');
      if (stuData && stuData.length > 0) {
        this.setStorage('students', stuData);
      }

      // 5. Sync stages & schedules
      const { data: stgData } = await supabase.from('stages').select('*');
      if (stgData && stgData.length > 0) {
        this.setStorage('stages', stgData);
      }

      const { data: schData } = await supabase.from('schedules').select('*');
      if (schData && schData.length > 0) {
        this.setStorage('schedules', schData);
      }

      // 6. Sync results
      const { data: resData } = await supabase.from('results').select('*');
      if (resData && resData.length > 0) {
        this.setStorage('results', resData);
      }

      return true;
    } catch (err) {
      console.warn('Notice: Supabase sync deferred (using local cache until tables populated):', err);
      return false;
    }
  }

  // --- Reset Database ---
  public resetToDefaults(): void {
    if (!this.isClient) return;
    const keys = [
      'festSettings', 'colleges', 'items', 'stages', 'students',
      'registrations', 'reg_participants', 'schedules', 'results',
      'itemLocks', 'appeals', 'replacements'
    ];
    keys.forEach(k => localStorage.removeItem(STORAGE_KEY_PREFIX + k));
  }

  // --- Profiles & Auth ---
  public getProfileByRole(role: UserRole): Profile {
    return mockProfiles[role] || mockProfiles.college;
  }

  // --- Fest Settings ---
  public getFestSettings(): FestSettings {
    return this.getStorage('festSettings', initialFestSettings);
  }

  public updateFestSettings(settings: Partial<FestSettings>): FestSettings {
    const current = this.getFestSettings();
    const updated = { ...current, ...settings };
    this.setStorage('festSettings', updated);
    return updated;
  }

  // Check if registration is open for a college and item
  public isRegistrationOpen(collegeId: string, itemId: string): {
    canRegister: boolean;
    reason?: string;
    isFinePeriod: boolean;
  } {
    const settings = this.getFestSettings();
    const colleges = this.getColleges();
    const college = colleges.find(c => c.id === collegeId);
    const item = this.getItems().find(i => i.id === itemId);
    const now = new Date();

    if (!item) return { canRegister: false, reason: 'Event not found', isFinePeriod: false };
    if (item.is_locked) {
      // Check selective unlock
      const locks = this.getCollegeItemLocks();
      const specificLock = locks.find(l => l.college_id === collegeId && l.item_id === itemId);
      if (specificLock && specificLock.is_unlocked) {
        if (!specificLock.unlocked_until || new Date(specificLock.unlocked_until) > now) {
          return { canRegister: true, isFinePeriod: false };
        }
      }
      return { canRegister: false, reason: 'Event is globally locked by fest admin', isFinePeriod: false };
    }

    if (college?.manual_lock_override) {
      return { canRegister: true, isFinePeriod: false };
    }

    const regDeadline = new Date(settings.reg_deadline);
    const fineDeadline = new Date(settings.fine_deadline);

    if (now <= regDeadline) {
      return { canRegister: true, isFinePeriod: false };
    }

    if (now <= fineDeadline) {
      return { canRegister: true, isFinePeriod: true, reason: 'Late Registration Fine Applicable' };
    }

    // Past fine deadline: check specific unlock
    const locks = this.getCollegeItemLocks();
    const specificLock = locks.find(l => l.college_id === collegeId && l.item_id === itemId);
    if (specificLock && specificLock.is_unlocked) {
      if (!specificLock.unlocked_until || new Date(specificLock.unlocked_until) > now) {
        return { canRegister: true, isFinePeriod: true, reason: 'Admin Granular Unlock Active' };
      }
    }

    return { canRegister: false, reason: 'Registration deadline has passed', isFinePeriod: false };
  }

  // --- Colleges ---
  public getColleges(): College[] {
    return this.getStorage('colleges', initialColleges);
  }

  public getCollege(id: string): College | undefined {
    return this.getColleges().find(c => c.id === id);
  }

  public updateCollege(id: string, updates: Partial<College>): College {
    const colleges = this.getColleges();
    const idx = colleges.findIndex(c => c.id === id);
    if (idx >= 0) {
      colleges[idx] = { ...colleges[idx], ...updates };
      this.setStorage('colleges', colleges);
      return colleges[idx];
    }
    throw new Error('College not found');
  }

  public toggleCollegeLockOverride(id: string): boolean {
    const college = this.getCollege(id);
    if (!college) return false;
    const updated = this.updateCollege(id, { manual_lock_override: !college.manual_lock_override });
    return updated.manual_lock_override;
  }

  public toggleCollegeFine(id: string): boolean {
    const college = this.getCollege(id);
    if (!college) return false;
    const updated = this.updateCollege(id, { fine_status: !college.fine_status });
    return updated.fine_status;
  }

  // --- Items ---
  public getItems(): Item[] {
    return this.getStorage('items', initialItems);
  }

  public getItem(id: string): Item | undefined {
    return this.getItems().find(i => i.id === id);
  }

  public toggleItemLock(itemId: string): boolean {
    const items = this.getItems();
    const idx = items.findIndex(i => i.id === itemId);
    if (idx >= 0) {
      items[idx].is_locked = !items[idx].is_locked;
      this.setStorage('items', items);
      return items[idx].is_locked;
    }
    return false;
  }

  public saveItem(item: Partial<Item>): Item {
    const items = this.getItems();
    if (item.id) {
      const idx = items.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...item } as Item;
        this.setStorage('items', items);
        return items[idx];
      }
    }
    const newItem: Item = {
      id: `itm-${Date.now()}`,
      code: item.code || `ITM-${items.length + 101}`,
      name: item.name || 'New Event',
      category: item.category || 'General',
      item_type: item.item_type || 'Single',
      min_participants: item.min_participants || 1,
      max_participants: item.max_participants || 1,
      is_locked: false,
      created_at: new Date().toISOString()
    };
    items.push(newItem);
    this.setStorage('items', items);
    return newItem;
  }

  // --- Granular Item Locks ---
  public getCollegeItemLocks(): CollegeItemLock[] {
    return this.getStorage('itemLocks', initialCollegeItemLocks);
  }

  public setCollegeItemLock(collegeId: string, itemId: string, isUnlocked: boolean, hoursValid: number = 24): CollegeItemLock {
    const locks = this.getCollegeItemLocks();
    const idx = locks.findIndex(l => l.college_id === collegeId && l.item_id === itemId);
    const validUntil = new Date(Date.now() + hoursValid * 3600000).toISOString();
    
    if (idx >= 0) {
      locks[idx].is_unlocked = isUnlocked;
      locks[idx].unlocked_until = isUnlocked ? validUntil : null;
      this.setStorage('itemLocks', locks);
      return locks[idx];
    } else {
      const newLock: CollegeItemLock = {
        id: `cil-${Date.now()}`,
        college_id: collegeId,
        item_id: itemId,
        is_unlocked: isUnlocked,
        unlocked_until: isUnlocked ? validUntil : null
      };
      locks.push(newLock);
      this.setStorage('itemLocks', locks);
      return newLock;
    }
  }

  // --- Students ---
  public getStudents(collegeId?: string): Student[] {
    const students = this.getStorage('students', initialStudents);
    const colleges = this.getColleges();
    const enriched = students.map(s => ({
      ...s,
      college: colleges.find(c => c.id === s.college_id)
    }));
    return collegeId ? enriched.filter(s => s.college_id === collegeId) : enriched;
  }

  public getStudent(id: string): Student | undefined {
    return this.getStudents().find(s => s.id === id);
  }

  public getStudentByChestNo(chestNo: string): Student | undefined {
    return this.getStudents().find(s => s.chest_no?.trim().toUpperCase() === chestNo.trim().toUpperCase());
  }

  public saveStudent(student: Partial<Student>): Student {
    const students = this.getStorage<Student[]>('students', initialStudents);
    if (student.id) {
      const idx = students.findIndex(s => s.id === student.id);
      if (idx >= 0) {
        students[idx] = { ...students[idx], ...student } as Student;
        this.setStorage('students', students);
        return students[idx];
      }
    }
    const count = students.length + 101;
    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      college_id: student.college_id || 'col-1',
      admission_no: student.admission_no || `ADM-${Date.now().toString().slice(-4)}`,
      full_name: student.full_name || 'Participant Name',
      category: student.category || 'General',
      chest_no: student.chest_no || `CH-${count}`,
      phone: student.phone || '',
      photo_url: student.photo_url || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      created_at: new Date().toISOString()
    };
    students.push(newStudent);
    this.setStorage('students', students);
    return newStudent;
  }

  // --- Registrations ---
  public getRegistrations(collegeId?: string): Registration[] {
    const regs = this.getStorage<Registration[]>('registrations', initialRegistrations);
    const participants = this.getStorage<Array<{ registration_id: string; student_id: string }>>(
      'reg_participants',
      initialRegistrationParticipants
    );
    const items = this.getItems();
    const colleges = this.getColleges();
    const students = this.getStudents();

    const enriched = regs.map(r => {
      const item = items.find(i => i.id === r.item_id);
      const college = colleges.find(c => c.id === r.college_id);
      const partIds = participants.filter(p => p.registration_id === r.id).map(p => p.student_id);
      const regStudents = students.filter(s => partIds.includes(s.id));

      return {
        ...r,
        item,
        college,
        participants: regStudents
      };
    });

    return collegeId ? enriched.filter(r => r.college_id === collegeId) : enriched;
  }

  public registerCollegeForItem(
    collegeId: string,
    itemId: string,
    studentIds: string[]
  ): { success: boolean; error?: string; registration?: Registration } {
    const check = this.isRegistrationOpen(collegeId, itemId);
    if (!check.canRegister) {
      return { success: false, error: check.reason || 'Registration is closed' };
    }

    const item = this.getItem(itemId);
    if (!item) return { success: false, error: 'Item not found' };

    if (studentIds.length < item.min_participants || studentIds.length > item.max_participants) {
      return {
        success: false,
        error: `Participant count (${studentIds.length}) does not match event requirement (${item.min_participants}-${item.max_participants})`
      };
    }

    // Verify category requirement if not General
    const students = this.getStudents().filter(s => studentIds.includes(s.id));
    if (item.category !== 'General') {
      const mismatched = students.some(s => s.category !== item.category && s.category !== 'General');
      if (mismatched) {
        return { success: false, error: `One or more participants do not match category '${item.category}'` };
      }
    }

    const regs = this.getStorage<Registration[]>('registrations', initialRegistrations);
    const participants = this.getStorage<Array<{ registration_id: string; student_id: string }>>(
      'reg_participants',
      initialRegistrationParticipants
    );

    // Check existing registration
    const existing = regs.find(r => r.college_id === collegeId && r.item_id === itemId);
    if (existing) {
      // Update participants
      const remainingParts = participants.filter(p => p.registration_id !== existing.id);
      studentIds.forEach(sid => remainingParts.push({ registration_id: existing.id, student_id: sid }));
      this.setStorage('reg_participants', remainingParts);
      return { success: true, registration: existing };
    }

    const newRegId = `reg-${Date.now()}`;
    const newReg: Registration = {
      id: newRegId,
      college_id: collegeId,
      item_id: itemId,
      code_letter: null,
      created_at: new Date().toISOString()
    };

    regs.push(newReg);
    this.setStorage('registrations', regs);

    studentIds.forEach(sid => {
      participants.push({ registration_id: newRegId, student_id: sid });
    });
    this.setStorage('reg_participants', participants);

    return { success: true, registration: newReg };
  }

  // --- Stage Controller: Code Letter Allotment & Stage Status ---
  public assignCodeLetter(registrationId: string, codeLetter: string): void {
    const regs = this.getStorage<Registration[]>('registrations', initialRegistrations);
    const idx = regs.findIndex(r => r.id === registrationId);
    if (idx >= 0) {
      regs[idx].code_letter = codeLetter.trim().toUpperCase();
      this.setStorage('registrations', regs);
    }
  }

  public getStages(): Stage[] {
    return this.getStorage('stages', initialStages);
  }

  public getSchedules(): Schedule[] {
    const schedules = this.getStorage<Schedule[]>('schedules', initialSchedules);
    const items = this.getItems();
    const stages = this.getStages();

    return schedules.map(s => ({
      ...s,
      item: items.find(i => i.id === s.item_id),
      stage: stages.find(st => st.id === s.stage_id)
    }));
  }

  public updateScheduleStatus(scheduleId: string, status: StageStatus): Schedule {
    const schedules = this.getStorage<Schedule[]>('schedules', initialSchedules);
    const idx = schedules.findIndex(s => s.id === scheduleId);
    if (idx >= 0) {
      schedules[idx].status = status;
      schedules[idx].updated_at = new Date().toISOString();
      this.setStorage('schedules', schedules);
      return schedules[idx];
    }
    throw new Error('Schedule not found');
  }

  // --- Result Entry & Scoring ---
  public getResults(): Result[] {
    const results = this.getStorage<Result[]>('results', initialResults);
    const items = this.getItems();
    const registrations = this.getRegistrations();

    return results.map(res => ({
      ...res,
      item: items.find(i => i.id === res.item_id),
      first_reg: registrations.find(r => r.id === res.first_reg_id),
      second_reg: registrations.find(r => r.id === res.second_reg_id),
      third_reg: registrations.find(r => r.id === res.third_reg_id)
    }));
  }

  public submitResultEntry(
    itemId: string,
    scores: Array<{
      code_letter: string;
      reg_id?: string;
      criteria_a: number;
      criteria_b: number;
      criteria_c: number;
      total: number;
    }>,
    userId: string = 'usr-results'
  ): Result {
    const results = this.getStorage<Result[]>('results', initialResults);
    const existing = results.find(r => r.item_id === itemId);

    if (existing && existing.published) {
      throw new Error('Result has already been finalized and published. Admin authorization required for edits.');
    }

    // Sort by total score descending to determine 1st, 2nd, 3rd
    const sorted = [...scores].sort((a, b) => b.total - a.total);
    const breakdownWithRank = sorted.map((s, index) => ({
      ...s,
      rank: index + 1
    }));

    const firstReg = sorted[0]?.reg_id || null;
    const secondReg = sorted[1]?.reg_id || null;
    const thirdReg = sorted[2]?.reg_id || null;

    if (existing) {
      existing.first_reg_id = firstReg;
      existing.second_reg_id = secondReg;
      existing.third_reg_id = thirdReg;
      existing.scores_breakdown = breakdownWithRank;
      existing.last_edited_by = userId;
      this.setStorage('results', results);
      return existing;
    }

    const newResult: Result = {
      id: `res-${Date.now()}`,
      item_id: itemId,
      first_reg_id: firstReg,
      second_reg_id: secondReg,
      third_reg_id: thirdReg,
      published: false,
      scores_breakdown: breakdownWithRank,
      created_by: userId,
      last_edited_by: userId
    };

    results.push(newResult);
    this.setStorage('results', results);
    return newResult;
  }

  public publishResult(resultId: string, publish: boolean = true): Result {
    const results = this.getStorage<Result[]>('results', initialResults);
    const idx = results.findIndex(r => r.id === resultId);
    if (idx >= 0) {
      results[idx].published = publish;
      results[idx].published_at = publish ? new Date().toISOString() : null;
      this.setStorage('results', results);
      return results[idx];
    }
    throw new Error('Result not found');
  }

  // --- Appeals & Replacements ---
  public getAppeals(collegeId?: string): Appeal[] {
    const appeals = this.getStorage<Appeal[]>('appeals', initialAppeals);
    const colleges = this.getColleges();
    const items = this.getItems();

    const enriched = appeals.map(a => ({
      ...a,
      college: colleges.find(c => c.id === a.college_id),
      item: items.find(i => i.id === a.item_id)
    }));

    return collegeId ? enriched.filter(a => a.college_id === collegeId) : enriched;
  }

  public submitAppeal(collegeId: string, itemId: string, reason: string, feeReceiptUrl?: string): Appeal {
    const appeals = this.getStorage<Appeal[]>('appeals', initialAppeals);
    const newAppeal: Appeal = {
      id: `app-${Date.now()}`,
      college_id: collegeId,
      item_id: itemId,
      reason,
      fee_receipt_url: feeReceiptUrl || null,
      status: 'Pending',
      admin_remarks: null,
      created_at: new Date().toISOString()
    };
    appeals.push(newAppeal);
    this.setStorage('appeals', appeals);
    return newAppeal;
  }

  public reviewAppeal(appealId: string, status: AppealStatus, remarks: string): Appeal {
    const appeals = this.getStorage<Appeal[]>('appeals', initialAppeals);
    const idx = appeals.findIndex(a => a.id === appealId);
    if (idx >= 0) {
      appeals[idx].status = status;
      appeals[idx].admin_remarks = remarks;
      this.setStorage('appeals', appeals);
      return appeals[idx];
    }
    throw new Error('Appeal not found');
  }

  public getReplacements(collegeId?: string): Replacement[] {
    const replacements = this.getStorage<Replacement[]>('replacements', initialReplacements);
    const regs = this.getRegistrations();
    const students = this.getStudents();

    const enriched = replacements.map(r => ({
      ...r,
      registration: regs.find(reg => reg.id === r.registration_id),
      original_student: students.find(s => s.id === r.original_student_id),
      replacement_student: students.find(s => s.id === r.replacement_student_id)
    }));

    if (collegeId) {
      return enriched.filter(r => r.registration?.college_id === collegeId);
    }
    return enriched;
  }

  public submitReplacement(registrationId: string, origStudentId: string, newStudentId: string, reason: string): Replacement {
    const list = this.getStorage<Replacement[]>('replacements', initialReplacements);
    const newRep: Replacement = {
      id: `rep-${Date.now()}`,
      registration_id: registrationId,
      original_student_id: origStudentId,
      replacement_student_id: newStudentId,
      reason,
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    list.push(newRep);
    this.setStorage('replacements', list);
    return newRep;
  }

  public reviewReplacement(repId: string, status: AppealStatus): Replacement {
    const list = this.getStorage<Replacement[]>('replacements', initialReplacements);
    const idx = list.findIndex(r => r.id === repId);
    if (idx >= 0) {
      list[idx].status = status;
      this.setStorage('replacements', list);

      // If approved, update participant entry!
      if (status === 'Approved') {
        const participants = this.getStorage<Array<{ registration_id: string; student_id: string }>>(
          'reg_participants',
          initialRegistrationParticipants
        );
        const pIdx = participants.findIndex(
          p => p.registration_id === list[idx].registration_id && p.student_id === list[idx].original_student_id
        );
        if (pIdx >= 0) {
          participants[pIdx].student_id = list[idx].replacement_student_id;
          this.setStorage('reg_participants', participants);
        }
      }
      return list[idx];
    }
    throw new Error('Replacement not found');
  }

  // --- Leaderboard & Standings ---
  public getLeaderboard(): Array<{
    college: College;
    points: number;
    gold: number;
    silver: number;
    bronze: number;
  }> {
    const colleges = this.getColleges();
    const results = this.getResults().filter(r => r.published);

    const standingsMap = new Map<string, { gold: number; silver: number; bronze: number; points: number }>();
    colleges.forEach(c => standingsMap.set(c.id, { gold: 0, silver: 0, bronze: 0, points: 0 }));

    results.forEach(res => {
      // 1st place: 5 pts, 2nd: 3 pts, 3rd: 1 pt
      if (res.first_reg?.college_id) {
        const curr = standingsMap.get(res.first_reg.college_id);
        if (curr) {
          curr.gold += 1;
          curr.points += 5;
        }
      }
      if (res.second_reg?.college_id) {
        const curr = standingsMap.get(res.second_reg.college_id);
        if (curr) {
          curr.silver += 1;
          curr.points += 3;
        }
      }
      if (res.third_reg?.college_id) {
        const curr = standingsMap.get(res.third_reg.college_id);
        if (curr) {
          curr.bronze += 1;
          curr.points += 1;
        }
      }
    });

    return colleges
      .map(c => {
        const stats = standingsMap.get(c.id) || { gold: 0, silver: 0, bronze: 0, points: 0 };
        return {
          college: c,
          ...stats
        };
      })
      .sort((a, b) => b.points - a.points || b.gold - a.gold);
  }
}

export const festService = new FestService();
