import {
  College,
  Student,
  Item,
  FestSettings,
  EntryLock,
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
  AppealStatus,
  formatStudentCategory,
  normalizeCategoryKey
} from '../types/fest';

import {
  findStudentByIdentifier,
  getCanonicalChestNo,
  normalizeRegistration,
  registrationContainsStudent,
  calculateStudentEvents,
  isUuid
} from '../utils/studentIdentity';

// Mock data removed
import { supabase } from '../supabase/client';

const STORAGE_KEY_PREFIX = 'wafy_fest_db_';

class FestService {
  private isClient = typeof window !== 'undefined';

  constructor() {
    if (this.isClient) {
      // Clear registrations cached in localStorage
      const purgeKey = 'wafy_fest_db_reset_registrations_v5';
      if (!localStorage.getItem(purgeKey)) {
        try {
          ['registrations', 'registration_logs'].forEach(k => {
            localStorage.removeItem(STORAGE_KEY_PREFIX + k);
          });
          localStorage.setItem(purgeKey, 'true');
        } catch {
          // ignore storage error in restricted contexts
        }
      }
    }
  }

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

  private lastSyncTime = 0;
  private readonly SYNC_TTL = 15 * 60 * 1000; // 15 minutes TTL for Free Plan bandwidth optimization

  // --- Live Supabase Sync (Throttled & Scoped with Specific Columns) ---
  public async syncWithSupabase(collegeAfflNo?: number, force = false): Promise<boolean> {
    if (!supabase) return false;
    const now = Date.now();
    if (!force && now - this.lastSyncTime < this.SYNC_TTL) {
      return true; // Use cached data in localStorage
    }

    try {
      const client = supabase;

      // 1. Settings
      const { data: festData } = await client
        .from('fest_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (festData) this.setStorage('festSettings', festData);

      // 2. Colleges
      const { data: colData } = await client
        .from('colleges')
        .select('*');
      if (colData) this.setStorage('colleges', colData);

      // 3. Items catalog
      const { data: itemData } = await client
        .from('items')
        .select('*');
      if (itemData && itemData.length > 0) {
        this.setStorage('items', itemData);
      }

      // 4. Students: Scoped fetch
      let studentQuery = client.from('students').select('*');
      if (collegeAfflNo) {
        studentQuery = studentQuery.eq('college_affl_no', collegeAfflNo);
      }
      const { data: studentData } = await studentQuery;
      if (studentData) {
        if (collegeAfflNo) {
          const existing = this.getStorage<Student[]>('students', []);
          const otherColleges = existing.filter(s => s.college_affl_no !== collegeAfflNo);
          this.setStorage('students', [...otherColleges, ...studentData]);
        } else {
          this.setStorage('students', studentData);
        }
      }

      // 5. Stages & Schedules
      const { data: stgData } = await client.from('stages').select('*');
      if (stgData) this.setStorage('stages', stgData);

      const { data: schData } = await client.from('schedules').select('*');
      if (schData) this.setStorage('schedules', schData);

      // 6. Registrations: Scoped fetch
      let regQuery = client.from('registrations').select('*');
      if (collegeAfflNo) {
        regQuery = regQuery.eq('college_affl_no', collegeAfflNo);
      }
      const { data: regData } = await regQuery;
      if (regData) {
        const normalizedData = regData.map((r: Record<string, any>) => ({ ...r, college_affl_no: Number(r.college_affl_no), item_id: Number(r.item_id) }));
        if (collegeAfflNo) {
          const numAffl = Number(collegeAfflNo);
          const existing = this.getStorage<Registration[]>('registrations', []);
          const otherColleges = existing.filter(r => Number(r.college_affl_no) !== numAffl);
          this.setStorage('registrations', [...otherColleges, ...normalizedData]);
        } else {
          this.setStorage('registrations', normalizedData);
        }
        // Run self-healing repair for legacy UUID chest numbers
        this.repairLegacyRegistrations();
      }

      // 7. Results & Locks
      const { data: resData } = await client.from('results').select('*');
      if (resData) this.setStorage('results', resData);

      const { data: lockData } = await client.from('entry_locks').select('*');
      if (lockData) this.setStorage('entryLocks', lockData);

      // 8. Appeals
      const { data: appealData } = await client.from('appeals').select('*');
      if (appealData) {
        this.setStorage('appeals', appealData);
      }

      this.lastSyncTime = Date.now();
      return true;
    } catch (err) {
      console.warn('Notice: Supabase sync deferred:', err);
      return false;
    }
  }

  // --- Supabase Realtime Subscriptions (Replaces Polling with WebSockets) ---
  public subscribeToRealtimeChanges(onUpdate: () => void): () => void {
    if (!supabase) return () => {};

    const channel = supabase
      .channel('fest_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
        this.lastSyncTime = 0; // Invalidate cache
        this.syncWithSupabase(undefined, true).then(onUpdate);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => {
        this.lastSyncTime = 0;
        this.syncWithSupabase(undefined, true).then(onUpdate);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entry_locks' }, () => {
        this.lastSyncTime = 0;
        this.syncWithSupabase(undefined, true).then(onUpdate);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => {
        this.lastSyncTime = 0;
        this.syncWithSupabase(undefined, true).then(onUpdate);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // --- Profiles & Auth ---
  // public getProfileByRole is removed as it's no longer used.

  // --- Fest Settings ---
  public getFestSettings(): FestSettings {
    const defaultSettings: FestSettings = {
      id: 1,
      fest_name: 'WAFY ARTS FEST',
      reg_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      fine_deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    };
    return this.getStorage('festSettings', defaultSettings);
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

    // Check 2D Matrix Cell: entry_locks(item_id, college_affl_no)
    const entryLocks = this.getEntryLocks();
    const cell = entryLocks.find(l => l.college_affl_no === college.affl_no && l.item_id === item.item_id);

    // If explicitly marked closed in the matrix:
    if (cell && !cell.is_open) {
      return { canRegister: false, reason: 'Registration closed by fest admin for this event', isFinePeriod: false };
    }

    if (item.is_locked) {
      if (cell && cell.is_open) {
        return { canRegister: true, isFinePeriod: false };
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

    // Past deadline: if admin explicitly marked open in matrix, permit registration
    if (cell && cell.is_open) {
      return { canRegister: true, isFinePeriod: true, reason: 'Admin Matrix Permission Active' };
    }

    return { canRegister: false, reason: 'Registration deadline has passed', isFinePeriod: false };
  }

  // --- Colleges ---
  public getColleges(): College[] {
    const cols = this.getStorage<College[]>('colleges', []);
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
    const items = this.getStorage<Item[]>('items', []);
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

    const items = this.getStorage<Item[]>('items', []);
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
    const items = this.getStorage<Item[]>('items', []);
    if (item.item_id) {
      const idx = items.findIndex(i => i.item_id === item.item_id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...item } as Item;
        this.setStorage('items', items);
        if (supabase) {
          const dbRow = {
            item_id: Number(items[idx].item_id),
            item_code: items[idx].item_code,
            name_eng: items[idx].name_eng,
            name_mal: items[idx].name_mal,
            phase: items[idx].phase,
            mode: items[idx].mode,
            category: items[idx].category,
            tabulation: items[idx].tabulation,
            point_type: items[idx].point_type,
            no_of_participants: items[idx].no_of_participants,
            l_star: items[idx].l_star,
            em_star: items[idx].em_star
          };
          supabase.from('items').upsert(dbRow, { onConflict: 'item_id' }).then();
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
      const dbRow = {
        item_id: Number(newItem.item_id),
        item_code: newItem.item_code,
        name_eng: newItem.name_eng,
        name_mal: newItem.name_mal,
        phase: newItem.phase,
        mode: newItem.mode,
        category: newItem.category,
        tabulation: newItem.tabulation,
        point_type: newItem.point_type,
        no_of_participants: newItem.no_of_participants,
        l_star: newItem.l_star,
        em_star: newItem.em_star
      };
      supabase.from('items').insert(dbRow).then();
    }
    return newItem;
  }

  // --- Entry Locks Matrix ---
  public getEntryLocks(): EntryLock[] {
    const raw = this.getStorage<EntryLock[]>('entryLocks', []);
    const colleges = this.getColleges();
    const items = this.getItems();
    let updated = false;
    const locks = [...raw];

    items.forEach(item => {
      colleges.forEach(col => {
        const found = locks.find(l => l.item_id === item.item_id && l.college_affl_no === col.affl_no);
        if (!found) {
          locks.push({
            item_id: item.item_id,
            college_affl_no: col.affl_no,
            is_open: !item.is_locked
          });
          updated = true;
        }
      });
    });

    if (updated) {
      this.setStorage('entryLocks', locks);
    }
    return locks;
  }

  // Alias for backward compatibility
  public getCollegeItemLocks(): EntryLock[] {
    return this.getEntryLocks();
  }

  public setEntryLockCell(itemId: number, collegeAfflNo: number, isOpen: boolean): EntryLock {
    const locks = this.getEntryLocks();
    const idx = locks.findIndex(l => l.item_id === itemId && l.college_affl_no === collegeAfflNo);
    const now = new Date().toISOString();

    let resultLock: EntryLock;
    if (idx >= 0) {
      locks[idx].is_open = isOpen;
      locks[idx].updated_at = now;
      resultLock = locks[idx];
    } else {
      resultLock = {
        item_id: itemId,
        college_affl_no: collegeAfflNo,
        is_open: isOpen,
        updated_at: now
      };
      locks.push(resultLock);
    }
    this.setStorage('entryLocks', locks);

    const client = supabase;
    if (client) {
      Promise.resolve(
        client.from('entry_locks').upsert({
          item_id: itemId,
          college_affl_no: collegeAfflNo,
          is_open: isOpen,
          updated_at: now
        })
      ).catch(err => console.warn('Supabase entry_locks upsert error:', err));
    }

    return resultLock;
  }

  public setEntryLockRow(itemId: number, isOpen: boolean): void {
    const colleges = this.getColleges();
    const locks = this.getEntryLocks();
    const now = new Date().toISOString();

    colleges.forEach(col => {
      const idx = locks.findIndex(l => l.item_id === itemId && l.college_affl_no === col.affl_no);
      if (idx >= 0) {
        locks[idx].is_open = isOpen;
        locks[idx].updated_at = now;
      } else {
        locks.push({
          item_id: itemId,
          college_affl_no: col.affl_no,
          is_open: isOpen,
          updated_at: now
        });
      }
    });

    // Also update item.is_locked flag to keep consistency
    const items = this.getItems();
    const itm = items.find(i => i.item_id === itemId);
    if (itm) {
      itm.is_locked = !isOpen;
      this.setStorage('items', items);
    }

    this.setStorage('entryLocks', locks);

    const client = supabase;
    if (client) {
      colleges.forEach(col => {
        Promise.resolve(
          client.from('entry_locks').upsert({
            item_id: itemId,
            college_affl_no: col.affl_no,
            is_open: isOpen,
            updated_at: now
          })
        ).catch(() => {});
      });
    }
  }

  public setAllEntryLocks(isOpen: boolean): void {
    const items = this.getItems();
    items.forEach(itm => {
      this.setEntryLockRow(itm.item_id, isOpen);
    });
  }

  // Backward compatibility helper
  public setCollegeItemLock(collegeAfflNoOrId: number | string, itemIdOrCode: number | string, isUnlocked: boolean): EntryLock {
    const college = this.getCollege(collegeAfflNoOrId);
    const item = this.getItem(itemIdOrCode);
    const affl = college ? college.affl_no : Number(collegeAfflNoOrId) || 11;
    const itmId = item ? item.item_id : Number(itemIdOrCode) || 1;
    return this.setEntryLockCell(itmId, affl, isUnlocked);
  }

  // --- Students ---
  public getStudents(collegeAfflNoOrId?: number | string): Student[] {
    const students = this.getStorage<Student[]>('students', []);
    const colleges = this.getColleges();
    const enriched = students.map(s => {
      const cic = s.cic_no ?? s.admission_no ?? (s as any).cic_number;
      const chest = getCanonicalChestNo(s);
      return {
        ...s,
        name: s.name || s.full_name || '',
        full_name: s.name || s.full_name || '',
        cic_no: cic,
        admission_no: cic,
        cic_number: cic,
        chest_no: chest,
        phase: s.phase || (s as any).category || '',
        category: s.phase || (s as any).category || '',
        college_id: `col-${s.college_affl_no}`,
        college: colleges.find(c => c.affl_no === s.college_affl_no)
      };
    });

    if (!collegeAfflNoOrId) return enriched;
    const col = this.getCollege(collegeAfflNoOrId);
    return col ? enriched.filter(s => s.college_affl_no === col.affl_no) : enriched;
  }

  public async fetchStudentsForCollege(afflNo: number): Promise<Student[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('college_affl_no', afflNo)
          .order('name', { ascending: true });
        if (!error && data && data.length > 0) {
          const allStored = this.getStorage<Student[]>('students', []);
          const otherStudents = allStored.filter(s => s.college_affl_no !== afflNo);
          this.setStorage('students', [...otherStudents, ...data]);
          return this.getStudents(afflNo);
        }
      } catch (err) {
        console.warn('Error fetching college students from Supabase:', err);
      }
    }
    return this.getStudents(afflNo);
  }

  public async fetchRegistrationsForCollege(afflNo?: number): Promise<Registration[]> {
    if (supabase) {
      try {
        let query = supabase.from('registrations').select('*');
        if (afflNo) {
          query = query.eq('college_affl_no', afflNo);
        }
        const { data, error } = await query;
        if (!error && data) {
          const allStored = this.getStorage<Registration[]>('registrations', []);
          const numAffl = Number(afflNo);
          const otherRegs = afflNo ? allStored.filter(r => Number(r.college_affl_no) !== numAffl) : [];
          const normalizedData = data.map((r: Record<string, any>) => ({ ...r, college_affl_no: Number(r.college_affl_no), item_id: Number(r.item_id) }));
          this.setStorage('registrations', afflNo ? [...otherRegs, ...normalizedData] : normalizedData);
          return this.getRegistrations(afflNo);
        }
      } catch (err) {
        console.warn('Error fetching registrations from Supabase:', err);
      }
    }
    return this.getRegistrations(afflNo);
  }

  public getStudent(idOrChest: string): Student | undefined {
    return findStudentByIdentifier(this.getStudents(), idOrChest);
  }

  public getStudentByChestNo(chestNo: string): Student | undefined {
    return findStudentByIdentifier(this.getStudents(), chestNo);
  }

  public saveStudent(student: Partial<Student>): Student {
    const students = this.getStorage<Student[]>('students', []);
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
    const cicVal = student.cic_no || student.admission_no || `${Date.now().toString().slice(-5)}`;
    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      name: student.name || student.full_name || 'Participant Name',
      full_name: student.name || student.full_name || 'Participant Name',
      cic_no: cicVal,
      admission_no: cicVal,
      cic_number: cicVal,
      college_affl_no: affl,
      college_id: `col-${affl}`,
      class: student.class || 'Aliya 1',
      phase: student.phase || student.category || 'Senior',
      category: student.phase || student.category || 'Senior',
      chest_no: student.chest_no || `ST-${cicVal}`,
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
    return this.getStorage('maxParticipation', []);
  }

  // --- Registrations (Multiple-Row Flat Architecture) ---
  public getRegistrations(collegeAfflNoOrId?: number | string): Registration[] {
    const regs = this.getStorage<Registration[]>('registrations', []);
    const items = this.getItems();
    const colleges = this.getColleges();
    const students = this.getStudents();

    const enriched = regs.map(r => normalizeRegistration(r, students, items, colleges, regs));

    if (!collegeAfflNoOrId) return enriched;
    const col = this.getCollege(collegeAfflNoOrId);
    return col ? enriched.filter(r => r.college_affl_no === col.affl_no) : enriched;
  }

  public repairLegacyRegistrations(): number {
    const regs = this.getStorage<Registration[]>('registrations', []);
    const students = this.getStudents();
    let count = 0;

    const updated = regs.map(r => {
      if (isUuid(r.chest_no)) {
        const s = findStudentByIdentifier(students, r.chest_no, r.college_affl_no);
        if (s) {
          count++;
          return { ...r, chest_no: getCanonicalChestNo(s) };
        }
      }
      return r;
    });

    if (count > 0) {
      this.setStorage('registrations', updated);
      console.info(`[StudentIdentityResolver] Repaired ${count} legacy registration record(s) with raw UUID chest numbers.`);
    }
    return count;
  }

  // Register multiple students for an item (creates multiple rows!)
  public async registerCollegeForItem(
    collegeAfflNoOrId: number | string,
    itemIdOrCode: number | string,
    chestNosOrIds: string[],
    bypassDeadline: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    const college = this.getCollege(collegeAfflNoOrId);
    const item = this.getItem(itemIdOrCode);
    if (!college || !item) return { success: false, error: 'College or event not found' };

    if (!bypassDeadline) {
      const check = this.isRegistrationOpen(college.affl_no, item.item_id);
      if (!check.canRegister) {
        return { success: false, error: check.reason || 'Registration is closed' };
      }
    }

    // Convert any student IDs or admission numbers to canonical chest numbers for this college
    const collegeStudents = this.getStudents(college.affl_no);
    const resolvedStudents: Student[] = [];
    const chestNos: string[] = [];

    for (const val of chestNosOrIds) {
      const s = findStudentByIdentifier(collegeStudents, val, college.affl_no);
      if (s) {
        resolvedStudents.push(s);
        chestNos.push(getCanonicalChestNo(s));
      } else {
        console.warn(`[StudentIdentityResolver] Unable to resolve student identifier: ${val}`);
      }
    }

    if (chestNos.length < item.no_of_participants) {
      return {
        success: false,
        error: `Requires ${item.no_of_participants} valid participant(s). Resolved ${chestNos.length}.`
      };
    }

    const quotaLimits = this.getMaxParticipation();
    const collegeRegs = this.getRegistrations(college.affl_no);

    // Validate each student's participation quota strictly for this college
    for (const student of resolvedStudents) {
      const stats = calculateStudentEvents(student, collegeRegs.filter(r => r.item_id !== item.item_id), this.getItems());
      const quota = quotaLimits.find(q => normalizeCategoryKey(q.phase) === normalizeCategoryKey(student.phase)) || quotaLimits[0];

      if (quota) {
        const currentTotal = stats.registeredEventsCount + 1;
        if (currentTotal > quota.total_max) {
          return {
            success: false,
            error: `Student ${student.name} (${getCanonicalChestNo(student)}) exceeds max total events limit of ${quota.total_max}.`
          };
        }
      }
    }

    const regs = this.getStorage<Registration[]>('registrations', []);
    const logs = this.getStorage<RegistrationLog[]>('registration_logs', []);

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
      try {
        // Delete old rows
        const { error: delError } = await supabase
          .from('registrations')
          .delete()
          .match({ item_id: item.item_id, college_affl_no: college.affl_no });
        if (delError) {
          console.warn('Supabase registration delete notice:', delError.message);
        }

        // Insert new rows
        if (chestNos.length > 0) {
          const dbRows = chestNos.map(cNo => ({
            item_id: item.item_id,
            college_affl_no: college.affl_no,
            chest_no: cNo
          }));

          const { error: insError } = await supabase
            .from('registrations')
            .insert(dbRows);

          if (insError) {
            console.error('❌ Supabase registrations insert error:', insError);
            return {
              success: false,
              error: `Database Sync Error (${insError.code}): ${insError.message}`
            };
          }
        }
      } catch (err: any) {
        console.error('Unexpected Supabase registration error:', err);
      }
    }

    return { success: true };
  }

  public async unregisterCollegeForItem(
    collegeAfflNoOrId: number | string,
    itemIdOrCode: number | string
  ): Promise<{ success: boolean; error?: string }> {
    const college = this.getCollege(collegeAfflNoOrId);
    const item = this.getItem(itemIdOrCode);
    if (!college || !item) return { success: false, error: 'College or event not found' };

    const regs = this.getStorage<Registration[]>('registrations', []);
    const logs = this.getStorage<RegistrationLog[]>('registration_logs', []);

    const existing = regs.filter(r => Number(r.item_id) === Number(item.item_id) && Number(r.college_affl_no) === Number(college.affl_no));
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

    const remaining = regs.filter(r => !(Number(r.item_id) === Number(item.item_id) && Number(r.college_affl_no) === Number(college.affl_no)));
    this.setStorage('registrations', remaining);
    this.setStorage('registration_logs', logs);

    if (supabase) {
      try {
        const { error: delError } = await supabase
          .from('registrations')
          .delete()
          .match({ item_id: item.item_id, college_affl_no: college.affl_no });
        if (delError) {
          console.error('❌ Supabase registration unregister error:', delError);
          return {
            success: false,
            error: `Database Sync Error: ${delError.message}`
          };
        }
      } catch (err: any) {
        console.error('Unexpected Supabase unregister error:', err);
      }
    }

    return { success: true };
  }

  public clearAllRegistrations(collegeAfflNoOrId?: number | string): { success: boolean; count: number } {
    const regs = this.getStorage<Registration[]>('registrations', []);
    const logs = this.getStorage<RegistrationLog[]>('registration_logs', []);
    let remaining: Registration[] = [];
    let clearedCount = 0;

    if (collegeAfflNoOrId !== undefined && collegeAfflNoOrId !== 'all') {
      const col = this.getCollege(collegeAfflNoOrId);
      const affl = col ? col.affl_no : Number(collegeAfflNoOrId);
      const toRemove = regs.filter(r => r.college_affl_no === affl);
      clearedCount = toRemove.length;
      toRemove.forEach(r => {
        logs.push({
          id: `log-${Date.now()}-${r.chest_no}`,
          item_id: r.item_id,
          college_affl_no: affl,
          chest_no: r.chest_no,
          process: 'DELETE',
          timestamp: new Date().toISOString()
        });
      });
      remaining = regs.filter(r => r.college_affl_no !== affl);
      if (supabase) {
        supabase.from('registrations').delete().eq('college_affl_no', affl).then();
      }
    } else {
      clearedCount = regs.length;
      regs.forEach(r => {
        logs.push({
          id: `log-${Date.now()}-${r.chest_no}`,
          item_id: r.item_id,
          college_affl_no: r.college_affl_no,
          chest_no: r.chest_no,
          process: 'DELETE',
          timestamp: new Date().toISOString()
        });
      });
      remaining = [];
      if (supabase) {
        supabase.from('registrations').delete().gte('college_affl_no', 0).then();
      }
    }

    this.setStorage('registrations', remaining);
    this.setStorage('registration_logs', logs);
    return { success: true, count: clearedCount };
  }

  // --- Registration Logs ---
  public getRegistrationLogs(collegeAfflNoOrId?: number | string): RegistrationLog[] {
    const logs = this.getStorage<RegistrationLog[]>('registration_logs', []);
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
    const regs = this.getStorage<Registration[]>('registrations', []);

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
    return this.getStorage('stages', []);
  }

  public getSchedules(): Schedule[] {
    const schedules = this.getStorage<Schedule[]>('schedules', []);
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
    const schedules = this.getStorage<Schedule[]>('schedules', []);
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
    const results = this.getStorage<Result[]>('results', []);
    const items = this.getItems();
    const colleges = this.getColleges();
    const students = this.getStudents();
    const registrations = this.getRegistrations();

    return results.map(res => {
      const itm = items.find(i => i.item_id === res.item_id);
      const col = colleges.find(c => c.affl_no === res.college_affl_no);
      const stu = findStudentByIdentifier(students, res.chest_no, res.college_affl_no || undefined);
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

    const results = this.getStorage<Result[]>('results', []);
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

    const results = this.getStorage<Result[]>('results', []);
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
    const appeals = this.getStorage<Appeal[]>('appeals', []);
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
    const appeals = this.getStorage<Appeal[]>('appeals', []);

    // Overload 1: passed as object
    if (typeof collegeAfflNoOrObj === 'object') {
      const obj = collegeAfflNoOrObj;
      const newAppeal: Appeal = {
        id: `app-${Date.now()}`,
        phase: obj.phase || 'Senior',
        item_id: obj.item_id || 1,
        participant_name: obj.participant_name || null,
        chest_no: obj.chest_no || null,
        code_letter: obj.code_letter || null,
        appeal_description: obj.appeal_description || '',
        reason_for_appeal: obj.reason_for_appeal || obj.reason || 'Judgement disparity',
        reason: obj.reason_for_appeal || obj.reason || 'Judgement disparity',
        payment_mode: obj.payment_mode || 'Cash',
        paid_to: obj.paid_to || 'Fazil',
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
    const appeals = this.getStorage<Appeal[]>('appeals', []);
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
    if (!collegeAfflNoOrId) return list;
    const col = this.getCollege(collegeAfflNoOrId);
    return col
      ? list.filter(r => {
          const origAffl = r.original_student?.college_affl_no;
          const repAffl = r.replacement_student?.college_affl_no;
          return origAffl === col.affl_no || repAffl === col.affl_no || (r as any).college_affl_no === col.affl_no;
        })
      : list;
  }

  public submitReplacement(registrationId: string, origStudentId: string, newStudentId: string, reason: string): Replacement {
    const list = this.getStorage<Replacement[]>('replacements', []);
    const students = this.getStudents();
    const orig = findStudentByIdentifier(students, origStudentId);
    const rep = findStudentByIdentifier(students, newStudentId);

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
    const subs = this.getStorage<SubmissionEntry[]>('submissions', []);
    const items = this.getItems();
    const students = this.getStudents();
    const enriched = subs.map(s => ({
      ...s,
      item: items.find(i => i.item_id === s.item_id),
      student: findStudentByIdentifier(students, s.chest_no, s.college_affl_no)
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
