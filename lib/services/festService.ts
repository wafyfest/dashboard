import {
  College,
  Student,
  Item,
  FestSettings,
  EntryLock,
  CollegeItemLock,
  Registration,
  RegistrationLog,
  CodeLetter,
  Stage,
  Schedule,
  Result,
  Appeal,
  Replacement,
  Volunteer,
  Announcement,
  MaxParticipation,
  SubmissionEntry,
  LateRegistration,
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
  checkStudentQuota,
  isUuid
} from '../utils/studentIdentity';

// Mock data removed
import { supabase } from '../supabase/client';

const STORAGE_KEY_PREFIX = 'wafy_fest_db_';

export interface RegistrationStatus {
  canRegister: boolean;
  reason?: string;
  isFinePeriod: boolean;
}

class FestService {
  private isClient = typeof window !== 'undefined';
  private cache: Record<string, any> = {
    festSettings: null,
    colleges: [],
    items: [],
    students: [],
    registrations: [],
    registration_logs: [],
    entryLocks: [],
    schedules: [],
    stages: [],
    results: [],
    appeals: [],
    volunteers: [],
    announcements: [],
    code_letters: [],
    late_registrations: [],
    maxParticipation: []
  };

  constructor() {
    // In-memory RAM storage initialized
  }

  private getStorage<T>(key: string, fallback: T): T {
    if (this.cache[key] !== undefined && this.cache[key] !== null) {
      if (Array.isArray(fallback) && Array.isArray(this.cache[key])) {
        if (this.cache[key].length > 0 || !this.isClient) {
          return this.cache[key] as T;
        }
      } else {
        return this.cache[key] as T;
      }
    }
    return fallback;
  }

  private setStorage<T>(key: string, value: T): void {
    this.cache[key] = value;
  }

  public async clearCacheAndRefetch(): Promise<void> {
    this.cache = {
      festSettings: null,
      colleges: [],
      items: [],
      students: [],
      registrations: [],
      registration_logs: [],
      entryLocks: [],
      schedules: [],
      stages: [],
      results: [],
      appeals: [],
      replacements: [],
      code_letters: [],
      maxParticipation: []
    };
    this.scopeSyncTimes.clear();
    await this.syncWithSupabase(undefined, true);
  }

  private scopeSyncTimes = new Map<string | number, number>();
  private readonly SYNC_TTL = 15 * 60 * 1000; // 15 minutes TTL for Free Plan bandwidth optimization

  // --- Live Supabase Sync (Throttled & Scoped with Specific Columns) ---
  public async syncWithSupabase(collegeAfflNo?: number, force = false): Promise<boolean> {
    if (!supabase) return false;
    const scopeKey = collegeAfflNo ? Number(collegeAfflNo) : 'global';
    const lastTime = this.scopeSyncTimes.get(scopeKey) || 0;
    const now = Date.now();
    if (!force && now - lastTime < this.SYNC_TTL) {
      return true; // Use in-memory RAM cache
    }

    try {
      const client = supabase;
      let hasError = false;

      // 1. Settings
      const { data: festData, error: festErr } = await client
        .from('fest_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (festErr) {
        console.warn('Supabase sync error (fest_settings):', festErr.message);
        hasError = true;
      } else if (festData) {
        this.setStorage('festSettings', festData);
      }

      // 2. Colleges
      const { data: colData, error: colErr } = await client
        .from('colleges')
        .select('*')
        .order('affl_no', { ascending: true });
      if (colErr) {
        console.warn('Supabase sync error (colleges):', colErr.message);
        hasError = true;
      } else if (colData) {
        this.setStorage('colleges', colData);
      }

      // 3. Items catalog
      const { data: itemData, error: itemErr } = await client
        .from('items')
        .select('*')
        .order('item_code', { ascending: true });
      if (itemErr) {
        console.warn('Supabase sync error (items):', itemErr.message);
        hasError = true;
      } else if (itemData && itemData.length > 0) {
        this.setStorage('items', itemData);
      }

      // 4. Students: Scoped fetch or Deterministic Paged Global fetch
      if (collegeAfflNo) {
        const { data: studentData, error: stuErr } = await client
          .from('students')
          .select('*')
          .eq('college_affl_no', collegeAfflNo)
          .order('id', { ascending: true })
          .limit(1000);

        if (stuErr) {
          console.warn('Supabase sync error (students):', stuErr.message);
          hasError = true;
        } else if (studentData) {
          const existing = this.getStorage<Student[]>('students', []);
          const otherColleges = existing.filter(s => s.college_affl_no !== collegeAfflNo);
          this.setStorage('students', [...otherColleges, ...studentData]);
        }
      } else {
        let allStudents: Student[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await client
            .from('students')
            .select('*')
            .order('id', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) {
            console.error('Supabase student page sync error:', error.message);
            hasError = true;
            break; // Abort: do NOT overwrite complete cache with partial data
          }
          if (data && data.length > 0) {
            allStudents = allStudents.concat(data);
            if (data.length < pageSize) hasMore = false;
            page++;
          } else {
            hasMore = false;
          }
        }

        if (!hasError) {
          this.setStorage('students', allStudents);
        }
      }

      // 5. Stages & Schedules
      const { data: stgData, error: stgErr } = await client.from('stages').select('*');
      if (stgErr) {
        console.warn('Supabase sync error (stages):', stgErr.message);
        hasError = true;
      } else if (stgData) {
        this.setStorage('stages', stgData);
      }

      const { data: schData, error: schErr } = await client.from('schedules').select('*');
      if (schErr) {
        console.warn('Supabase sync error (schedules):', schErr.message);
        hasError = true;
      } else if (schData) {
        this.setStorage('schedules', schData);
      }

      // 6. Registrations: Scoped fetch
      let regQuery = client.from('registrations').select('*');
      if (collegeAfflNo) {
        regQuery = regQuery.eq('college_affl_no', collegeAfflNo);
      }
      const { data: regData, error: regErr } = await regQuery;
      if (regErr) {
        console.warn('Supabase sync error (registrations):', regErr.message);
        hasError = true;
      } else if (regData) {
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

      // 6.1. Late Registrations: Scoped fetch from new late_registrations table
      try {
        let lateRegQuery = client.from('late_registrations').select('*');
        if (collegeAfflNo) {
          lateRegQuery = lateRegQuery.eq('college_affl_no', collegeAfflNo);
        }
        const { data: lateData, error: lateErr } = await lateRegQuery;
        if (!lateErr && lateData) {
          const normalizedLate = lateData.map((r: Record<string, any>) => ({
            ...r,
            college_affl_no: Number(r.college_affl_no),
            item_id: Number(r.item_id)
          }));
          if (collegeAfflNo) {
            const numAffl = Number(collegeAfflNo);
            const existingLate = this.getStorage<LateRegistration[]>('late_registrations', []);
            const otherLate = existingLate.filter(r => Number(r.college_affl_no) !== numAffl);
            this.setStorage('late_registrations', [...otherLate, ...normalizedLate]);
          } else {
            this.setStorage('late_registrations', normalizedLate);
          }
        }
      } catch (err) {
        console.warn('Supabase sync notice (late_registrations):', err);
      }

      // 7. Results & Locks: Safe fetch
      const { data: resData, error: resErr } = await client.from('results').select('*');
      if (resErr) {
        console.warn('Supabase sync notice (results):', resErr.message);
      } else if (resData) {
        this.setStorage('results', resData);
      }

      if (collegeAfflNo) {
        const { data: cLocks, error: cLockErr } = await client
          .from('entry_locks')
          .select('*')
          .eq('college_affl_no', collegeAfflNo);
        if (cLockErr) {
          console.warn('Supabase sync notice (entry_locks):', cLockErr.message);
        } else if (cLocks) {
          const numAffl = Number(collegeAfflNo);
          const existing = this.getStorage<EntryLock[]>('entryLocks', []);
          const otherLocks = existing.filter(l => Number(l.college_affl_no) !== numAffl);
          const normalized = cLocks.map((l: Record<string, any>) => ({
            ...l,
            item_id: Number(l.item_id),
            college_affl_no: Number(l.college_affl_no || l.affl_no || 0),
            is_open: Boolean(l.is_open)
          }));
          this.setStorage('entryLocks', [...otherLocks, ...normalized]);
        }
      } else {
        let allLocks: any[] = [];
        let lockPage = 0;
        const lockPageSize = 1000;
        let hasMoreLocks = true;
        let lockFetchError = false;

        while (hasMoreLocks) {
          const { data, error } = await client
            .from('entry_locks')
            .select('*')
            .order('item_id', { ascending: true })
            .range(lockPage * lockPageSize, (lockPage + 1) * lockPageSize - 1);

          if (error) {
            console.warn('Supabase entry_locks page sync notice:', error.message);
            lockFetchError = true;
            break;
          }
          if (data && data.length > 0) {
            allLocks = allLocks.concat(data);
            if (data.length < lockPageSize) hasMoreLocks = false;
            lockPage++;
          } else {
            hasMoreLocks = false;
          }
        }

        if (!lockFetchError && allLocks.length > 0) {
          const normalizedLocks = allLocks.map((l: Record<string, any>) => ({
            ...l,
            item_id: Number(l.item_id),
            college_affl_no: Number(l.college_affl_no || l.affl_no || (l.college_id ? String(l.college_id).replace('col-', '') : 0)),
            is_open: Boolean(l.is_open)
          }));
          this.setStorage('entryLocks', normalizedLocks);
        }
      }

      // 8. Appeals: Scoped fetch with safe fallback
      let appealQuery = client.from('appeals').select('*');
      if (collegeAfflNo) {
        appealQuery = appealQuery.eq('college_affl_no', collegeAfflNo);
      }
      const { data: appealData, error: appealErr } = await appealQuery;
      if (appealErr) {
        console.warn('Supabase sync notice (appeals):', appealErr.message);
        // Fallback: query without college_affl_no filter if column isn't populated on remote table yet
        const { data: fallbackAppeals } = await client.from('appeals').select('*');
        if (fallbackAppeals) {
          this.setStorage('appeals', fallbackAppeals);
        }
      } else if (appealData) {
        if (collegeAfflNo) {
          const numAffl = Number(collegeAfflNo);
          const existing = this.getStorage<Appeal[]>('appeals', []);
          const otherColleges = existing.filter(a => Number(a.college_affl_no) !== numAffl);
          this.setStorage('appeals', [...otherColleges, ...appealData]);
        } else {
          this.setStorage('appeals', appealData);
        }
      }

      // 9. Replacements: Fetch from Supabase
      const { data: replacementData, error: replacementErr } = await client.from('replacements').select('*');
      if (replacementErr) {
        console.warn('Supabase sync notice (replacements):', replacementErr.message);
      } else if (replacementData) {
        const students = this.getStudents();
        const registrations = this.getRegistrations();
        const enrichedReplacements: Replacement[] = replacementData.map((r: any) => {
          const orig = findStudentByIdentifier(students, r.original_student_id);
          const rep = findStudentByIdentifier(students, r.replacement_student_id);
          const reg = registrations.find(reg => reg.id === r.registration_id);
          return {
            id: r.id,
            registration_id: r.registration_id,
            original_student_id: r.original_student_id,
            replacement_student_id: r.replacement_student_id,
            reason: r.reason,
            status: r.status as AppealStatus,
            created_at: r.created_at,
            registration: reg,
            original_student: orig,
            replacement_student: rep
          };
        });
        this.setStorage('replacements', enrichedReplacements);
      }

      // 10. Max Participation Quotas
      const { data: quotaData, error: quotaErr } = await client.from('max_participation').select('*');
      if (quotaErr) {
        console.warn('Supabase sync notice (max_participation):', quotaErr.message);
      } else if (quotaData) {
        this.setStorage('maxParticipation', quotaData);
      }

      // 11. Volunteers
      try {
        let volQuery = client
          .from('volunteers')
          .select('*')
          .order('created_at', { ascending: false });
        if (collegeAfflNo) {
          volQuery = volQuery.eq('college_affl_no', collegeAfflNo);
        }
        const { data: volData, error: volErr } = await volQuery;
        if (!volErr && volData) {
          if (collegeAfflNo) {
            const numAffl = Number(collegeAfflNo);
            const existing = this.getStorage<Volunteer[]>('volunteers', []);
            const otherVols = existing.filter(v => Number(v.college_affl_no) !== numAffl);
            const merged = [...otherVols, ...volData];
            this.setStorage('volunteers', merged);
            if (this.isClient) {
              try {
                window.localStorage.setItem('wsf_volunteers', JSON.stringify(merged));
              } catch (e) {}
            }
          } else {
            this.setStorage('volunteers', volData);
            if (this.isClient) {
              try {
                window.localStorage.setItem('wsf_volunteers', JSON.stringify(volData));
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        // Table sync deferred
      }

      // 12. Announcements
      try {
        const { data: annData, error: annErr } = await client
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (!annErr && annData) {
          this.setStorage('announcements', annData);
          if (this.isClient) {
            try {
              window.localStorage.setItem('wsf_announcements', JSON.stringify(annData));
            } catch (e) {}
          }
        }
      } catch (err) {
        // Deferred
      }

      if (!hasError) {
        this.scopeSyncTimes.set(scopeKey, Date.now());
      }
      return !hasError;
    } catch (err) {
      console.warn('Notice: Supabase sync deferred:', err);
      return false;
    }
  }

  // --- Supabase Realtime Subscriptions (Replaces Polling with WebSockets) ---
  public subscribeToRealtimeChanges(onUpdate: () => void): () => void {
    if (!supabase) return () => {};

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerDebouncedSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.scopeSyncTimes.clear(); // Invalidate cache
        this.syncWithSupabase(undefined, true).then(onUpdate);
      }, 300);
    };

    const channel = supabase
      .channel('fest_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entry_locks' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appeals' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replacements' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fest_settings' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colleges' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stages' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'max_participation' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteers' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, triggerDebouncedSync)
      .on('broadcast', { event: 'volunteer_change' }, triggerDebouncedSync)
      .on('broadcast', { event: 'announcement_change' }, triggerDebouncedSync)
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.info('⚡ Supabase Realtime channel connected: Live updates active across all tables.');
        }
      });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
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

