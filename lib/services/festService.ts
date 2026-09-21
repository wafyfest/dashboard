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
  Replacement,
  MaxParticipation,
  SubmissionEntry,
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
  initialRegistrationLogs,
  initialSubmissionEntries,
  initialSchedules,
  initialResults,
  initialCollegeItemLocks,
  initialAppeals,
  initialMaxParticipation,
  mockProfiles
} from './mockData';
import { supabase } from '../supabase/client';

const STORAGE_KEY_PREFIX = 'wafy_fest_db_';

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
      const client = supabase;
      const { data: festData } = await client.from('fest_settings').select('*').limit(1).maybeSingle();
      if (festData) this.setStorage('festSettings', festData);

      const { data: colData } = await client.from('colleges').select('*');
      if (colData && colData.length > 0) this.setStorage('colleges', colData);

      const { data: itemData } = await client.from('items').select('*');
      if (itemData && itemData.length > 0) this.setStorage('items', itemData);

      const { data: stuData } = await client.from('students').select('*');
      if (stuData && stuData.length > 0) this.setStorage('students', stuData);

      const { data: stgData } = await client.from('stages').select('*');
      if (stgData && stgData.length > 0) this.setStorage('stages', stgData);

      const { data: schData } = await client.from('schedules').select('*');
      if (schData && schData.length > 0) this.setStorage('schedules', schData);

      const { data: regData } = await client.from('registrations').select('*');
      if (regData && regData.length > 0) this.setStorage('registrations', regData);

      const { data: resData } = await client.from('results').select('*');
      if (resData && resData.length > 0) this.setStorage('results', resData);

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
      'registrations', 'registration_logs', 'schedules', 'results',
      'itemLocks', 'appeals', 'submissions', 'maxParticipation', 'replacements'
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
    if (supabase) {
      supabase.from('fest_settings').upsert(updated).then();
    }
    return updated;
  }

  // Check if registration is open for a college and item
  public isRegistrationOpen(collegeAfflNoOrId: number | string, itemIdOrCode: number | string): {
    canRegister: boolean;
    reason?: string;
    isFinePeriod: boolean;
  } {
    const settings = this.getFestSettings();
    const college = this.getCollege(collegeAfflNoOrId);
    const item = this.getItem(itemIdOrCode);
    const now = new Date();

    if (!item) return { canRegister: false, reason: 'Event not found', isFinePeriod: false };
    if (!college) return { canRegister: false, reason: 'College not found', isFinePeriod: false };

    if (item.is_locked) {
      const locks = this.getCollegeItemLocks();
      const specificLock = locks.find(l => l.college_affl_no === college.affl_no && l.item_id === item.item_id);
      if (specificLock && specificLock.is_unlocked) {
        if (!specificLock.unlocked_until || new Date(specificLock.unlocked_until) > now) {
          return { canRegister: true, isFinePeriod: false };
        }
      }
      return { canRegister: false, reason: 'Event is globally locked by fest admin', isFinePeriod: false };
    }

    if (college.manual_lock_override) {
      return { canRegister: true, isFinePeriod: false };
    }

    const regDeadline = item.reg_deadline ? new Date(item.reg_deadline) : new Date(settings.reg_deadline);
    const fineDeadline = item.fine_deadline ? new Date(item.fine_deadline) : new Date(settings.fine_deadline);

    if (now <= regDeadline) {
      return { canRegister: true, isFinePeriod: false };
    }

    if (now <= fineDeadline) {
      return { canRegister: true, isFinePeriod: true, reason: 'Late Registration Fine Applicable' };
    }

    const locks = this.getCollegeItemLocks();
    const specificLock = locks.find(l => l.college_affl_no === college.affl_no && l.item_id === item.item_id);
    if (specificLock && specificLock.is_unlocked) {
      if (!specificLock.unlocked_until || new Date(specificLock.unlocked_until) > now) {
        return { canRegister: true, isFinePeriod: true, reason: 'Admin Granular Unlock Active' };
      }
    }

    return { canRegister: false, reason: 'Registration deadline has passed', isFinePeriod: false };
  }

  // --- Colleges ---
  public getColleges(): College[] {
    const cols = this.getStorage<College[]>('colleges', initialColleges);
    return cols.map(c => ({
      ...c,
      code: c.short_name,
      affiliation_no: c.affl_no.toString(),
      coordinator_name: c.staff_coordinator_name,
      coordinator_phone: c.staff_coordinator_phone,
      manager_name: c.team_manager_name,
      manager_phone: c.team_manager_phone,
      asst_manager_name: c.asst_team_manager_name,
      asst_manager_phone: c.asst_team_manager_phone
    }));
  }

  public getCollege(afflNoOrId: number | string): College | undefined {
    const colleges = this.getColleges();
    const str = afflNoOrId.toString();
    const num = Number(str.replace('col-', ''));
    return colleges.find(c => c.affl_no === num || c.id === str || c.code === str || c.short_name === str);
  }

  public updateCollege(afflNoOrId: number | string, updates: Partial<College>): College {
    const colleges = this.getColleges();
    const college = this.getCollege(afflNoOrId);
    if (!college) throw new Error('College not found');

    const idx = colleges.findIndex(c => c.affl_no === college.affl_no);
    if (idx >= 0) {
      colleges[idx] = { ...colleges[idx], ...updates };
      this.setStorage('colleges', colleges);
      if (supabase) {
        supabase.from('colleges').update(updates).eq('affl_no', college.affl_no).then();
      }
      return colleges[idx];
    }
    throw new Error('College not found');
  }

  public toggleCollegeLockOverride(afflNoOrId: number | string): boolean {
    const college = this.getCollege(afflNoOrId);
    if (!college) return false;
    const updated = this.updateCollege(college.affl_no, { manual_lock_override: !college.manual_lock_override });
    return updated.manual_lock_override;
  }

  public toggleCollegeFine(afflNoOrId: number | string): boolean {
    const college = this.getCollege(afflNoOrId);
    if (!college) return false;
    const updated = this.updateCollege(college.affl_no, { fine_status: !college.fine_status });
    return updated.fine_status;
  }

  // --- Items ---
  public getItems(): Item[] {
    const items = this.getStorage<Item[]>('items', initialItems);
    return items.map(i => ({
      ...i,
      code: i.item_code,
      name: i.name_eng,
      item_type: (i.point_type === 'individual' ? 'Single' : 'Group') as 'Single' | 'Group',
      min_participants: i.no_of_participants || 1,
      max_participants: i.no_of_participants || 1
    }));
  }

  public getItem(itemIdOrCode: number | string): Item | undefined {
    const items = this.getItems();
    const str = itemIdOrCode.toString();
    const num = Number(str.replace('itm-', ''));
    return items.find(i => i.item_id === num || i.item_code === str || i.id === str || i.code === str);
  }

  public toggleItemLock(itemIdOrCode: number | string): boolean {
    const item = this.getItem(itemIdOrCode);
    if (!item) return false;

    const items = this.getStorage<Item[]>('items', initialItems);
    const idx = items.findIndex(i => i.item_id === item.item_id);
    if (idx >= 0) {
      items[idx].is_locked = !items[idx].is_locked;
      this.setStorage('items', items);
      if (supabase) {
        supabase.from('items').update({ is_locked: items[idx].is_locked }).eq('item_id', item.item_id).then();
      }
      return items[idx].is_locked;
    }
    return false;
  }

  public saveItem(item: Partial<Item>): Item {
    const items = this.getStorage<Item[]>('items', initialItems);
    if (item.item_id) {
      const idx = items.findIndex(i => i.item_id === item.item_id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...item } as Item;
        this.setStorage('items', items);
        if (supabase) {
          supabase.from('items').upsert(items[idx]).then();
        }
        return items[idx];
      }
    }
    const nextItemId = items.length > 0 ? Math.max(...items.map(i => i.item_id)) + 1 : 1;
    const newItem: Item = {
      id: `itm-${nextItemId}`,
      item_id: item.item_id || nextItemId,
      item_code: item.item_code || item.code || `ITM-${nextItemId.toString().padStart(2, '0')}`,
      code: item.item_code || item.code || `ITM-${nextItemId.toString().padStart(2, '0')}`,
      name_eng: item.name_eng || item.name || 'New Item',
      name_mal: item.name_mal || 'പുതിയ ഇനം',
      name: item.name_eng || item.name || 'New Item',
      phase: item.phase || 'Senior',
      mode: item.mode || 'onstage',
      category: item.category || 'A',
      tabulation: item.tabulation !== undefined ? item.tabulation : true,
      point_type: item.point_type || (item.item_type === 'Group' ? 'group' : 'individual'),
      item_type: (item.item_type || (item.point_type === 'group' ? 'Group' : 'Single')) as 'Single' | 'Group',
      no_of_participants: item.no_of_participants || item.max_participants || 1,
      min_participants: item.min_participants || item.no_of_participants || 1,
      max_participants: item.max_participants || item.no_of_participants || 1,
      l_star: item.l_star || false,
      em_star: item.em_star || false,
      is_locked: false,
      created_at: new Date().toISOString()
    };
    items.push(newItem);
    this.setStorage('items', items);
    if (supabase) {
      supabase.from('items').insert(newItem).then();
    }
    return newItem;
  }

  // --- Granular Item Locks ---
  public getCollegeItemLocks(): CollegeItemLock[] {
    return this.getStorage('itemLocks', initialCollegeItemLocks);
  }

  public setCollegeItemLock(collegeAfflNoOrId: number | string, itemIdOrCode: number | string, isUnlocked: boolean, hoursValid: number = 24): CollegeItemLock {
    const college = this.getCollege(collegeAfflNoOrId);
    const item = this.getItem(itemIdOrCode);
    const affl = college ? college.affl_no : 11;
    const itmId = item ? item.item_id : 1;

    const locks = this.getCollegeItemLocks();
    const idx = locks.findIndex(l => l.college_affl_no === affl && l.item_id === itmId);
    const validUntil = new Date(Date.now() + hoursValid * 3600000).toISOString();

    if (idx >= 0) {
      locks[idx].is_unlocked = isUnlocked;
      locks[idx].unlocked_until = isUnlocked ? validUntil : null;
      this.setStorage('itemLocks', locks);
      return locks[idx];
    } else {
      const newLock: CollegeItemLock = {
        id: `cil-${Date.now()}`,
        college_affl_no: affl,
        college_id: `col-${affl}`,
        item_id: itmId,
        is_unlocked: isUnlocked,
        unlocked_until: isUnlocked ? validUntil : null
      };
      locks.push(newLock);
      this.setStorage('itemLocks', locks);
      return newLock;
    }
  }

  // --- Students ---
  public getStudents(collegeAfflNoOrId?: number | string): Student[] {
    const students = this.getStorage<Student[]>('students', initialStudents);
    const colleges = this.getColleges();
    const enriched = students.map(s => ({
      ...s,
      full_name: s.name,
      category: s.phase,
      college_id: `col-${s.college_affl_no}`,
      college: colleges.find(c => c.affl_no === s.college_affl_no)
    }));

    if (!collegeAfflNoOrId) return enriched;
    const col = this.getCollege(collegeAfflNoOrId);
    return col ? enriched.filter(s => s.college_affl_no === col.affl_no) : enriched;
  }

  public getStudent(idOrChest: string): Student | undefined {
    return this.getStudents().find(s => s.id === idOrChest || s.chest_no === idOrChest);
  }

  public getStudentByChestNo(chestNo: string): Student | undefined {
    return this.getStudents().find(s => s.chest_no?.trim().toUpperCase() === chestNo.trim().toUpperCase());
  }

  public saveStudent(student: Partial<Student>): Student {
    const students = this.getStorage<Student[]>('students', initialStudents);
    if (student.chest_no) {
      const idx = students.findIndex(s => s.chest_no === student.chest_no);
      if (idx >= 0) {
        students[idx] = { ...students[idx], ...student } as Student;
        this.setStorage('students', students);
        if (supabase) {
          supabase.from('students').upsert(students[idx]).then();
        }
        return students[idx];
      }
    }
    const count = students.length + 101;
    const affl = student.college_affl_no || (student.college_id ? Number(student.college_id.replace('col-', '')) : 11);
    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      name: student.name || student.full_name || 'Participant Name',
      full_name: student.name || student.full_name || 'Participant Name',
      admission_no: student.admission_no || `ADM-${Date.now().toString().slice(-4)}`,
      college_affl_no: affl,
      college_id: `col-${affl}`,
      class: student.class || 'Aliya 1',
      phase: student.phase || student.category || 'Senior',
      category: student.phase || student.category || 'Senior',
      chest_no: student.chest_no || `CH-${count}`,
      phone: student.phone || '',
      photo_url: student.photo_url || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      created_at: new Date().toISOString()
    };
    students.push(newStudent);
    this.setStorage('students', students);
    if (supabase) {
      supabase.from('students').insert(newStudent).then();
    }
    return newStudent;
  }

  // --- Max Participation Quotas ---
  public getMaxParticipation(): MaxParticipation[] {
    return this.getStorage('maxParticipation', initialMaxParticipation);
  }

  // --- Registrations (Multiple-Row Flat Architecture) ---
  public getRegistrations(collegeAfflNoOrId?: number | string): Registration[] {
    const regs = this.getStorage<Registration[]>('registrations', initialRegistrations);
    const items = this.getItems();
    const colleges = this.getColleges();
    const students = this.getStudents();

    const enriched = regs.map(r => {
      const itm = items.find(i => i.item_id === r.item_id);
      const col = colleges.find(c => c.affl_no === r.college_affl_no);
      const stu = students.find(s => s.chest_no === r.chest_no);
      const teamRegs = regs.filter(other => other.item_id === r.item_id && other.college_affl_no === r.college_affl_no);
      const teamStudents = teamRegs.map(t => students.find(s => s.chest_no === t.chest_no)).filter(Boolean) as Student[];

      return {
        ...r,
        college_id: col?.id || `col-${r.college_affl_no}`,
        item: itm,
        college: col,
        student: stu,
        participants: teamStudents
      };
    });

    if (!collegeAfflNoOrId) return enriched;
    const col = this.getCollege(collegeAfflNoOrId);
    return col ? enriched.filter(r => r.college_affl_no === col.affl_no) : enriched;
  }

  // Register multiple students for an item (creates multiple rows!)
  public registerCollegeForItem(
    collegeAfflNoOrId: number | string,
    itemIdOrCode: number | string,
    chestNosOrIds: string[]
  ): { success: boolean; error?: string } {
    const college = this.getCollege(collegeAfflNoOrId);
    const item = this.getItem(itemIdOrCode);
    if (!college || !item) return { success: false, error: 'College or event not found' };

    const check = this.isRegistrationOpen(college.affl_no, item.item_id);
    if (!check.canRegister) {
      return { success: false, error: check.reason || 'Registration is closed' };
    }

    // Convert any student IDs to chest numbers
    const allStudents = this.getStudents();
    const chestNos = chestNosOrIds.map(val => {
      const s = allStudents.find(stu => stu.id === val || stu.chest_no === val);
      return s ? s.chest_no : val;
    });

    if (chestNos.length < item.no_of_participants) {
      return {
        success: false,
        error: `Requires ${item.no_of_participants} participant(s). You selected ${chestNos.length}.`
      };
    }

    const quotaLimits = this.getMaxParticipation();

    // Validate each student's participation quota
    for (const cNo of chestNos) {
      const student = allStudents.find(s => s.chest_no === cNo);
      if (!student) continue;

      const studentRegs = this.getRegistrations().filter(r => r.chest_no === cNo && r.item_id !== item.item_id);
      const quota = quotaLimits.find(q => q.phase === student.phase) || quotaLimits[0];

      if (quota) {
        const currentTotal = studentRegs.length + 1;
        if (currentTotal > quota.total_max) {
          return {
            success: false,
            error: `Student ${student.name} (${cNo}) exceeds max total events limit of ${quota.total_max}.`
          };
        }
      }
    }

    const regs = this.getStorage<Registration[]>('registrations', initialRegistrations);
    const logs = this.getStorage<RegistrationLog[]>('registration_logs', initialRegistrationLogs);

    // 1. Remove existing entries for this college and item (logging delete)
    const existing = regs.filter(r => r.item_id === item.item_id && r.college_affl_no === college.affl_no);
    existing.forEach(oldReg => {
      logs.push({
        id: `log-${Date.now()}-${Math.random()}`,
        item_id: item.item_id,
        college_affl_no: college.affl_no,
        chest_no: oldReg.chest_no,
        process: 'DELETE',
        timestamp: new Date().toISOString()
      });
    });

    const remaining = regs.filter(r => !(r.item_id === item.item_id && r.college_affl_no === college.affl_no));

    // 2. Add individual row per chest number (logging add)
    chestNos.forEach(cNo => {
      const newRow: Registration = {
        id: `reg-${Date.now()}-${cNo}`,
        item_id: item.item_id,
        college_affl_no: college.affl_no,
        college_id: `col-${college.affl_no}`,
        chest_no: cNo,
        code_letter: existing[0]?.code_letter || null,
        created_at: new Date().toISOString()
      };
      remaining.push(newRow);

      logs.push({
        id: `log-${Date.now()}-${cNo}`,
        item_id: item.item_id,
        college_affl_no: college.affl_no,
        chest_no: cNo,
        process: 'ADD',
        timestamp: new Date().toISOString()
      });
    });

    this.setStorage('registrations', remaining);
    this.setStorage('registration_logs', logs);

    if (supabase) {
      const client = supabase;
      client.from('registrations').delete().match({ item_id: item.item_id, college_affl_no: college.affl_no }).then(() => {
        const dbRows = chestNos.map(cNo => ({
          item_id: item.item_id,
          college_affl_no: college.affl_no,
          chest_no: cNo
        }));
        client.from('registrations').insert(dbRows).then();
      });
    }

    return { success: true };
  }

  // --- Registration Logs ---
  public getRegistrationLogs(collegeAfflNoOrId?: number | string): RegistrationLog[] {
    const logs = this.getStorage<RegistrationLog[]>('registration_logs', initialRegistrationLogs);
    if (!collegeAfflNoOrId) return logs;
    const col = this.getCollege(collegeAfflNoOrId);
    return col ? logs.filter(l => l.college_affl_no === col.affl_no) : logs;
  }

  // --- Stage Controller: Code Letters & Stages ---
  public assignCodeLetter(
    itemIdOrRegId: number | string,
    collegeAfflNoOrCode: number | string,
    codeLetter?: string
  ): void {
    const regs = this.getStorage<Registration[]>('registrations', initialRegistrations);

    // Case 1: called with (regId, codeLetter)
    if (codeLetter === undefined && typeof collegeAfflNoOrCode === 'string') {
      const regId = itemIdOrRegId.toString();
      const letter = collegeAfflNoOrCode.trim().toUpperCase();
      const target = regs.find(r => r.id === regId);
      if (target) {
        regs.forEach(r => {
          if (r.item_id === target.item_id && r.college_affl_no === target.college_affl_no) {
            r.code_letter = letter;
          }
        });
      }
      this.setStorage('registrations', regs);
      return;
    }

    // Case 2: called with (itemId, collegeAfflNo, codeLetter)
    const itm = this.getItem(itemIdOrRegId);
    const col = this.getCollege(collegeAfflNoOrCode);
    const letter = (codeLetter || '').trim().toUpperCase();

    if (itm && col) {
      regs.forEach(r => {
        if (r.item_id === itm.item_id && r.college_affl_no === col.affl_no) {
          r.code_letter = letter;
        }
      });
      this.setStorage('registrations', regs);

      if (supabase) {
        supabase.from('registrations').update({ code_letter: letter }).match({ item_id: itm.item_id, college_affl_no: col.affl_no }).then();
      }
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
      scheduled_start: s.starting,
      stage_id: `stg-${s.stage_number}`,
      item: items.find(i => i.item_id === s.item_id),
      stage: stages.find(st => st.stage_number === s.stage_number)
    }));
  }

  public updateScheduleStatus(itemIdOrScheduleId: number | string, status: StageStatus): void {
    const itm = this.getItem(itemIdOrScheduleId);
    const schedules = this.getStorage<Schedule[]>('schedules', initialSchedules);
    const idx = itm
      ? schedules.findIndex(s => s.item_id === itm.item_id)
      : schedules.findIndex(s => s.id === itemIdOrScheduleId);

    if (idx >= 0) {
      schedules[idx].status = status;
      schedules[idx].updated_at = new Date().toISOString();
      this.setStorage('schedules', schedules);
      if (supabase) {
        supabase.from('schedules').update({ status }).eq('item_id', schedules[idx].item_id).then();
      }
    }
  }

  // --- Result Entry & Scoring ---
  public getResults(): Result[] {
    const results = this.getStorage<Result[]>('results', initialResults);
    const items = this.getItems();
    const colleges = this.getColleges();
    const students = this.getStudents();
    const registrations = this.getRegistrations();

    return results.map(res => {
      const itm = items.find(i => i.item_id === res.item_id);
      const col = colleges.find(c => c.affl_no === res.college_affl_no);
      const stu = students.find(s => s.chest_no === res.chest_no);
      const itemResults = results.filter(r => r.item_id === res.item_id);
      const first = itemResults.find(r => r.rank === 1);
      const second = itemResults.find(r => r.rank === 2);
      const third = itemResults.find(r => r.rank === 3);

      return {
        ...res,
        item: itm,
        college: col,
        student: stu,
        first_reg: first ? registrations.find(r => r.item_id === res.item_id && r.college_affl_no === first.college_affl_no) : null,
        second_reg: second ? registrations.find(r => r.item_id === res.item_id && r.college_affl_no === second.college_affl_no) : null,
        third_reg: third ? registrations.find(r => r.item_id === res.item_id && r.college_affl_no === third.college_affl_no) : null,
        scores_breakdown: itemResults.map(r => ({
          code_letter: r.code_letter || '',
          criteria_a: Math.round((r.mark_percentage || 75) * 0.4),
          criteria_b: Math.round((r.mark_percentage || 75) * 0.4),
          criteria_c: Math.round((r.mark_percentage || 75) * 0.2),
          total: r.mark_percentage || 75
        }))
      };
    });
  }

  public submitResultEntry(
    itemIdOrCode: number | string,
    scores: Array<{
      code_letter: string;
      college_affl_no?: number;
      chest_no?: string;
      mark_percentage?: number;
      total?: number;
      grade?: string;
      points?: number;
    }>
  ): void {
    const itm = this.getItem(itemIdOrCode);
    const itemId = itm ? itm.item_id : Number(itemIdOrCode);

    const results = this.getStorage<Result[]>('results', initialResults);
    const remaining = results.filter(r => r.item_id !== itemId);

    const sorted = [...scores].sort((a, b) => (b.mark_percentage || b.total || 0) - (a.mark_percentage || a.total || 0));

    sorted.forEach((s, index) => {
      const marks = s.mark_percentage || s.total || 75;
      remaining.push({
        id: `res-${Date.now()}-${s.code_letter}`,
        item_id: itemId,
        code_letter: s.code_letter,
        college_affl_no: s.college_affl_no || null,
        chest_no: s.chest_no || null,
        mark_percentage: marks,
        grade: s.grade || (marks >= 90 ? 'A+' : marks >= 80 ? 'A' : 'B'),
        rank: index + 1,
        points: s.points || (index === 0 ? 5 : index === 1 ? 3 : index === 2 ? 1 : 0),
        published: false,
        best_in_fest: index === 0 && marks >= 95,
        created_at: new Date().toISOString()
      });
    });

    this.setStorage('results', remaining);
    if (supabase) {
      const client = supabase;
      client.from('results').delete().eq('item_id', itemId).then(() => {
        client.from('results').insert(remaining.filter(r => r.item_id === itemId)).then();
      });
    }
  }

  public publishResult(itemIdOrCode: number | string, publish: boolean = true): void {
    const itm = this.getItem(itemIdOrCode);
    const itemId = itm ? itm.item_id : Number(itemIdOrCode);

    const results = this.getStorage<Result[]>('results', initialResults);
    results.forEach(r => {
      if (r.item_id === itemId) {
        r.published = publish;
      }
    });
    this.setStorage('results', results);
    if (supabase) {
      supabase.from('results').update({ published: publish }).eq('item_id', itemId).then();
    }
  }

  // --- Appeals ---
  public getAppeals(collegeAfflNoOrId?: number | string): Appeal[] {
    const appeals = this.getStorage<Appeal[]>('appeals', initialAppeals);
    const items = this.getItems();
    const colleges = this.getColleges();

    const enriched = appeals.map(a => {
      const itm = items.find(i => i.item_id === a.item_id);
      return {
        ...a,
        reason: a.reason_for_appeal,
        status: a.current_status,
        item: itm,
        college: colleges.find(c => c.team_manager_phone === a.mobile_number) || colleges[0]
      };
    });

    if (!collegeAfflNoOrId) return enriched;
    const col = this.getCollege(collegeAfflNoOrId);
    return col ? enriched.filter(a => a.college?.affl_no === col.affl_no) : enriched;
  }

  public submitAppeal(
    collegeAfflNoOrObj: number | string | Partial<Appeal>,
    itemId?: number | string,
    reason?: string,
    feeReceiptUrl?: string
  ): Appeal {
    const appeals = this.getStorage<Appeal[]>('appeals', initialAppeals);

    // Overload 1: passed as object
    if (typeof collegeAfflNoOrObj === 'object') {
      const obj = collegeAfflNoOrObj;
      const newAppeal: Appeal = {
        id: `app-${Date.now()}`,
        phase: obj.phase || 'Senior',
        item_id: obj.item_id || 1,
        chest_no: obj.chest_no || null,
        code_letter: obj.code_letter || null,
        appeal_description: obj.appeal_description || '',
        reason_for_appeal: obj.reason_for_appeal || obj.reason || 'Judgement disparity',
        reason: obj.reason_for_appeal || obj.reason || 'Judgement disparity',
        transaction_number: obj.transaction_number || 'UPI-REF-001',
        fee_receipt_url: obj.fee_receipt_url || null,
        team_manager_name: obj.team_manager_name || 'Team Manager',
        mobile_number: obj.mobile_number || '9800000000',
        acknowledgment: obj.acknowledgment !== undefined ? obj.acknowledgment : true,
        current_status: 'Pending',
        status: 'Pending',
        admin_remarks: null,
        created_at: new Date().toISOString()
      };
      appeals.push(newAppeal);
      this.setStorage('appeals', appeals);
      if (supabase) supabase.from('appeals').insert(newAppeal).then();
      return newAppeal;
    }

    // Overload 2: passed as arguments
    const itm = this.getItem(itemId || 1);
    const col = this.getCollege(collegeAfflNoOrObj);
    const newAppeal: Appeal = {
      id: `app-${Date.now()}`,
      phase: itm ? itm.phase : 'Senior',
      item_id: itm ? itm.item_id : 1,
      chest_no: null,
      code_letter: null,
      appeal_description: reason || '',
      reason_for_appeal: reason || 'Dispute',
      reason: reason || 'Dispute',
      transaction_number: 'UPI-TXN-' + Date.now().toString().slice(-6),
      fee_receipt_url: feeReceiptUrl || null,
      team_manager_name: col?.team_manager_name || 'Team Manager',
      mobile_number: col?.team_manager_phone || '9800000000',
      acknowledgment: true,
      current_status: 'Pending',
      status: 'Pending',
      admin_remarks: null,
      created_at: new Date().toISOString()
    };
    appeals.push(newAppeal);
    this.setStorage('appeals', appeals);
    if (supabase) supabase.from('appeals').insert(newAppeal).then();
    return newAppeal;
  }

  public reviewAppeal(appealId: string, status: AppealStatus, remarks: string): void {
    const appeals = this.getStorage<Appeal[]>('appeals', initialAppeals);
    const idx = appeals.findIndex(a => a.id === appealId);
    if (idx >= 0) {
      appeals[idx].current_status = status;
      appeals[idx].status = status;
      appeals[idx].admin_remarks = remarks;
      this.setStorage('appeals', appeals);
      if (supabase) {
        supabase.from('appeals').update({ current_status: status, admin_remarks: remarks }).eq('id', appealId).then();
      }
    }
  }

  // --- Replacements ---
  public getReplacements(collegeAfflNoOrId?: number | string): Replacement[] {
    const list = this.getStorage<Replacement[]>('replacements', []);
    return list;
  }

  public submitReplacement(registrationId: string, origStudentId: string, newStudentId: string, reason: string): Replacement {
    const list = this.getStorage<Replacement[]>('replacements', []);
    const students = this.getStudents();
    const orig = students.find(s => s.id === origStudentId || s.chest_no === origStudentId);
    const rep = students.find(s => s.id === newStudentId || s.chest_no === newStudentId);

    const newRep: Replacement = {
      id: `rep-${Date.now()}`,
      registration_id: registrationId,
      original_student_id: origStudentId,
      replacement_student_id: newStudentId,
      original_student: orig,
      replacement_student: rep,
      reason,
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    list.push(newRep);
    this.setStorage('replacements', list);
    return newRep;
  }

  public reviewReplacement(repId: string, status: AppealStatus): Replacement | undefined {
    const list = this.getStorage<Replacement[]>('replacements', []);
    const idx = list.findIndex(r => r.id === repId);
    if (idx >= 0) {
      list[idx].status = status;
      this.setStorage('replacements', list);
      return list[idx];
    }
    return undefined;
  }

  // --- Submissions ---
  public getSubmissionEntries(collegeAfflNoOrId?: number | string): SubmissionEntry[] {
    const subs = this.getStorage<SubmissionEntry[]>('submissions', initialSubmissionEntries);
    const items = this.getItems();
    const students = this.getStudents();
    const enriched = subs.map(s => ({
      ...s,
      item: items.find(i => i.item_id === s.item_id),
      student: students.find(st => st.chest_no === s.chest_no)
    }));

    if (!collegeAfflNoOrId) return enriched;
    const col = this.getCollege(collegeAfflNoOrId);
    return col ? enriched.filter(s => s.college_affl_no === col.affl_no) : enriched;
  }

  // --- Leaderboard & Trophy Standings ---
  public getLeaderboard(): Array<{
    college: College;
    points: number;
    gold: number;
    silver: number;
    bronze: number;
  }> {
    const colleges = this.getColleges();
    const results = this.getResults().filter(r => r.published);

    const standingsMap = new Map<number, { gold: number; silver: number; bronze: number; points: number }>();
    colleges.forEach(c => standingsMap.set(c.affl_no, { gold: 0, silver: 0, bronze: 0, points: 0 }));

    results.forEach(res => {
      if (res.college_affl_no) {
        const curr = standingsMap.get(res.college_affl_no);
        if (curr) {
          curr.points += res.points || 0;
          if (res.rank === 1) curr.gold += 1;
          else if (res.rank === 2) curr.silver += 1;
          else if (res.rank === 3) curr.bronze += 1;
        }
      }
    });

    return colleges
      .map(c => ({
        college: c,
        ...(standingsMap.get(c.affl_no) || { gold: 0, silver: 0, bronze: 0, points: 0 })
      }))
      .sort((a, b) => b.points - a.points || b.gold - a.gold);
  }
}

export const festService = new FestService();