  public async updateFestSettings(settings: Partial<FestSettings>): Promise<FestSettings> {
    const current = this.getFestSettings();
    const updated = { ...current, ...settings };
    this.setStorage('festSettings', updated);
    if (supabase) {
      const { error } = await supabase.from('fest_settings').upsert(updated);
      if (error) {
        console.error('Failed to update fest settings in Supabase:', error.message);
        throw error;
      }
    }
    return updated;
  }

  private evaluateRegistrationStatus(
    settings: FestSettings,
    college: College | undefined,
    item: Item | undefined,
    cell: EntryLock | undefined,
    now: Date
  ): RegistrationStatus {
    if (!item) return { canRegister: false, reason: 'Event not found', isFinePeriod: false };
    if (!college) return { canRegister: false, reason: 'College not found', isFinePeriod: false };

    // Emergency college-level override takes precedence
    if (college.manual_lock_override) {
      const regDeadline = item.reg_deadline ? new Date(item.reg_deadline) : new Date(settings.reg_deadline);
      const isPastReg = now > regDeadline;
      return {
        canRegister: true,
        isFinePeriod: isPastReg,
        reason: isPastReg ? 'Admin Override Active (Late Fine Applies)' : 'Admin Override Active'
      };
    }

    // Event globally locked by fest admin
    if (item.is_locked) {
      return { canRegister: false, reason: 'Event is locked by fest admin', isFinePeriod: false };
    }

    // Event closed for this specific college in 2D Entry Locks matrix
    if (cell && !cell.is_open) {
      return { canRegister: false, reason: 'Registration closed by fest admin for this event', isFinePeriod: false };
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

  // Bulk availability calculator for an array of items (O(1) matrix lookup per item)
  public getRegistrationStatuses(
    collegeAfflNoOrId: number | string,
    items: Item[]
  ): Map<number, RegistrationStatus> {
    const settings = this.getFestSettings();
    const college = this.getCollege(collegeAfflNoOrId);
    const locksByItemId = new Map<number, EntryLock>();

    if (college) {
      const allLocks = this.getEntryLocks();
      for (const lock of allLocks) {
        if (lock.college_affl_no === college.affl_no) {
          locksByItemId.set(Number(lock.item_id), lock);
        }
      }
    }

    const now = new Date();
    const statuses = new Map<number, RegistrationStatus>();
    for (const item of items) {
      const itemIdNum = Number(item.item_id || item.id);
      statuses.set(
        itemIdNum,
        this.evaluateRegistrationStatus(
          settings,
          college,
          item,
          locksByItemId.get(itemIdNum),
          now
        )
      );
    }
    return statuses;
  }

  // Check if registration is open for a college and single item
  public isRegistrationOpen(collegeAfflNoOrId: number | string, itemIdOrCode: number | string): RegistrationStatus {
    const settings = this.getFestSettings();
    const college = this.getCollege(collegeAfflNoOrId);
    const item = this.getItem(itemIdOrCode);
    if (!college || !item) {
      return this.evaluateRegistrationStatus(settings, college, item, undefined, new Date());
    }

    const entryLocks = this.getEntryLocks();
    const cell = entryLocks.find(l => l.college_affl_no === college.affl_no && l.item_id === item.item_id);
    return this.evaluateRegistrationStatus(settings, college, item, cell, new Date());
  }

  // --- Colleges ---
  public getColleges(): College[] {
    const cols = this.getStorage<College[]>('colleges', []);
    return cols
      .map(c => ({
        ...c,
        code: c.short_name,
        affiliation_no: c.affl_no ? c.affl_no.toString() : '',
        coordinator_name: c.staff_coordinator_name,
        coordinator_phone: c.staff_coordinator_phone,
        manager_name: c.team_manager_name,
        manager_phone: c.team_manager_phone,
        asst_manager_name: c.asst_team_manager_name,
        asst_manager_phone: c.asst_team_manager_phone
      }))
      .sort((a, b) => (Number(a.affl_no) || 0) - (Number(b.affl_no) || 0));
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

  public async toggleCollegeLockOverride(afflNoOrId: number | string): Promise<boolean> {
    const college = this.getCollege(afflNoOrId);
    if (!college) return false;
    const nextVal = !college.manual_lock_override;
    const settings = this.getFestSettings();
    const isPastReg = new Date() > new Date(settings.reg_deadline);

    const updates: Partial<College> = { manual_lock_override: nextVal };
    // If enabling lock override past registration deadline, automatically enforce late fine across server
    if (nextVal && isPastReg) {
      updates.fine_status = true;
    }

    this.updateCollege(college.affl_no, updates);
    return nextVal;
  }

  public async toggleCollegeFine(afflNoOrId: number | string): Promise<boolean> {
    const college = this.getCollege(afflNoOrId);
    if (!college) return false;
    const nextVal = !college.fine_status;
    this.updateCollege(college.affl_no, { fine_status: nextVal });
    return nextVal;
  }

  public async revokeAllCollegeLockOverrides(): Promise<number> {
    const colleges = this.getColleges();
    const targetAffls = colleges.filter(c => c.manual_lock_override).map(c => c.affl_no);
    if (targetAffls.length === 0) return 0;

    const updated = colleges.map(c => ({
      ...c,
      manual_lock_override: false
    }));
    this.setStorage('colleges', updated);

    if (supabase) {
      await supabase.from('colleges').update({ manual_lock_override: false }).in('affl_no', targetAffls);
    }
    return targetAffls.length;
  }

  // --- Items ---
  public getItems(): Item[] {
    const items = this.getStorage<Item[]>('items', []);
    return items
      .map(i => ({
        ...i,
        code: i.item_code,
        name: i.name_eng,
        item_type: (i.point_type === 'individual' ? 'Single' : 'Group') as 'Single' | 'Group',
        min_participants: i.no_of_participants || 1,
        max_participants: i.no_of_participants || 1
      }))
      .sort((a, b) => {
        const codeA = a.item_code || a.code || '';
        const codeB = b.item_code || b.code || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
  }

  public getItem(itemIdOrCode: number | string): Item | undefined {
    const items = this.getItems();
    const str = itemIdOrCode.toString();
    const num = Number(str.replace('itm-', ''));
    return items.find(i => i.item_id === num || i.item_code === str || i.id === str || i.code === str);
  }

  public async toggleItemLock(itemIdOrCode: number | string): Promise<boolean> {
    const item = this.getItem(itemIdOrCode);
    if (!item) return false;

    const items = this.getStorage<Item[]>('items', []);
    const idx = items.findIndex(i => i.item_id === item.item_id);
    if (idx >= 0) {
      const nextLocked = !items[idx].is_locked;
      items[idx].is_locked = nextLocked;
      this.setStorage('items', items);

      // Sync both items table and all entry_locks row cells for all colleges
      await this.setEntryLockRow(item.item_id, !nextLocked);
      return nextLocked;
    }
    return false;
  }

  public async saveItem(item: Partial<Item>): Promise<{ success: boolean; item?: Item; error?: string }> {
    const items = this.getStorage<Item[]>('items', []);
    if (item.item_id) {
      const idx = items.findIndex(i => i.item_id === item.item_id);
      if (idx >= 0) {
        const dbPayload = {
          item_code: item.item_code || item.code || items[idx].item_code,
          name_eng: item.name_eng || item.name || items[idx].name_eng,
          name_mal: item.name_mal || items[idx].name_mal,
          phase: item.phase || items[idx].phase,
          mode: item.mode || items[idx].mode,
          category: item.category || items[idx].category,
          tabulation: item.tabulation !== undefined ? item.tabulation : items[idx].tabulation,
          point_type: item.point_type || (item.item_type === 'Group' ? 'group' : 'individual'),
          no_of_participants: item.no_of_participants || item.max_participants || items[idx].no_of_participants,
          reg_deadline: item.reg_deadline !== undefined ? item.reg_deadline : items[idx].reg_deadline,
          fine_deadline: item.fine_deadline !== undefined ? item.fine_deadline : items[idx].fine_deadline,
          is_locked: item.is_locked !== undefined ? item.is_locked : items[idx].is_locked,
          l_star: item.l_star !== undefined ? item.l_star : items[idx].l_star,
          em_star: item.em_star !== undefined ? item.em_star : items[idx].em_star
        };

        if (supabase) {
          const { data, error } = await supabase
            .from('items')
            .update(dbPayload)
            .eq('item_id', item.item_id)
            .select()
            .single();

          if (error) {
            console.error('Failed to update item in database:', error.message);
            return { success: false, error: error.message };
          }
          if (data) {
            items[idx] = {
              ...items[idx],
              ...data,
              item_type: data.point_type === 'group' ? 'Group' : 'Single',
              min_participants: data.no_of_participants,
              max_participants: data.no_of_participants
            };
            this.setStorage('items', items);
            return { success: true, item: items[idx] };
          }
        }
        items[idx] = { ...items[idx], ...item } as Item;
        this.setStorage('items', items);
        return { success: true, item: items[idx] };
      }
    }

    // Insert new item: omit item_id so sequence nextval('items_item_id_seq') assigns monotonic ID
    const dbPayload = {
      item_code: item.item_code || item.code || `ITM-${Date.now().toString().slice(-4)}`,
      name_eng: item.name_eng || item.name || 'New Item',
      name_mal: item.name_mal || 'പുതിയ ഇനം',
      phase: item.phase || 'Senior',
      mode: item.mode || 'onstage',
      category: item.category || 'A',
      tabulation: item.tabulation !== undefined ? item.tabulation : true,
      point_type: item.point_type || (item.item_type === 'Group' ? 'group' : 'individual'),
      no_of_participants: item.no_of_participants || item.max_participants || 1,
      is_locked: false,
      l_star: item.l_star || false,
      em_star: item.em_star || false
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('items')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.error('Failed to create item in database:', error.message);
        return { success: false, error: error.message };
      }

      if (data) {
        const fullItem: Item = {
          ...data,
          id: `itm-${data.item_id}`,
          code: data.item_code,
          name: data.name_eng,
          item_type: data.point_type === 'group' ? 'Group' : 'Single',
          min_participants: data.no_of_participants,
          max_participants: data.no_of_participants
        };
        items.push(fullItem);
        this.setStorage('items', items);
        return { success: true, item: fullItem };
      }
    }

    const nextItemId = items.length > 0 ? Math.max(...items.map(i => i.item_id)) + 1 : 1;
    const fallbackItem: Item = {
      id: `itm-${nextItemId}`,
      item_id: nextItemId,
      code: dbPayload.item_code,
      item_code: dbPayload.item_code,
      name: dbPayload.name_eng,
      name_eng: dbPayload.name_eng,
      name_mal: dbPayload.name_mal,
      phase: dbPayload.phase,
      mode: dbPayload.mode as any,
      category: dbPayload.category as any,
      tabulation: dbPayload.tabulation,
      point_type: dbPayload.point_type as any,
      item_type: dbPayload.point_type === 'group' ? 'Group' : 'Single',
      no_of_participants: dbPayload.no_of_participants,
      min_participants: dbPayload.no_of_participants,
      max_participants: dbPayload.no_of_participants,
      l_star: dbPayload.l_star,
      em_star: dbPayload.em_star,
      is_locked: false,
      created_at: new Date().toISOString()
    };
    items.push(fallbackItem);
    this.setStorage('items', items);
    return { success: true, item: fallbackItem };
  }

  public async updateItemDeadlines(
    itemId: number,
    regDeadline: string | null,
    fineDeadline: string | null
  ): Promise<{ success: boolean; item?: Item; error?: string }> {
    const items = this.getStorage<Item[]>('items', []);
    const idx = items.findIndex(i => i.item_id === itemId);
    if (idx === -1) {
      return { success: false, error: 'Event not found' };
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('items')
        .update({
          reg_deadline: regDeadline,
          fine_deadline: fineDeadline
        })
        .eq('item_id', itemId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update event deadline in Supabase:', error.message);
        return { success: false, error: error.message };
      }

      if (data) {
        items[idx] = {
          ...items[idx],
          reg_deadline: data.reg_deadline,
          fine_deadline: data.fine_deadline
        };
        this.setStorage('items', items);
        return { success: true, item: items[idx] };
      }
    }

    items[idx] = {
      ...items[idx],
      reg_deadline: regDeadline,
      fine_deadline: fineDeadline
    };
    this.setStorage('items', items);
    return { success: true, item: items[idx] };
  }

  public async batchUpdateItemDeadlines(
    itemIds: number[],
    regDeadline: string | null,
    fineDeadline: string | null
  ): Promise<{ success: boolean; count: number; error?: string }> {
    if (itemIds.length === 0) return { success: true, count: 0 };
    const items = this.getStorage<Item[]>('items', []);

    if (supabase) {
      const { error } = await supabase
        .from('items')
        .update({
          reg_deadline: regDeadline,
          fine_deadline: fineDeadline
        })
        .in('item_id', itemIds);

      if (error) {
        console.error('Failed to batch update event deadlines in Supabase:', error.message);
        return { success: false, count: 0, error: error.message };
      }
    }

    itemIds.forEach(id => {
      const idx = items.findIndex(i => i.item_id === id);
      if (idx >= 0) {
        items[idx].reg_deadline = regDeadline;
        items[idx].fine_deadline = fineDeadline;
      }
    });
    this.setStorage('items', items);
    return { success: true, count: itemIds.length };
  }

  public async resetItemDeadlines(
    itemIds: number[]
  ): Promise<{ success: boolean; count: number; error?: string }> {
    return this.batchUpdateItemDeadlines(itemIds, null, null);
  }

  // --- Entry Locks Matrix ---
  public getEntryLocks(): EntryLock[] {
    const raw = this.getStorage<EntryLock[]>('entryLocks', []);
    const colleges = this.getColleges();
    const items = this.getItems();
    let updated = false;
    const locks = [...raw];
    const existingKeys = new Set(raw.map(l => `${l.item_id}:${l.college_affl_no}`));

    items.forEach(item => {
      colleges.forEach(col => {
        const key = `${item.item_id}:${col.affl_no}`;
        if (!existingKeys.has(key)) {
          locks.push({
            item_id: item.item_id,
            college_affl_no: col.affl_no,
            is_open: !item.is_locked
          });
          existingKeys.add(key);
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

  public async setEntryLockCell(itemId: number, collegeAfflNo: number, isOpen: boolean): Promise<EntryLock> {
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
      try {
        await client.from('entry_locks').upsert({
          item_id: itemId,
          college_affl_no: collegeAfflNo,
          is_open: isOpen,
          updated_at: now
        }, { onConflict: 'item_id,college_affl_no' });
      } catch (err) {
        console.warn('Supabase entry_locks upsert error:', err);
      }
    }

    return resultLock;
  }

  public async setEntryLockRow(itemId: number, isOpen: boolean): Promise<void> {
    const colleges = this.getColleges();
    const locks = this.getEntryLocks();
    const now = new Date().toISOString();

    // O(1) Index Map for fast lookup by college_affl_no
    const lockMap = new Map<number, number>();
    locks.forEach((l, idx) => {
      if (l.item_id === itemId) {
        lockMap.set(l.college_affl_no, idx);
      }
    });

    const dbRows: Array<{ item_id: number; college_affl_no: number; is_open: boolean; updated_at: string }> = [];

    colleges.forEach(col => {
      const idx = lockMap.get(col.affl_no);
      if (idx !== undefined) {
        locks[idx].is_open = isOpen;
        locks[idx].updated_at = now;
      } else {
        const newLock = {
          item_id: itemId,
          college_affl_no: col.affl_no,
          is_open: isOpen,
          updated_at: now
        };
        locks.push(newLock);
        lockMap.set(col.affl_no, locks.length - 1);
      }
      dbRows.push({
        item_id: itemId,
        college_affl_no: col.affl_no,
        is_open: isOpen,
        updated_at: now
      });
    });

    // Also update item.is_locked flag in raw items storage to keep consistency
    const items = this.getStorage<Item[]>('items', []);
    const itm = items.find(i => i.item_id === itemId);
    if (itm) {
      itm.is_locked = !isOpen;
      this.setStorage('items', items);
    }

    this.setStorage('entryLocks', locks);

    const client = supabase;
    if (client && dbRows.length > 0) {
      try {
        await Promise.all([
          client.from('entry_locks').upsert(dbRows, { onConflict: 'item_id,college_affl_no' }),
          client.from('items').update({ is_locked: !isOpen }).eq('item_id', itemId)
        ]);
      } catch (err) {
        console.warn('Supabase entry_locks/items row upsert notice:', err);
      }
    }
  }

  public async setAllEntryLocks(isOpen: boolean): Promise<void> {
    const items = this.getStorage<Item[]>('items', []);
    const colleges = this.getColleges();
    const locks = this.getEntryLocks();
    const now = new Date().toISOString();

    // Build O(1) Hash Map for item_id:college_affl_no lookup
    const lockMap = new Map<string, number>();
    locks.forEach((l, idx) => {
      lockMap.set(`${l.item_id}:${l.college_affl_no}`, idx);
    });

    const bulkRows: Array<{ item_id: number; college_affl_no: number; is_open: boolean; updated_at: string }> = [];

    items.forEach(itm => {
      itm.is_locked = !isOpen;
      colleges.forEach(col => {
        const key = `${itm.item_id}:${col.affl_no}`;
        const idx = lockMap.get(key);

        if (idx !== undefined) {
          locks[idx].is_open = isOpen;
          locks[idx].updated_at = now;
        } else {
          const newLock = {
            item_id: itm.item_id,
            college_affl_no: col.affl_no,
            is_open: isOpen,
            updated_at: now
          };
          locks.push(newLock);
          lockMap.set(key, locks.length - 1);
        }

        bulkRows.push({
          item_id: itm.item_id,
          college_affl_no: col.affl_no,
          is_open: isOpen,
          updated_at: now
        });
      });
    });

    this.setStorage('items', items);
    this.setStorage('entryLocks', locks);

    const client = supabase;
    if (client && bulkRows.length > 0) {
      try {
        await Promise.all([
          client.from('entry_locks').upsert(bulkRows, { onConflict: 'item_id,college_affl_no' }),
          client.from('items').update({ is_locked: !isOpen }).gte('item_id', 0)
        ]);
      } catch (err) {
        console.warn('Supabase bulk entry_locks upsert notice:', err);
      }
    }
  }

  // Backward compatibility helper
  public async setCollegeItemLock(collegeAfflNoOrId: number | string, itemIdOrCode: number | string, isUnlocked: boolean): Promise<EntryLock> {
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

  // --- Dedicated Late Registrations Methods ---
  public getLateRegistrations(collegeAfflNoOrId?: number | string): LateRegistration[] {
    const list = this.getStorage<LateRegistration[]>('late_registrations', []);
    if (!collegeAfflNoOrId) return list;
    const col = this.getCollege(collegeAfflNoOrId);
    const affl = col ? col.affl_no : Number(collegeAfflNoOrId);
    return list.filter(l => Number(l.college_affl_no) === affl);
  }

  public async fetchLateRegistrationsForCollege(afflNo?: number): Promise<LateRegistration[]> {
    if (supabase) {
      try {
        let query = supabase.from('late_registrations').select('*');
        if (afflNo) {
          query = query.eq('college_affl_no', afflNo);
        }
        const { data, error } = await query;
        if (!error && data) {
          const allStored = this.getStorage<LateRegistration[]>('late_registrations', []);
          const numAffl = Number(afflNo);
          const otherLate = afflNo ? allStored.filter(r => Number(r.college_affl_no) !== numAffl) : [];
          const normalizedData = data.map((r: Record<string, any>) => ({
            ...r,
            college_affl_no: Number(r.college_affl_no),
            item_id: Number(r.item_id)
          }));
          this.setStorage('late_registrations', afflNo ? [...otherLate, ...normalizedData] : normalizedData);
          return this.getLateRegistrations(afflNo);
        }
      } catch (err) {
        console.warn('Notice: late_registrations table sync fallback:', err);
      }
    }
    return this.getLateRegistrations(afflNo);
  }

  public async clearLateRegistrations(collegeAfflNo?: number): Promise<{ success: boolean; count: number }> {
    const allStored = this.getStorage<LateRegistration[]>('late_registrations', []);
    let removedCount = 0;
    let remaining: LateRegistration[] = [];

    if (collegeAfflNo !== undefined) {
      const numAffl = Number(collegeAfflNo);
      const toRemove = allStored.filter(r => Number(r.college_affl_no) === numAffl);
      removedCount = toRemove.length;
      remaining = allStored.filter(r => Number(r.college_affl_no) !== numAffl);
      this.setStorage('late_registrations', remaining);

      // Reset fine_status on this college
      const cols = this.getColleges();
      const col = cols.find(c => c.affl_no === numAffl);
      if (col && col.fine_status) {
        col.fine_status = false;
        this.setStorage('colleges', cols);
      }

      if (supabase) {
        try {
          await supabase.from('late_registrations').delete().eq('college_affl_no', numAffl);
          await supabase.from('colleges').update({ fine_status: false }).eq('affl_no', numAffl);
        } catch (err) {
          console.warn('Supabase clearLateRegistrations notice:', err);
        }
      }
    } else {
      removedCount = allStored.length;
      remaining = [];
      this.setStorage('late_registrations', remaining);

      // Reset fine_status on all colleges
      const cols = this.getColleges();
      cols.forEach(c => {
        c.fine_status = false;
      });
      this.setStorage('colleges', cols);

      if (supabase) {
        try {
          await supabase.from('late_registrations').delete().gte('college_affl_no', 0);
          await supabase.from('colleges').update({ fine_status: false }).gte('affl_no', 0);
        } catch (err) {
          console.warn('Supabase clearLateRegistrations notice:', err);
        }
      }
    }

    if (this.isClient) {
      try {
        window.localStorage.setItem('wsf_late_registrations', JSON.stringify(remaining));
      } catch (e) {}
    }

    return { success: true, count: removedCount };
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
      const dbPayload: any = {
        name: newStudent.name || newStudent.full_name || 'Participant Name',
        college_affl_no: affl,
        class: newStudent.class || 'Aliya 1',
        phase: newStudent.phase || 'Senior',
        phone: newStudent.phone || null,
        photo_url: newStudent.photo_url || null,
        password: (newStudent as any).password || 'welcome123'
      };
      if (typeof cicVal === 'number' || (typeof cicVal === 'string' && /^\d+$/.test(cicVal))) {
        dbPayload.cic_no = Number(cicVal);
      }
      supabase.from('students').insert(dbPayload).then();
    }
    return newStudent;
  }

  // --- Max Participation Quotas ---
  public getMaxParticipation(): MaxParticipation[] {
    return this.getStorage('maxParticipation', []);
  }

  // --- Registrations (Multiple-Row Flat Architecture) ---
  public getRegistrations(collegeAfflNoOrId?: number | string): Registration[] {
    const allRegs = this.getStorage<Registration[]>('registrations', []);
    const col = collegeAfflNoOrId ? this.getCollege(collegeAfflNoOrId) : undefined;
    const targetAffl = col ? col.affl_no : (typeof collegeAfflNoOrId === 'number' ? collegeAfflNoOrId : undefined);

    const regs = targetAffl ? allRegs.filter(r => Number(r.college_affl_no) === targetAffl) : allRegs;

    const rowsByCollegeAndItem = new Map<string, Registration[]>();
    for (const row of regs) {
      const key = `${row.college_affl_no}:${row.item_id}`;
      const group = rowsByCollegeAndItem.get(key) || [];
      group.push(row);
      rowsByCollegeAndItem.set(key, group);
    }

    const items = this.getItems();
    const colleges = this.getColleges();
    const students = this.getStudents();

    return regs.map(row => {
      const key = `${row.college_affl_no}:${row.item_id}`;
      return normalizeRegistration(
        row,
        students,
        items,
        colleges,
        rowsByCollegeAndItem.get(key) || []
      );
    });
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
    // Ensure college student roster is loaded into memory, falling back to network fetch if cache is unpopulated
    let collegeStudents = this.getStudents(college.affl_no);
    if (collegeStudents.length === 0 && supabase) {
      collegeStudents = await this.fetchStudentsForCollege(college.affl_no);
    }

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

    const minRequired = item.min_participants ?? (item.point_type === 'individual' || item.item_type === 'Single' ? 1 : 1);
    const maxAllowed = item.max_participants ?? (item.no_of_participants || 1);

    if (chestNos.length < minRequired) {
      return {
        success: false,
        error: `Requires at least ${minRequired} valid participant(s). Resolved ${chestNos.length}.`
      };
    }

    if (chestNos.length > maxAllowed) {
      return {
        success: false,
        error: `Exceeds maximum limit of ${maxAllowed} participant(s). Resolved ${chestNos.length}.`
      };
    }

    const quotaLimits = this.getMaxParticipation();
    const collegeRegs = this.getRegistrations(college.affl_no);
    const allItems = this.getItems();

    // Validate each student's participation quota strictly for this college
    for (const student of resolvedStudents) {
      const quotaCheck = checkStudentQuota(student, item, collegeRegs, allItems, quotaLimits);
      if (!quotaCheck.allowed) {
        return {
          success: false,
          error: `Student ${student.name || student.full_name} (${getCanonicalChestNo(student)}): ${quotaCheck.reason}`
        };
      }
    }

    if (supabase) {
      try {
        const { data: dbRows, error: rpcError } = await supabase.rpc('register_college_for_item_tx', {
          p_item_id: item.item_id,
          p_college_affl_no: college.affl_no,
          p_chest_nos: chestNos
        });

        if (rpcError) {
          console.error('❌ Supabase register_college_for_item_tx error:', rpcError);
          return {
            success: false,
            error: `Database Transaction Error (${rpcError.code || 'FAIL'}): ${rpcError.message}`
          };
        }

        const regs = this.getStorage<Registration[]>('registrations', []);
        const logs = this.getStorage<RegistrationLog[]>('registration_logs', []);
        const remaining = regs.filter(r => !(r.item_id === item.item_id && r.college_affl_no === college.affl_no));

        if (dbRows && dbRows.length > 0) {
          remaining.push(...dbRows);
        }
        chestNos.forEach(cNo => {
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

        // Reflect server-applied late fine in local college cache and update late_registrations table
        const check = this.isRegistrationOpen(college.affl_no, item.item_id);
        const isLate = check.isFinePeriod || Boolean(check.reason?.toLowerCase().includes('late'));

        if (isLate) {
          const colList = this.getStorage<College[]>('colleges', []);
          const cIdx = colList.findIndex(c => c.affl_no === college.affl_no);
          if (cIdx >= 0) {
            colList[cIdx].fine_status = true;
            this.setStorage('colleges', colList);
          }

          // Populate late_registrations store
          const lateReason = check.isFinePeriod
            ? 'Registered In Late Fine Window'
            : (check.reason || 'Late Registration');

          const lateRows: LateRegistration[] = chestNos.map(cNo => ({
            id: `late-${Date.now()}-${cNo}`,
            item_id: item.item_id,
            college_affl_no: college.affl_no,
            chest_no: cNo,
            late_reason: lateReason,
            effective_deadline: item.reg_deadline || this.getFestSettings().reg_deadline,
            registered_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }));

          const existingLate = this.getStorage<LateRegistration[]>('late_registrations', [])
            .filter(r => !(r.item_id === item.item_id && r.college_affl_no === college.affl_no));
          this.setStorage('late_registrations', [...existingLate, ...lateRows]);
        }

        return { success: true };
      } catch (err: any) {
        console.error('Unexpected registration error:', err);
        return { success: false, error: err.message || 'Unexpected registration error' };
      }
    }

    // Fallback if supabase client not connected
    const regs = this.getStorage<Registration[]>('registrations', []);
    const remaining = regs.filter(r => !(r.item_id === item.item_id && r.college_affl_no === college.affl_no));
    chestNos.forEach(cNo => {
      remaining.push({
        id: `reg-${Date.now()}-${cNo}`,
        item_id: item.item_id,
        college_affl_no: college.affl_no,
        college_id: `col-${college.affl_no}`,
        chest_no: cNo,
        created_at: new Date().toISOString()
      });
    });
    this.setStorage('registrations', remaining);

    // Also populate late_registrations in fallback if applicable
    const checkFallback = this.isRegistrationOpen(college.affl_no, item.item_id);
    if (checkFallback.isFinePeriod || college.fine_status || college.manual_lock_override) {
      const lateReason = checkFallback.isFinePeriod
        ? 'Registered In Late Fine Window'
        : college.fine_status
        ? 'Late Fine Flagged on Institution'
        : 'Admin Lock Override Entry';

      const lateRows: LateRegistration[] = chestNos.map(cNo => ({
        id: `late-${Date.now()}-${cNo}`,
        item_id: item.item_id,
        college_affl_no: college.affl_no,
        chest_no: cNo,
        late_reason: lateReason,
        effective_deadline: item.reg_deadline || this.getFestSettings().reg_deadline,
        registered_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }));

      const existingLate = this.getStorage<LateRegistration[]>('late_registrations', [])
        .filter(r => !(r.item_id === item.item_id && r.college_affl_no === college.affl_no));
      this.setStorage('late_registrations', [...existingLate, ...lateRows]);
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

    if (supabase) {
      try {
        const { error: rpcError } = await supabase.rpc('register_college_for_item_tx', {
          p_item_id: item.item_id,
          p_college_affl_no: college.affl_no,
          p_chest_nos: []
        });

        if (rpcError) {
          console.error('❌ Supabase unregister error:', rpcError);
          return {
            success: false,
            error: `Database Transaction Error: ${rpcError.message}`
          };
        }
      } catch (err: any) {
        console.error('Unexpected unregister error:', err);
        return { success: false, error: err.message || 'Unexpected unregister error' };
      }
    }

    const regs = this.getStorage<Registration[]>('registrations', []);
    const remaining = regs.filter(r => !(Number(r.item_id) === Number(item.item_id) && Number(r.college_affl_no) === Number(college.affl_no)));
    this.setStorage('registrations', remaining);

    if (supabase) {
      supabase.from('late_registrations').delete().match({ item_id: item.item_id, college_affl_no: college.affl_no }).then();
    }
    const remainingLate = this.getStorage<LateRegistration[]>('late_registrations', [])
      .filter(r => !(Number(r.item_id) === Number(item.item_id) && Number(r.college_affl_no) === Number(college.affl_no)));
    this.setStorage('late_registrations', remainingLate);

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
        supabase.from('late_registrations').delete().eq('college_affl_no', affl).then();
      }
      const lateList = this.getStorage<LateRegistration[]>('late_registrations', []);
      this.setStorage('late_registrations', lateList.filter(l => l.college_affl_no !== affl));
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
        supabase.from('late_registrations').delete().gte('college_affl_no', 0).then();
      }
      this.setStorage('late_registrations', []);
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
  private static DEFAULT_STAGES: Stage[] = [
    { id: 'stg-1', stage_number: 1, name: 'Stage 1: Main Auditorium (Kalam Hall)', location: 'Campus Block A - Ground Floor' },
    { id: 'stg-2', stage_number: 2, name: 'Stage 2: Open Air Theatre (OAT)', location: 'Central Quadrangle' },
    { id: 'stg-3', stage_number: 3, name: 'Stage 3: Mini Hall 1 (Symphony)', location: 'Fine Arts Block - Level 2' },
    { id: 'stg-4', stage_number: 4, name: 'Stage 4: Seminar Hall 3', location: 'Administrative Wing' },
    { id: 'stg-5', stage_number: 5, name: 'Stage 5: Conference Hall', location: 'Library Building' },
    { id: 'stg-6', stage_number: 6, name: 'Stage 6: Exhibition Hall', location: 'Cultural Centre' },
  ];

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
    const stages = this.getStorage<Stage[]>('stages', []);
    if (stages && stages.length > 0) {
      return [...stages].sort((a, b) => a.stage_number - b.stage_number);
    }
    return FestService.DEFAULT_STAGES;
  }

  public getSchedules(): Schedule[] {
    let schedules = this.getStorage<Schedule[]>('schedules', []);
    const items = this.getItems();
    const stages = this.getStages();

    // If schedules table in Supabase or memory is unpopulated, supply sensible scheduling based on catalog items
    if (!schedules || schedules.length === 0) {
      const now = new Date();
      // Pick onstage items or registered items first
      const eligibleItems = items.filter(i => i.mode === 'onstage' || i.tabulation);
      const itemsToSchedule = eligibleItems.length > 0 ? eligibleItems : items;

      schedules = itemsToSchedule.slice(0, 20).map((itm, idx) => {
        const stageNum = (idx % stages.length) + 1;
        // Stagger times: today starting from 09:30 AM
        const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0);
        const start = new Date(baseDate.getTime() + (idx * 45) * 60000);
        const end = new Date(start.getTime() + 40 * 60000);
        return {
          id: `sch-default-${itm.item_id || itm.id}`,
          item_id: itm.item_id,
          stage_number: stageNum,
          starting: start.toISOString(),
          ending: end.toISOString(),
          scheduled_start: start.toISOString(),
          status: (idx === 0 ? 'On_Going' : idx === 1 ? 'Starting_Soon' : 'Upcoming') as StageStatus
        };
      });
      this.setStorage('schedules', schedules);
    }

    return schedules.map(s => {
      const matchedStage = stages.find(st => st.stage_number === s.stage_number);
      return {
        ...s,
        scheduled_start: s.starting,
        stage_id: matchedStage?.id || `stg-${s.stage_number}`,
        item: items.find(i => i.item_id === s.item_id),
        stage: matchedStage
      };
    });
  }

  public async updateScheduleStatus(itemIdOrScheduleId: number | string, status: StageStatus): Promise<void> {
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
        try {
          await supabase.from('schedules').update({ status }).eq('item_id', schedules[idx].item_id);
        } catch (err: any) {
          console.warn('Supabase updateScheduleStatus notice:', err.message);
        }
      }
    }
  }

  public async saveSchedule(data: {
    item_id: number;
    stage_number: number;
    starting: string;
    ending?: string;
    status?: StageStatus;
  }): Promise<{ success: boolean; schedule?: Schedule; error?: string }> {
    const numItemId = Number(data.item_id);
    const numStage = Number(data.stage_number);
    const statusVal = data.status || 'Upcoming';
    const nowIso = new Date().toISOString();

    const schedules = this.getStorage<Schedule[]>('schedules', []);
    const idx = schedules.findIndex(s => Number(s.item_id) === numItemId);

    let updatedSchedule: Schedule;
    if (idx >= 0) {
      schedules[idx] = {
        ...schedules[idx],
        stage_number: numStage,
        starting: data.starting,
        ending: data.ending || null,
        scheduled_start: data.starting,
        status: statusVal,
        updated_at: nowIso
      };
      updatedSchedule = schedules[idx];
    } else {
      updatedSchedule = {
        id: `sch-${Date.now()}-${numItemId}`,
        item_id: numItemId,
        stage_number: numStage,
        starting: data.starting,
        ending: data.ending || null,
        scheduled_start: data.starting,
        status: statusVal,
        updated_at: nowIso
      };
      schedules.push(updatedSchedule);
    }

    this.setStorage('schedules', schedules);

    if (supabase) {
      try {
        const { data: existingRows } = await supabase
          .from('schedules')
          .select('id')
          .eq('item_id', numItemId);

        if (existingRows && existingRows.length > 0) {
          await supabase
            .from('schedules')
            .update({
              stage_number: numStage,
              starting: data.starting,
              ending: data.ending || null,
              status: statusVal,
              updated_at: nowIso
            })
            .eq('item_id', numItemId);
        } else {
          await supabase
            .from('schedules')
            .insert({
              item_id: numItemId,
              stage_number: numStage,
              starting: data.starting,
              ending: data.ending || null,
              status: statusVal
            });
        }
      } catch (err: any) {
        console.warn('Supabase saveSchedule notice:', err.message);
      }
    }

    return { success: true, schedule: updatedSchedule };
  }


  public getCodeLetters(itemId?: number | string): CodeLetter[] {
    const list = this.getStorage<CodeLetter[]>('code_letters', []);
    if (itemId !== undefined && itemId !== null) {
      const itmNum = Number(itemId);
      return list.filter(cl => Number(cl.item_id) === itmNum);
    }
    return list;
  }

  private getLetterForIndex(idx: number): string {
    if (idx < 26) return String.fromCharCode(65 + idx);
    const first = String.fromCharCode(65 + Math.floor(idx / 26) - 1);
    const second = String.fromCharCode(65 + (idx % 26));
    return `${first}${second}`;
  }

  /**
   * Assigns a single random code letter to a participant for an item.
   * Pulls an unused letter from the available pool (starting from 'A' up to total registrations count).
   * Inserts into code_letters table and updates registrations.code_letter.
   */
  public async assignRandomCodeLetter(
    itemId: number,
    collegeAfflNo: number,
    chestNo: string
  ): Promise<{ success: boolean; codeLetter?: string; error?: string }> {
    const numItemId = Number(itemId);
    const numAffl = Number(collegeAfflNo);
    const cleanChestNo = chestNo.trim().toUpperCase();

    const regs = this.getStorage<Registration[]>('registrations', []);
    const itemRegs = regs.filter(r => Number(r.item_id) === numItemId);

    if (itemRegs.length === 0) {
      return { success: false, error: 'No participants registered for this event.' };
    }

    // Determine the full alphabet pool starting from A up to total participants count
    const poolSize = Math.max(itemRegs.length, 1);
    const alphabetPool: string[] = [];
    for (let i = 0; i < poolSize; i++) {
      alphabetPool.push(this.getLetterForIndex(i));
    }

    // Find code letters currently assigned to other participants of this item
    const usedLetters = new Set<string>();
    itemRegs.forEach(r => {
      const isOther = (r.chest_no || '').trim().toUpperCase() !== cleanChestNo;
      if (isOther && r.code_letter) {
        usedLetters.add(r.code_letter.trim().toUpperCase());
      }
    });

    // Pick an available letter from the pool
    let available = alphabetPool.filter(l => !usedLetters.has(l));
    if (available.length === 0) {
      // Fallback: next unused letter
      available = [this.getLetterForIndex(alphabetPool.length)];
    }

    const randomLetter = available[Math.floor(Math.random() * available.length)];

    // 1. Update in-memory registrations
    regs.forEach(r => {
      if (Number(r.item_id) === numItemId && (r.chest_no || '').trim().toUpperCase() === cleanChestNo) {
        r.code_letter = randomLetter;
      }
    });
    this.setStorage('registrations', regs);

    // 2. Update in-memory code_letters
    const codeLetters = this.getStorage<CodeLetter[]>('code_letters', []);
    const remainingCodeLetters = codeLetters.filter(
      cl => !(Number(cl.item_id) === numItemId && (cl.chest_no || '').trim().toUpperCase() === cleanChestNo)
    );
    const newEntry: CodeLetter = {
      id: `cl-${Date.now()}-${cleanChestNo}`,
      item_id: numItemId,
      college_affl_no: numAffl,
      chest_no: cleanChestNo,
      code_letter: randomLetter
    };
    remainingCodeLetters.push(newEntry);
    this.setStorage('code_letters', remainingCodeLetters);

    // 3. Persist to Supabase if connected
    if (supabase) {
      try {
        // Delete previous code_letter for this student/item
        await supabase
          .from('code_letters')
          .delete()
          .match({ item_id: numItemId, chest_no: cleanChestNo });

        // Insert new code letter
        await supabase.from('code_letters').insert({
          item_id: numItemId,
          college_affl_no: numAffl,
          chest_no: cleanChestNo,
          code_letter: randomLetter
        });

        // Update registrations table for fast foreign-key join lookups
        await supabase
          .from('registrations')
          .update({ code_letter: randomLetter })
          .match({ item_id: numItemId, chest_no: cleanChestNo });
      } catch (err: any) {
        console.warn('Supabase code_letters persistence notice:', err.message);
      }
    }

    return { success: true, codeLetter: randomLetter };
  }

  /**
   * Randomizes all participants for an event in one click, assigning A, B, C... without duplicate letters.
   */
  public async randomizeAllCodeLetters(
    itemId: number
  ): Promise<{ success: boolean; assignments: Record<string, string>; error?: string }> {
    const numItemId = Number(itemId);
    const regs = this.getStorage<Registration[]>('registrations', []);
    const itemRegs = regs.filter(r => Number(r.item_id) === numItemId);

    if (itemRegs.length === 0) {
      return { success: false, assignments: {}, error: 'No participants registered for this event.' };
    }

    // Pool of letters A..N
    const pool: string[] = [];
    for (let i = 0; i < itemRegs.length; i++) {
      pool.push(this.getLetterForIndex(i));
    }

    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const assignments: Record<string, string> = {};
    const codeLetterInserts: any[] = [];

    itemRegs.forEach((r, idx) => {
      const assignedLetter = pool[idx];
      const cleanChestNo = (r.chest_no || '').trim().toUpperCase();
      r.code_letter = assignedLetter;
      assignments[cleanChestNo] = assignedLetter;

      codeLetterInserts.push({
        item_id: numItemId,
        college_affl_no: Number(r.college_affl_no),
        chest_no: cleanChestNo,
        code_letter: assignedLetter
      });
    });

    this.setStorage('registrations', regs);

    // Update in-memory code_letters
    const codeLetters = this.getStorage<CodeLetter[]>('code_letters', []);
    const otherCodeLetters = codeLetters.filter(cl => Number(cl.item_id) !== numItemId);
    this.setStorage('code_letters', [...otherCodeLetters, ...codeLetterInserts]);

    if (supabase) {
      try {
        await supabase.from('code_letters').delete().eq('item_id', numItemId);
        await supabase.from('code_letters').insert(codeLetterInserts);

        // Batch update registrations table
        for (const ins of codeLetterInserts) {
          await supabase
            .from('registrations')
            .update({ code_letter: ins.code_letter })
            .match({ item_id: numItemId, chest_no: ins.chest_no });
        }
      } catch (err: any) {
        console.warn('Supabase randomizeAllCodeLetters persistence notice:', err.message);
      }
    }

    return { success: true, assignments };
  }

  public async removeCodeLetter(
    itemId: number,
    chestNo: string
  ): Promise<{ success: boolean }> {
    const numItemId = Number(itemId);
    const cleanChestNo = chestNo.trim().toUpperCase();

    const regs = this.getStorage<Registration[]>('registrations', []);
    regs.forEach(r => {
      if (Number(r.item_id) === numItemId && (r.chest_no || '').trim().toUpperCase() === cleanChestNo) {
        r.code_letter = null as any;
      }
    });
    this.setStorage('registrations', regs);

    const codeLetters = this.getStorage<CodeLetter[]>('code_letters', []);
    this.setStorage('code_letters', codeLetters.filter(
      cl => !(Number(cl.item_id) === numItemId && (cl.chest_no || '').trim().toUpperCase() === cleanChestNo)
    ));

    if (supabase) {
      try {
        await supabase
          .from('code_letters')
          .delete()
          .match({ item_id: numItemId, chest_no: cleanChestNo });
        await supabase
          .from('registrations')
          .update({ code_letter: null })
          .match({ item_id: numItemId, chest_no: cleanChestNo });
      } catch (err: any) {
        console.warn('Supabase removeCodeLetter notice:', err.message);
      }
    }

    return { success: true };
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
        const dbPayloads = remaining
          .filter(r => r.item_id === itemId)
          .map(({ id, ...rest }) => rest);
        client.from('results').insert(dbPayloads).then();
      });
    }
  }

  public async publishResult(itemIdOrCode: number | string, publish: boolean = true): Promise<boolean> {
    const itm = this.getItem(itemIdOrCode);
    const itemId = itm ? itm.item_id : Number(itemIdOrCode);
    if (!itemId || isNaN(itemId)) return false;

    if (supabase) {
      const { error } = await supabase
        .from('results')
        .update({ published: publish })
        .eq('item_id', itemId);

      if (error) {
        console.error('Database publishResult error:', error.message);
        return false;
      }
    }

    const results = this.getStorage<Result[]>('results', []);
    results.forEach(r => {
      if (r.item_id === itemId) {
        r.published = publish;
      }
    });
    this.setStorage('results', results);
    return true;
  }

  // --- Appeals ---
  public getAppeals(collegeAfflNoOrId?: number | string): Appeal[] {
    const appeals = this.getStorage<Appeal[]>('appeals', []);
    const items = this.getItems();
    const colleges = this.getColleges();
    const students = this.getStudents();

    const enriched = appeals.map(a => {
      const itm = items.find(i => i.item_id === a.item_id);
      const student = a.chest_no ? students.find(s => s.chest_no === a.chest_no) : null;
      
      const col = (a.college_affl_no && colleges.find(c => c.affl_no === Number(a.college_affl_no)))
        || (student && colleges.find(c => c.affl_no === student.college_affl_no))
        || colleges.find(c => c.team_manager_phone === a.mobile_number || c.staff_coordinator_phone === a.mobile_number)
        || (collegeAfflNoOrId ? colleges.find(c => c.affl_no === (this.getCollege(collegeAfflNoOrId)?.affl_no)) : null)
        || colleges[0];

      return {
        ...a,
        college_affl_no: a.college_affl_no ? Number(a.college_affl_no) : col?.affl_no,
        reason: a.reason_for_appeal,
        status: a.current_status,
        item: itm,
        college: col
      };
    });

    if (!collegeAfflNoOrId) return enriched;
    const col = this.getCollege(collegeAfflNoOrId);
    return col ? enriched.filter(a => a.college?.affl_no === col.affl_no || a.college_affl_no === col.affl_no) : enriched;
  }

  public async submitAppeal(
    collegeAfflNoOrObj: number | string | Partial<Appeal>,
    itemId?: number | string,
    reason?: string,
    feeReceiptUrl?: string
  ): Promise<{ success: boolean; appeal?: Appeal; error?: string }> {
    const appeals = this.getStorage<Appeal[]>('appeals', []);
    const colleges = this.getColleges();

    let newAppeal: Appeal;
    let dbPayload: any;

    // Overload 1: passed as object
    if (typeof collegeAfflNoOrObj === 'object') {
      const obj = collegeAfflNoOrObj;
      const col = obj.college_affl_no 
        ? this.getCollege(obj.college_affl_no) 
        : colleges.find(c => c.team_manager_phone === obj.mobile_number || c.staff_coordinator_phone === obj.mobile_number);
      
      newAppeal = {
        id: `app-${Date.now()}`,
        college_affl_no: obj.college_affl_no ? Number(obj.college_affl_no) : (col?.affl_no || null),
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
        team_manager_name: obj.team_manager_name || col?.team_manager_name || 'Team Manager',
        mobile_number: obj.mobile_number || col?.team_manager_phone || '9800000000',
        acknowledgment: obj.acknowledgment !== undefined ? obj.acknowledgment : true,
        current_status: 'Pending',
        status: 'Pending',
        admin_remarks: null,
        created_at: new Date().toISOString()
      };
      const { id, reason: _r, status: _s, payment_mode: _pm, paid_to: _pt, participant_name: _pn, ...cleanPayload } = newAppeal as any;
      dbPayload = cleanPayload;
    } else {
      // Overload 2: passed as arguments
      const itm = this.getItem(itemId || 1);
      const col = this.getCollege(collegeAfflNoOrObj);
      newAppeal = {
        id: `app-${Date.now()}`,
        college_affl_no: col ? col.affl_no : Number(collegeAfflNoOrObj) || null,
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
      const { id, reason: _r, status: _s, payment_mode: _pm, paid_to: _pt, participant_name: _pn, ...cleanPayload } = newAppeal as any;
      dbPayload = cleanPayload;
    }

    if (supabase) {
      try {
        const { error } = await supabase.from('appeals').insert(dbPayload);
        if (error) {
          console.error('Database submitAppeal error:', error.message);
          return { success: false, error: `Failed to submit appeal: ${error.message}` };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error submitting appeal' };
      }
    }

    appeals.push(newAppeal);
    this.setStorage('appeals', appeals);
    return { success: true, appeal: newAppeal };
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

  public async submitReplacement(
    registrationId: string,
    origStudentId: string,
    newStudentId: string,
    reason: string
  ): Promise<{ success: boolean; replacement?: Replacement; error?: string }> {
    const list = this.getStorage<Replacement[]>('replacements', []);
    const students = this.getStudents();
    const registrations = this.getRegistrations();
    const orig = findStudentByIdentifier(students, origStudentId);
    const rep = findStudentByIdentifier(students, newStudentId);

    // Resolve valid UUID registration ID
    let targetRegId = registrationId;
    if (!isUuid(targetRegId)) {
      const matched = registrations.find(r => r.id === registrationId || (orig && r.chest_no === getCanonicalChestNo(orig)));
      if (matched && isUuid(matched.id)) {
        targetRegId = matched.id;
      }
    }

    if (!supabase) {
      const newRep: Replacement = {
        id: `rep-${Date.now()}`,
        registration_id: targetRegId,
        original_student_id: origStudentId,
        replacement_student_id: newStudentId,
        original_student: orig,
        replacement_student: rep,
        reason,
        status: 'Pending',
        created_at: new Date().toISOString()
      };
      list.unshift(newRep);
      this.setStorage('replacements', list);
      return { success: true, replacement: newRep };
    }

    const origUuid = orig?.id && isUuid(orig.id) ? orig.id : (isUuid(origStudentId) ? origStudentId : null);
    const repUuid = rep?.id && isUuid(rep.id) ? rep.id : (isUuid(newStudentId) ? newStudentId : null);

    const { data, error } = await supabase
      .from('replacements')
      .insert({
        registration_id: isUuid(targetRegId) ? targetRegId : null,
        original_student_id: origUuid,
        replacement_student_id: repUuid,
        reason,
        status: 'Pending'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase submitReplacement error:', error.message);
      return { success: false, error: error.message };
    }

    const fullRep: Replacement = {
      ...data,
      original_student: orig,
      replacement_student: rep,
      registration: registrations.find(r => r.id === data.registration_id)
    };
    list.unshift(fullRep);
    this.setStorage('replacements', list);
    return { success: true, replacement: fullRep };
  }

  public async reviewReplacement(repId: string, status: AppealStatus): Promise<{ success: boolean; error?: string }> {
    if (supabase) {
      const { data, error } = await supabase.rpc('review_replacement_tx', {
        p_replacement_id: repId,
        p_status: status
      });

      if (error) {
        console.error('❌ Supabase review_replacement_tx error:', error.message);
        return { success: false, error: error.message };
      }

      // Re-fetch registrations & replacements to sync live state
      await Promise.all([
        this.syncWithSupabase(undefined, true),
        this.fetchRegistrationsForCollege()
      ]);
      return { success: true };
    }

    // Fallback if client not connected
    const list = this.getStorage<Replacement[]>('replacements', []);
    const idx = list.findIndex(r => r.id === repId);
    if (idx >= 0) {
      list[idx].status = status;
      this.setStorage('replacements', list);
      return { success: true };
    }
    return { success: false, error: 'Replacement not found' };
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

  // --- Volunteers (Aliya & PG Phases) ---
  public notifyVolunteerChange(): void {
    if (this.isClient) {
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('wsf_volunteers_sync');
          bc.postMessage({ type: 'volunteer_change', timestamp: Date.now() });
          bc.close();
        }
        window.dispatchEvent(new CustomEvent('wsf_volunteers_change', { detail: { timestamp: Date.now() } }));
        // Update local storage timestamp to wake storage event listeners in sibling tabs
        window.localStorage.setItem('wsf_volunteers_updated', Date.now().toString());
      } catch (e) {}
    }

    if (supabase) {
      try {
        const bcChannel = supabase.channel('fest_realtime_sync');
        bcChannel.send({
          type: 'broadcast',
          event: 'volunteer_change',
          payload: { timestamp: Date.now() }
        }).catch(() => {});
      } catch (e) {}
    }
  }

  public getVolunteers(collegeAfflNoOrId?: number | string): Volunteer[] {
    let list = this.getStorage<Volunteer[]>('volunteers', []);
    if ((!list || list.length === 0) && this.isClient) {
      try {
        const local = window.localStorage.getItem('wsf_volunteers');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
            this.setStorage('volunteers', list);
          }
        }
      } catch (e) {}
    }

    const students = this.getStudents();

    const enriched = list.map(v => {
      const student = v.student || findStudentByIdentifier(students, v.student_id);
      return {
        ...v,
        student: student || v.student
      };
    });

    if (!collegeAfflNoOrId) return enriched;
    const col = this.getCollege(collegeAfflNoOrId);
    const afflNo = col ? col.affl_no : Number(collegeAfflNoOrId);
    return afflNo ? enriched.filter(v => v.college_affl_no === afflNo) : enriched;
  }

  public async fetchAllVolunteers(): Promise<Volunteer[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('volunteers')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          this.setStorage('volunteers', data);
          if (this.isClient) {
            try {
              window.localStorage.setItem('wsf_volunteers', JSON.stringify(data));
            } catch (e) {}
          }
          return this.getVolunteers();
        }
      } catch (err) {
        console.warn('Error fetching all volunteers from Supabase:', err);
      }
    }
    return this.getVolunteers();
  }

  public async fetchVolunteersForCollege(afflNo: number): Promise<Volunteer[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('volunteers')
          .select('*')
          .eq('college_affl_no', afflNo)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const allStored = this.getStorage<Volunteer[]>('volunteers', []);
          const otherVols = allStored.filter(v => v.college_affl_no !== afflNo);
          const combined = [...otherVols, ...data];
          this.setStorage('volunteers', combined);
          if (this.isClient) {
            try {
              window.localStorage.setItem('wsf_volunteers', JSON.stringify(combined));
            } catch (e) {}
          }
          return this.getVolunteers(afflNo);
        }
      } catch (err) {
        console.warn('Error fetching volunteers from Supabase:', err);
      }
    }
    return this.getVolunteers(afflNo);
  }

  public async registerVolunteer(data: {
    college_affl_no: number;
    student_id: string;
    duty_preference?: string;
    phone?: string | null;
    tshirt_size?: string;
    status?: 'Registered' | 'Approved' | 'Standby';
    notes?: string | null;
  }): Promise<{ success: boolean; volunteer?: Volunteer; error?: string }> {
    const students = this.getStudents();
    const student = findStudentByIdentifier(students, data.student_id);
    const existing = this.getVolunteers(data.college_affl_no).find(v => v.student_id === data.student_id);
    if (existing) {
      return { success: false, error: 'This student is already registered as a volunteer.' };
    }

    const newVol: Volunteer = {
      id: `vol-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      college_affl_no: data.college_affl_no,
      student_id: data.student_id,
      student: student,
      duty_preference: data.duty_preference || 'General Volunteer',
      phone: data.phone || student?.phone || null,
      tshirt_size: data.tshirt_size || 'L',
      status: data.status || 'Registered',
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const payload: any = {
          college_affl_no: data.college_affl_no,
          student_id: student?.id && isUuid(student.id) ? student.id : (isUuid(data.student_id) ? data.student_id : null),
          duty_preference: newVol.duty_preference,
          phone: newVol.phone,
          tshirt_size: newVol.tshirt_size,
          status: newVol.status,
          notes: newVol.notes
        };

        if (payload.student_id) {
          const { data: dbData, error } = await supabase
            .from('volunteers')
            .insert(payload)
            .select()
            .single();

          if (!error && dbData) {
            newVol.id = dbData.id;
          } else if (error) {
            console.warn('Supabase volunteer insert notice (cached fallback used):', error.message);
          }
        }
      } catch (err) {
        console.warn('Supabase volunteer register notice:', err);
      }
    }

    const allStored = this.getStorage<Volunteer[]>('volunteers', []);
    const updated = [newVol, ...allStored.filter(v => v.student_id !== data.student_id)];
    this.setStorage('volunteers', updated);
    if (this.isClient) {
      try {
        window.localStorage.setItem('wsf_volunteers', JSON.stringify(updated));
      } catch (e) {}
    }

    this.notifyVolunteerChange();
    return { success: true, volunteer: newVol };
  }

  public async updateVolunteer(
    volunteerId: string,
    updates: Partial<Volunteer>
  ): Promise<{ success: boolean; volunteer?: Volunteer; error?: string }> {
    const allStored = this.getStorage<Volunteer[]>('volunteers', []);
    const idx = allStored.findIndex(v => v.id === volunteerId || v.student_id === volunteerId);
    if (idx === -1) {
      return { success: false, error: 'Volunteer record not found.' };
    }

    const updatedVol: Volunteer = {
      ...allStored[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };

    allStored[idx] = updatedVol;
    this.setStorage('volunteers', allStored);
    if (this.isClient) {
      try {
        window.localStorage.setItem('wsf_volunteers', JSON.stringify(allStored));
      } catch (e) {}
    }

    if (supabase && isUuid(volunteerId)) {
      try {
        await supabase
          .from('volunteers')
          .update({
            duty_preference: updatedVol.duty_preference,
            phone: updatedVol.phone,
            tshirt_size: updatedVol.tshirt_size,
            status: updatedVol.status,
            notes: updatedVol.notes,
            updated_at: updatedVol.updated_at
          })
          .eq('id', volunteerId);
      } catch (err) {
        console.warn('Supabase volunteer update notice:', err);
      }
    }

    this.notifyVolunteerChange();
    return { success: true, volunteer: updatedVol };
  }

  public async unregisterVolunteer(volunteerIdOrStudentId: string): Promise<{ success: boolean; error?: string }> {
    const allStored = this.getStorage<Volunteer[]>('volunteers', []);
    const filtered = allStored.filter(v => v.id !== volunteerIdOrStudentId && v.student_id !== volunteerIdOrStudentId);
    this.setStorage('volunteers', filtered);
    if (this.isClient) {
      try {
        window.localStorage.setItem('wsf_volunteers', JSON.stringify(filtered));
      } catch (e) {}
    }

    if (supabase) {
      try {
        if (isUuid(volunteerIdOrStudentId)) {
          await supabase.from('volunteers').delete().or(`id.eq.${volunteerIdOrStudentId},student_id.eq.${volunteerIdOrStudentId}`);
        }
      } catch (err) {
        console.warn('Supabase volunteer delete notice:', err);
      }
    }

    this.notifyVolunteerChange();
    return { success: true };
  }

  // --- Announcements & Bulletins ---
  public notifyAnnouncementChange(): void {
    if (this.isClient) {
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('wsf_announcements_sync');
          bc.postMessage({ type: 'announcement_change', timestamp: Date.now() });
          bc.close();
        }
        window.dispatchEvent(new CustomEvent('wsf_announcements_change', { detail: { timestamp: Date.now() } }));
        window.localStorage.setItem('wsf_announcements_updated', Date.now().toString());
      } catch (e) {}
    }

    if (supabase) {
      try {
        const bcChannel = supabase.channel('fest_realtime_sync');
        bcChannel.send({
          type: 'broadcast',
          event: 'announcement_change',
          payload: { timestamp: Date.now() }
        }).catch(() => {});
      } catch (e) {}
    }
  }

  public getAnnouncements(): Announcement[] {
    let list = this.getStorage<Announcement[]>('announcements', []);
    if ((!list || list.length === 0) && this.isClient) {
      try {
        const local = window.localStorage.getItem('wsf_announcements');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
            this.setStorage('announcements', list);
          }
        }
      } catch (e) {}
    }
    const now = Date.now();
    return list.filter(a => {
      if (!a.is_active) return false;
      if (a.expires_at && new Date(a.expires_at).getTime() < now) return false;
      return true;
    });
  }

  public async fetchAllAnnouncements(): Promise<Announcement[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          this.setStorage('announcements', data);
          if (this.isClient) {
            try {
              window.localStorage.setItem('wsf_announcements', JSON.stringify(data));
            } catch (e) {}
          }
          return data;
        }
      } catch (err) {
        console.warn('Error fetching announcements from Supabase:', err);
      }
    }
    return this.getAnnouncements();
  }

  public async createAnnouncement(data: {
    title: string;
    message: string;
    priority?: 'urgent' | 'warning' | 'info' | 'success';
    target_type?: 'global' | 'role' | 'college' | 'student' | 'stage';
    target_role?: string | null;
    target_college_affl_no?: number | null;
    target_chest_no?: string | null;
    target_stage_id?: number | null;
    action_url?: string | null;
    action_label?: string | null;
    require_ack?: boolean;
    expires_at?: string | null;
  }): Promise<{ success: boolean; announcement?: Announcement; error?: string }> {
    const newNotice: Announcement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: data.title.trim(),
      message: data.message.trim(),
      priority: data.priority || 'urgent',
      target_type: data.target_type || 'global',
      target_role: data.target_role || null,
      target_college_affl_no: data.target_college_affl_no ? Number(data.target_college_affl_no) : null,
      target_chest_no: data.target_chest_no ? data.target_chest_no.trim().toUpperCase() : null,
      target_stage_id: data.target_stage_id ? Number(data.target_stage_id) : null,
      action_url: data.action_url || null,
      action_label: data.action_label || 'View Details',
      is_active: true,
      require_ack: Boolean(data.require_ack),
      expires_at: data.expires_at || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const payload: any = {
          title: newNotice.title,
          message: newNotice.message,
          priority: newNotice.priority,
          target_type: newNotice.target_type,
          target_role: newNotice.target_role,
          target_college_affl_no: newNotice.target_college_affl_no,
          target_chest_no: newNotice.target_chest_no,
          target_stage_id: newNotice.target_stage_id,
          action_url: newNotice.action_url,
          action_label: newNotice.action_label,
          is_active: newNotice.is_active,
          require_ack: newNotice.require_ack,
          expires_at: newNotice.expires_at
        };

        const { data: dbData, error } = await supabase
          .from('announcements')
          .insert(payload)
          .select()
          .single();

        if (!error && dbData) {
          newNotice.id = dbData.id;
        }
      } catch (err) {
        console.warn('Supabase create announcement notice:', err);
      }
    }

    const allStored = this.getStorage<Announcement[]>('announcements', []);
    const updated = [newNotice, ...allStored.filter(a => a.id !== newNotice.id)];
    this.setStorage('announcements', updated);
    if (this.isClient) {
      try {
        window.localStorage.setItem('wsf_announcements', JSON.stringify(updated));
      } catch (e) {}
    }

    this.notifyAnnouncementChange();
    return { success: true, announcement: newNotice };
  }

  public async deleteAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
    const allStored = this.getStorage<Announcement[]>('announcements', []);
    const filtered = allStored.filter(a => a.id !== id);
    this.setStorage('announcements', filtered);
    if (this.isClient) {
      try {
        window.localStorage.setItem('wsf_announcements', JSON.stringify(filtered));
      } catch (e) {}
    }

    if (supabase && isUuid(id)) {
      try {
        await supabase.from('announcements').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase announcement delete notice:', err);
      }
    }

    this.notifyAnnouncementChange();
    return { success: true };
  }
}

export const festService = new FestService();
