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
  LeaderboardEntry,
  SubmissionEntry,
  LateRegistration,
  SystemAuditLog,
  UserRole,
  Profile,
  StageStatus,
  AppealStatus,
  ScreeningStatus,
  SubmissionStatus,
  formatStudentCategory,
  normalizeCategoryKey,
  isCategoryMatching,
  getEffectiveStageMode,
  isSubmissionEvent,
  isScreeningEvent,
  isNonTabulationEvent,
  getItemParticipantBounds,
  requiresPreFestSubmission,
  EventKind,
  EventDeadlineSetting,
  getEventKind,
  DEFAULT_EVENT_DEADLINES
} from '../types/fest';

import {
  findStudentByIdentifier,
  getCanonicalChestNo,
  getRegistrationStudentKey,
  normalizeRegistration,
  registrationContainsStudent,
  calculateStudentEvents,
  checkStudentQuota,
  isUuid,
  registerChestNoMapping
} from '../utils/studentIdentity';

// Mock data removed
import { supabase } from '../supabase/client';
import {
  computeDeadlineSchedule,
  evaluateDeadlineTierAtTime,
  evaluateEventDeadlineSetting,
  evaluateLinkSubmissionDeadline,
  EventDeadlineEvaluation,
  RegistrationDeadlineTier,
  SUPER_FINE_AMOUNT_RS,
  FINE_AMOUNT_RS,
  formatIstDisplay,
} from '../utils/istDate';

const STORAGE_KEY_PREFIX = 'wafy_fest_db_';

export interface RegistrationStatus {
  canRegister: boolean;
  reason?: string;
  isFinePeriod: boolean;
  isSuperFinePeriod: boolean;
  fineAmount: 0 | 500 | 1000;
  tier: RegistrationDeadlineTier;
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
    system_audit_logs: [],
    entryLocks: [],
    schedules: [],
    stages: [],
    results: [],
    appeals: [],
    volunteers: [],
    announcements: [],
    code_letters: [],
    chest_no: [],
    late_registrations: [],
    submissions: [],
    maxParticipation: [],
    points_matrix: [],
    preFestSettings: [],
    preFestRegistrations: [],
    preFestSubmissions: []
  };

  constructor() {
    // In-memory RAM storage initialized
  }

  private sanitizeStudentRow(row: Record<string, any>): Student {
    const { password: _password, ...safe } = row;
    return safe as unknown as Student;
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
    // Attempt hydration from persistent client session storage if memory cache is empty
    if (this.isClient) {
      try {
        const item = sessionStorage.getItem('arts_fest_' + key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed !== null && parsed !== undefined) {
            this.cache[key] = parsed;
            return parsed as T;
          }
        }
      } catch (e) {
        // Ignore sessionStorage quota or access errors
      }
    }
    return fallback;
  }

  private readonly PERSISTED_STORAGE_KEYS = [
    'colleges',
    'festSettings',
    'results',
    'students',
    'items',
    'stages',
    'schedules',
    'points_matrix',
    'chest_no',
    'registrations',
    'late_registrations',
    'entryLocks',
    'submissions',
    'appeals',
    'replacements',
    'volunteers',
    'announcements',
    'code_letters',
    'maxParticipation',
    'preFestSettings',
    'preFestRegistrations',
    'preFestSubmissions'
  ];

  private setStorage<T>(key: string, value: T): void {
    this.cache[key] = value;
    if (key === 'chest_no' && Array.isArray(value)) {
      registerChestNoMapping(value as any);
    }
    if (this.isClient) {
      try {
        if (this.PERSISTED_STORAGE_KEYS.includes(key) && value !== null && value !== undefined) {
          sessionStorage.setItem('arts_fest_' + key, JSON.stringify(value));
        }
      } catch (e) {
        // Ignore storage errors (e.g. quota)
      }
    }
  }

  public clearSessionCache(): void {
    this.cache = {
      festSettings: null,
      colleges: [],
      items: [],
      students: [],
      registrations: [],
      registration_logs: [],
      system_audit_logs: [],
      entryLocks: [],
      schedules: [],
      stages: [],
      results: [],
      appeals: [],
      volunteers: [],
      announcements: [],
      replacements: [],
      code_letters: [],
      chest_no: [],
      late_registrations: [],
      submissions: [],
      maxParticipation: [],
      points_matrix: [],
      preFestSettings: [],
      preFestRegistrations: [],
      preFestSubmissions: []
    };
    if (this.isClient) {
      try {
        for (const k of this.PERSISTED_STORAGE_KEYS) {
          sessionStorage.removeItem('arts_fest_' + k);
        }
      } catch (e) { }
    }
    this.scopeSyncTimes.clear();
    this.authenticatedScopes.clear();
  }

  public async clearCacheAndRefetch(): Promise<void> {
    this.clearSessionCache();
    await this.syncWithSupabase(undefined, true);
  }

  private scopeSyncTimes = new Map<string | number, number>();
  private authenticatedScopes = new Set<string | number>();
  private syncInFlight = new Map<string | number, Promise<boolean>>();
  private readonly SYNC_TTL = 30 * 1000; // 30 seconds TTL for fast, responsive synchronization across dashboard

  public hasAuthenticatedSync(collegeAfflNo?: number): boolean {
    const scopeKey = collegeAfflNo ? Number(collegeAfflNo) : 'global';
    return this.authenticatedScopes.has(scopeKey) || this.authenticatedScopes.has('global');
  }

  // --- Live Supabase Sync (Throttled & Scoped with Specific Columns) ---
  public async syncWithSupabase(collegeAfflNo?: number, force = false): Promise<boolean> {
    if (!supabase) return false;
    const scopeKey = collegeAfflNo ? Number(collegeAfflNo) : 'global';
    const lastTime = this.scopeSyncTimes.get(scopeKey) || 0;
    const now = Date.now();
    if (!force && now - lastTime < this.SYNC_TTL) {
      return true; // Use in-memory RAM cache
    }

    const existingFlight = this.syncInFlight.get(scopeKey);
    if (existingFlight && !force) {
      return existingFlight;
    }

    const runPromise = this.performSyncWithSupabase(collegeAfflNo, scopeKey).finally(() => {
      if (this.syncInFlight.get(scopeKey) === runPromise) {
        this.syncInFlight.delete(scopeKey);
      }
    });
    this.syncInFlight.set(scopeKey, runPromise);
    return runPromise;
  }

  private async performSyncWithSupabase(collegeAfflNo: number | undefined, scopeKey: string | number): Promise<boolean> {
    if (!supabase) return false;
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

      // 1.1 Universal Event Deadlines & Fines Settings
      try {
        const { data: dlData, error: dlErr } = await client
          .from('event_deadline_settings')
          .select('*');
        if (!dlErr && dlData && dlData.length > 0) {
          this.setStorage('event_deadline_settings', dlData);
        }
      } catch (dlErr) {
        // Fallback to defaults
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

      // 3. Events catalog
      const { data: itemData, error: itemErr } = await client
        .from('events')
        .select('*')
        .order('item_code', { ascending: true });
      if (itemErr) {
        console.warn('Supabase sync error (events):', itemErr.message);
        hasError = true;
      } else if (itemData && itemData.length > 0) {
        this.setStorage('items', itemData);
      }

      // 3.5. Chest Nos mapping table (fetch early so students & registrations immediately resolve numeric chest numbers)
      const { data: sessionData } = await client.auth.getSession();
      const hasAuthSession = Boolean(sessionData?.session);

      if (hasAuthSession) {
        try {
          let chestQuery = client.from('chest_no').select('*');
          if (collegeAfflNo) {
            chestQuery = chestQuery.eq('college_affl_no', collegeAfflNo);
          }
          const { data: chestData, error: chestErr } = await chestQuery;
          if (!chestErr && chestData) {
            const normalizedChest = this.normalizeChestRows(chestData);
            if (collegeAfflNo) {
              const numAffl = Number(collegeAfflNo);
              const existingChest = this.getStorage<any[]>('chest_no', []);
              const otherChest = existingChest.filter(c => Number(c.college_affl_no) !== numAffl);
              this.setStorage('chest_no', [...otherChest, ...normalizedChest]);
            } else {
              this.setStorage('chest_no', normalizedChest);
            }
          }
        } catch (err) {
          console.warn('Notice: Supabase chest_no sync deferred');
        }
      }

      // 4. Students: Scoped fetch or Deterministic Paged Global fetch (authenticated staff/college only)
      if (hasAuthSession) {
        const SAFE_STUDENT_SELECT = 'id, name, cic_no, college_affl_no, class, phase, phone, photo_url, created_at';

        if (collegeAfflNo) {
          const { data: studentData, error: stuErr } = await client
            .from('students')
            .select(SAFE_STUDENT_SELECT)
            .eq('college_affl_no', collegeAfflNo)
            .order('id', { ascending: true })
            .limit(1000);

          if (stuErr) {
            console.warn('Supabase sync error (students):', stuErr.message);
            hasError = true;
          } else if (studentData) {
            const safeStudents = studentData.map((s: Record<string, any>) => this.sanitizeStudentRow(s));
            const existing = this.getStorage<Student[]>('students', []);
            const otherColleges = existing.filter(s => s.college_affl_no !== collegeAfflNo);
            this.setStorage('students', [...otherColleges, ...safeStudents]);
          }
        } else {
          let allStudents: Student[] = [];
          let page = 0;
          const pageSize = 1000;
          let hasMore = true;

          while (hasMore) {
            const { data, error } = await client
              .from('students')
              .select(SAFE_STUDENT_SELECT)
              .order('id', { ascending: true })
              .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) {
              console.error('Supabase student page sync error:', error.message);
              hasError = true;
              break; // Abort: do NOT overwrite complete cache with partial data
            }
            if (data && data.length > 0) {
              allStudents = allStudents.concat(
                data.map((s: Record<string, any>) => this.sanitizeStudentRow(s))
              );
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

      // 6.2. Pre-fest Submission & Screening Entries
      try {
        let subQuery = client.from('submission_entries').select('*');
        if (collegeAfflNo) {
          subQuery = subQuery.eq('college_affl_no', collegeAfflNo);
        }
        const { data: subData, error: subErr } = await subQuery;
        if (!subErr && subData) {
          const normalizedSubs: SubmissionEntry[] = subData.map((s: Record<string, any>) => ({
            id: s.id,
            college_affl_no: Number(s.college_affl_no),
            chest_no: s.chest_no,
            item_id: Number(s.item_id),
            status: (s.status || 'on_time') as SubmissionStatus,
            file_url: s.file_url || null,
            submitted_at: s.submitted_at || new Date().toISOString()
          }));
          if (collegeAfflNo) {
            const numAffl = Number(collegeAfflNo);
            const existingSubs = this.getStorage<SubmissionEntry[]>('submissions', []);
            const otherSubs = existingSubs.filter(s => Number(s.college_affl_no) !== numAffl);
            this.setStorage('submissions', [...otherSubs, ...normalizedSubs]);
          } else {
            this.setStorage('submissions', normalizedSubs);
          }
        }
      } catch (err) {
        console.warn('Supabase sync notice (submission_entries):', err);
      }

      // 7. Results: Safe fetch with deduplication
      const { data: resData, error: resErr } = await client.from('results').select('*');
      if (resErr) {
        console.warn('Supabase sync notice (results):', resErr.message);
      } else if (resData) {
        const dedupedMap = new Map<string, any>();
        for (const res of resData) {
          const cleanChest = (res.chest_no || '').trim().toUpperCase();
          const cleanCode = (res.code_letter || '').trim().toUpperCase();
          const key = cleanChest ? `${res.item_id}:chest:${cleanChest}` : `${res.item_id}:code:${cleanCode}`;
          dedupedMap.set(key, {
            ...res,
            item_id: Number(res.item_id),
            college_affl_no: res.college_affl_no ? Number(res.college_affl_no) : null,
            mark_percentage: res.mark_percentage !== null ? Number(res.mark_percentage) : null,
            rank: res.rank !== null ? Number(res.rank) : null,
            points: res.points !== null ? Number(res.points) : 0,
            published: Boolean(res.published)
          });
        }
        this.setStorage('results', Array.from(dedupedMap.values()));
      }

      // 7.1. Points Matrix
      try {
        const { data: pmData, error: pmErr } = await client.from('points_matrix').select('*');
        if (!pmErr && pmData) {
          this.setStorage('points_matrix', pmData);
        }
      } catch (err) {
        // Optional table
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
              } catch (e) { }
            }
          } else {
            this.setStorage('volunteers', volData);
            if (this.isClient) {
              try {
                window.localStorage.setItem('wsf_volunteers', JSON.stringify(volData));
              } catch (e) { }
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
            } catch (e) { }
          }
        }
      } catch (err) {
        // Deferred
      }

      // 13. System Audit Logs
      try {
        const { data: logData, error: logErr } = await client
          .from('system_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        if (!logErr && logData) {
          this.setStorage('system_audit_logs', logData);
        }
      } catch (err) {
        // Deferred
      }

      // 14. Code Letters: Fetch from Supabase code_letters table
      try {
        const { data: codeData, error: codeErr } = await client
          .from('code_letters')
          .select('*');
        if (!codeErr && codeData) {
          const normalizedCodes = codeData.map((c: any) => ({
            ...c,
            item_id: Number(c.item_id),
            college_affl_no: Number(c.college_affl_no)
          }));
          this.setStorage('code_letters', normalizedCodes);

          // Backfill into cached registrations
          const regs = this.getStorage<Registration[]>('registrations', []);
          if (regs.length > 0) {
            const codeMap = new Map<string, string>();
            normalizedCodes.forEach((c: any) => {
              if (c.chest_no && c.code_letter) {
                codeMap.set(`${c.item_id}:${c.chest_no.trim().toUpperCase()}`, c.code_letter.trim());
              }
            });
            regs.forEach(r => {
              const cleanChest = (r.chest_no || '').trim().toUpperCase();
              const foundCode = codeMap.get(`${r.item_id}:${cleanChest}`);
              if (foundCode) {
                r.code_letter = foundCode;
              }
            });
            this.setStorage('registrations', regs);
          }
        }
      } catch (err) {
        console.warn('Notice: Supabase code_letters sync deferred');
      }

      // 15. Pre-Fest Events: Settings, Registrations, Submissions
      try {
        const { data: seSettings, error: seSettingsErr } = await client
          .from('prefest_registration_settings')
          .select('*');
        if (!seSettingsErr && seSettings) {
          this.setStorage('preFestSettings', seSettings);
        }

        let seRegQuery = client.from('prefest_registrations').select('*');
        if (collegeAfflNo) {
          seRegQuery = seRegQuery.eq('college_affl_no', collegeAfflNo);
        }
        const { data: seRegData, error: seRegErr } = await seRegQuery;
        if (!seRegErr && seRegData) {
          if (collegeAfflNo) {
            const numAffl = Number(collegeAfflNo);
            const existingRegs = this.getStorage<any[]>('preFestRegistrations', []);
            const otherRegs = existingRegs.filter(r => Number(r.college_affl_no) !== numAffl);
            this.setStorage('preFestRegistrations', [...otherRegs, ...seRegData]);
          } else {
            this.setStorage('preFestRegistrations', seRegData);
          }
        }

        let seSubQuery = client.from('prefest_submissions').select('*');
        if (collegeAfflNo) {
          seSubQuery = seSubQuery.eq('college_affl_no', collegeAfflNo);
        }
        const { data: seSubData, error: seSubErr } = await seSubQuery;
        if (!seSubErr && seSubData) {
          if (collegeAfflNo) {
            const numAffl = Number(collegeAfflNo);
            const existingSubs = this.getStorage<any[]>('preFestSubmissions', []);
            const otherSubs = existingSubs.filter(s => Number(s.college_affl_no) !== numAffl);
            this.setStorage('preFestSubmissions', [...otherSubs, ...seSubData]);
          } else {
            this.setStorage('preFestSubmissions', seSubData);
          }
        }
      } catch (err) {
        console.warn('Notice: Supabase prefest_events sync deferred', err);
      }

      if (!hasError) {
        this.scopeSyncTimes.set(scopeKey, Date.now());
        if (hasAuthSession) {
          this.authenticatedScopes.add(scopeKey);
        }
      }
      return !hasError;
    } catch (err) {
      console.warn('Notice: Supabase sync deferred:', err);
      return false;
    }
  }

  // --- Multi-Tab & Multi-Window Broadcast Synchronization ---
  public broadcastGlobalSync(entity: string, detail?: any): void {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('wsf_global_sync');
          bc.postMessage({ type: 'DATA_MUTATED', entity, detail, timestamp: Date.now() });
          setTimeout(() => bc.close(), 100);
        }
        window.dispatchEvent(new CustomEvent('wsf_global_sync', { detail: { entity, detail, timestamp: Date.now() } }));
      } catch { }
    }
  }

  // --- Supabase Realtime Subscriptions (Replaces Polling with WebSockets) ---
  public subscribeToRealtimeChanges(
    onUpdate: () => void,
    getCollegeAfflNo?: () => number | undefined
  ): () => void {
    if (!supabase) return () => { };

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerDebouncedSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.scopeSyncTimes.clear(); // Invalidate cache
        const scopedAffl = getCollegeAfflNo?.();
        this.syncWithSupabase(scopedAffl, true).then(onUpdate);
      }, 300);
    };

    const channel = supabase
      .channel('fest_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entry_locks' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'late_registrations' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appeals' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replacements' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fest_settings' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colleges' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stages' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'max_participation' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'points_matrix' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteers' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_audit_logs' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'code_letters' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chest_no' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_deadline_settings' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submission_entries' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prefest_registration_settings' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prefest_registrations' }, triggerDebouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prefest_submissions' }, triggerDebouncedSync)
      .on('broadcast', { event: 'volunteer_change' }, triggerDebouncedSync)
      .on('broadcast', { event: 'announcement_change' }, triggerDebouncedSync)
      .on('broadcast', { event: 'system_log_change' }, triggerDebouncedSync)
      .on('broadcast', { event: 'prefest_event_change' }, triggerDebouncedSync)
      .on('broadcast', { event: 'lock_change' }, triggerDebouncedSync)
      .on('broadcast', { event: 'registration_change' }, triggerDebouncedSync)
      .on('broadcast', { event: 'result_change' }, triggerDebouncedSync)
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.info('⚡ Supabase Realtime channel connected: Live updates active across all tables including audit logs.');
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
    const defaultRegMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const defaultRegIso = new Date(defaultRegMs).toISOString();
    const defaultSettings: FestSettings = {
      id: 1,
      fest_name: 'WAFY ARTS FEST',
      reg_deadline: defaultRegIso,
      fine_deadline: computeDeadlineSchedule(defaultRegIso)!.superFineEndIso
    };
    return this.getStorage('festSettings', defaultSettings);
  }

  private async postServerApi<T = { success: boolean; error?: string }>(
    url: string,
    payload: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Request to ${url} failed with status ${res.status}`);
    }
    return data as T;
  }

  public async updateFestSettings(settings: Partial<FestSettings>): Promise<FestSettings> {
    const current = this.getFestSettings();
    const merged = { ...current, ...settings };
    if (merged.reg_deadline) {
      const schedule = computeDeadlineSchedule(merged.reg_deadline);
      if (schedule) {
        merged.reg_deadline = schedule.regDeadlineIso;
        merged.fine_deadline = schedule.superFineEndIso;
      }
    }
    const updated = merged;
    this.setStorage('festSettings', updated);

    // Broadcast update immediately to all other open tabs and components
    this.broadcastGlobalSync('festSettings', { settings: updated });
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('wsf_settings_sync');
          bc.postMessage({ type: 'SETTINGS_UPDATED', settings: updated });
          setTimeout(() => bc.close(), 100);
        }
        window.dispatchEvent(new CustomEvent('wsf_settings_updated', { detail: updated }));
      } catch { }
    }

    if (supabase) {
      try {
        await this.postServerApi('/api/admin/settings', { settings: updated });
      } catch (err: any) {
        console.error('Failed to update fest settings in Supabase:', err?.message || err);
        throw err;
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
    if (!item) {
      return {
        canRegister: false,
        reason: 'Event not found',
        isFinePeriod: false,
        isSuperFinePeriod: false,
        fineAmount: 0,
        tier: 'closed',
      };
    }
    if (!college) {
      return {
        canRegister: false,
        reason: 'College not found',
        isFinePeriod: false,
        isSuperFinePeriod: false,
        fineAmount: 0,
        tier: 'closed',
      };
    }

    // Universal event deadline & fine evaluation from event_deadline_settings table
    const kind = getEventKind(item);
    const deadlineSetting = this.getEventDeadlineSetting(kind);
    const deadlineEval = evaluateEventDeadlineSetting(deadlineSetting, now);

    // 1. Not yet started
    if (deadlineEval.tier === 'upcoming') {
      return {
        canRegister: false,
        reason: `${deadlineSetting.display_name} registration opens at ${formatIstDisplay(deadlineSetting.start_time)}`,
        isFinePeriod: false,
        isSuperFinePeriod: false,
        fineAmount: 0,
        tier: 'closed',
      };
    }

    // 2. After Super Fine ends, registration is completely locked for ALL colleges (no override bypass)
    if (deadlineEval.tier === 'closed') {
      return {
        canRegister: false,
        isFinePeriod: false,
        isSuperFinePeriod: false,
        fineAmount: 0,
        tier: 'closed',
        reason: `${deadlineSetting.display_name} registration window has ended — completely locked for all colleges`,
      };
    }

    const isFine = deadlineEval.tier === 'fine';
    const isSuperFine = deadlineEval.tier === 'super_fine';
    const fineReason = isSuperFine
      ? `Super Fine Active (₹${deadlineEval.fineAmount})`
      : isFine
        ? `Late Fine Active (₹${deadlineEval.fineAmount})`
        : undefined;

    // Emergency college-level override bypasses event/matrix locks within active deadline window
    if (college.manual_lock_override) {
      return {
        canRegister: true,
        isFinePeriod: isFine,
        isSuperFinePeriod: isSuperFine,
        fineAmount: deadlineEval.fineAmount as any,
        tier: deadlineEval.tier,
        reason: fineReason
          ? `Admin Override Active (${fineReason})`
          : 'Admin Override Active',
      };
    }

    // 2. Specific 2D Matrix cell configuration for this college & item takes precedence over generic item lock
    if (cell !== undefined) {
      if (!cell.is_open) {
        return {
          canRegister: false,
          reason: 'Registration closed by fest admin for this event',
          isFinePeriod: false,
          isSuperFinePeriod: false,
          fineAmount: 0,
          tier: deadlineEval.tier,
        };
      }
      return {
        canRegister: true,
        isFinePeriod: isFine,
        isSuperFinePeriod: isSuperFine,
        fineAmount: deadlineEval.fineAmount as any,
        tier: deadlineEval.tier,
        reason: fineReason || 'Admin Matrix Permission Active',
      };
    }

    // 3. Fallback to event-level lock when no specific college override exists
    if (item.is_locked) {
      return {
        canRegister: false,
        reason: 'Event is locked by fest admin',
        isFinePeriod: false,
        isSuperFinePeriod: false,
        fineAmount: 0,
        tier: deadlineEval.tier,
      };
    }

    return {
      canRegister: true,
      isFinePeriod: isFine,
      isSuperFinePeriod: isSuperFine,
      fineAmount: deadlineEval.fineAmount as any,
      tier: deadlineEval.tier,
      reason: fineReason,
    };
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
        this.postServerApi('/api/admin/manage', {
          action: 'update_college',
          afflNo: college.affl_no,
          updates,
        }).catch(err => console.warn('updateCollege error:', err));
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
      await this.postServerApi('/api/admin/locks', {
        action: 'revoke_all_college_overrides',
        afflNos: targetAffls,
      });
    }
    return targetAffls.length;
  }

  // --- Items ---
  private normalizeItemRecord(raw: Record<string, any>): Item {
    const bounds = getItemParticipantBounds(raw as Item);
    return {
      ...(raw as Item),
      code: raw.item_code,
      name: raw.name_eng,
      item_type: (raw.point_type === 'individual' ? 'Single' : 'Group') as 'Single' | 'Group',
      min_participants: bounds.min,
      max_participants: bounds.max
    };
  }

  public getItems(): Item[] {
    const items = this.getStorage<Item[]>('items', []);
    return items
      .map(i => this.normalizeItemRecord(i))
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
        const nextCategory = (item.category || items[idx].category || 'A').toUpperCase().charAt(0);
        const nextParticipants =
          item.no_of_participants !== undefined
            ? item.no_of_participants
            : (item.max_participants ?? items[idx].no_of_participants);
        const dbPayload = {
          item_code: item.item_code || item.code || items[idx].item_code,
          name_eng: item.name_eng || item.name || items[idx].name_eng,
          name_mal: item.name_mal || items[idx].name_mal,
          phase: item.phase || items[idx].phase,
          mode: getEffectiveStageMode(item.mode ? item : items[idx]),
          is_submission: item.is_submission !== undefined ? item.is_submission : isSubmissionEvent(items[idx]),
          is_screening: item.is_screening !== undefined ? item.is_screening : isScreeningEvent(items[idx]),
          category: nextCategory,
          tabulation: item.tabulation !== undefined ? item.tabulation : (nextCategory === 'D' ? false : items[idx].tabulation),
          point_type: item.point_type || (item.item_type === 'Group' ? 'group' : 'individual'),
          no_of_participants: nextParticipants,
          reg_deadline: item.reg_deadline !== undefined ? item.reg_deadline : items[idx].reg_deadline,
          fine_deadline: item.fine_deadline !== undefined ? item.fine_deadline : items[idx].fine_deadline,
          is_locked: item.is_locked !== undefined ? item.is_locked : items[idx].is_locked,
          l_star: item.l_star !== undefined ? item.l_star : items[idx].l_star,
          em_star: item.em_star !== undefined ? item.em_star : items[idx].em_star
        };

        if (supabase) {
          try {
            const res = await this.postServerApi<{ success: boolean; data?: any }>('/api/admin/manage', {
              action: 'save_item',
              itemId: item.item_id,
              payload: dbPayload,
            });
            if (res.data) {
              items[idx] = this.normalizeItemRecord({ ...items[idx], ...res.data });
              this.setStorage('items', items);
              return { success: true, item: items[idx] };
            }
          } catch (err: any) {
            console.error('Failed to update item in database:', err.message);
            return { success: false, error: err.message };
          }
        }
        items[idx] = this.normalizeItemRecord({ ...items[idx], ...dbPayload });
        this.setStorage('items', items);
        return { success: true, item: items[idx] };
      }
    }

    // Insert new event: omit item_id so sequence nextval('events_item_id_seq') assigns monotonic ID
    const createCategory = (item.category || 'A').toUpperCase().charAt(0);
    const dbPayload = {
      item_code: item.item_code || item.code || `ITM-${Date.now().toString().slice(-4)}`,
      name_eng: item.name_eng || item.name || 'New Item',
      name_mal: item.name_mal || 'പുതിയ ഇനം',
      phase: item.phase || 'Foundation',
      mode: getEffectiveStageMode(item),
      is_submission: isSubmissionEvent(item),
      is_screening: isScreeningEvent(item),
      category: createCategory,
      tabulation: item.tabulation !== undefined ? item.tabulation : createCategory !== 'D',
      point_type: item.point_type || (item.item_type === 'Group' ? 'group' : 'individual'),
      no_of_participants:
        item.no_of_participants !== undefined
          ? item.no_of_participants
          : (item.max_participants ?? 1),
      is_locked: false,
      l_star: item.l_star || false,
      em_star: item.em_star || false
    };

    if (supabase) {
      try {
        const res = await this.postServerApi<{ success: boolean; data?: any }>('/api/admin/manage', {
          action: 'save_item',
          payload: dbPayload,
        });
        if (res.data) {
          const fullItem = this.normalizeItemRecord({
            ...res.data,
            id: res.data.id || `itm-${res.data.item_id}`
          });
          items.push(fullItem);
          this.setStorage('items', items);
          return { success: true, item: fullItem };
        }
      } catch (err: any) {
        console.error('Failed to create item in database:', err.message);
        return { success: false, error: err.message };
      }
    }

    const nextItemId = items.length > 0 ? Math.max(...items.map(i => i.item_id)) + 1 : 1;
    const fallbackItem = this.normalizeItemRecord({
      id: `itm-${nextItemId}`,
      item_id: nextItemId,
      item_code: dbPayload.item_code,
      name_eng: dbPayload.name_eng,
      name_mal: dbPayload.name_mal,
      phase: dbPayload.phase,
      mode: dbPayload.mode,
      category: dbPayload.category,
      tabulation: dbPayload.tabulation,
      point_type: dbPayload.point_type,
      is_submission: dbPayload.is_submission,
      is_screening: dbPayload.is_screening,
      no_of_participants: dbPayload.no_of_participants,
      l_star: dbPayload.l_star,
      em_star: dbPayload.em_star,
      is_locked: false,
      created_at: new Date().toISOString()
    });
    items.push(fallbackItem);
    this.setStorage('items', items);
    return { success: true, item: fallbackItem };
  }

  public async updateItemDeadlines(
    itemId: number,
    regDeadline: string | null,
    fineDeadline: string | null = null
  ): Promise<{ success: boolean; item?: Item; error?: string }> {
    const items = this.getStorage<Item[]>('items', []);
    const idx = items.findIndex(i => i.item_id === itemId);
    if (idx === -1) {
      return { success: false, error: 'Event not found' };
    }

    const schedule = regDeadline ? computeDeadlineSchedule(regDeadline) : null;
    const normalizedReg = schedule ? schedule.regDeadlineIso : regDeadline;
    const normalizedFine = schedule ? schedule.superFineEndIso : fineDeadline;

    if (supabase) {
      try {
        const res = await this.postServerApi<{ success: boolean; data?: any[] }>('/api/admin/manage', {
          action: 'update_item_deadlines',
          itemIds: [itemId],
          regDeadline: normalizedReg,
          fineDeadline: normalizedFine,
        });
        const updatedRow = res.data?.[0];
        if (updatedRow) {
          items[idx] = {
            ...items[idx],
            reg_deadline: updatedRow.reg_deadline,
            fine_deadline: updatedRow.fine_deadline
          };
          this.setStorage('items', items);
          return { success: true, item: items[idx] };
        }
      } catch (err: any) {
        console.error('Failed to update event deadline in Supabase:', err.message);
        return { success: false, error: err.message };
      }
    }

    items[idx] = {
      ...items[idx],
      reg_deadline: normalizedReg,
      fine_deadline: normalizedFine
    };
    this.setStorage('items', items);
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('wsf_settings_sync');
          bc.postMessage({ type: 'SETTINGS_UPDATED' });
          setTimeout(() => bc.close(), 100);
        }
        window.dispatchEvent(new CustomEvent('wsf_settings_updated'));
      } catch { }
    }
    return { success: true, item: items[idx] };
  }

  public async batchUpdateItemDeadlines(
    itemIds: number[],
    regDeadline: string | null,
    fineDeadline: string | null = null
  ): Promise<{ success: boolean; count: number; error?: string }> {
    if (itemIds.length === 0) return { success: true, count: 0 };
    const items = this.getStorage<Item[]>('items', []);

    const schedule = regDeadline ? computeDeadlineSchedule(regDeadline) : null;
    const normalizedReg = schedule ? schedule.regDeadlineIso : regDeadline;
    const normalizedFine = schedule ? schedule.superFineEndIso : fineDeadline;

    if (supabase) {
      try {
        await this.postServerApi('/api/admin/manage', {
          action: 'update_item_deadlines',
          itemIds,
          regDeadline: normalizedReg,
          fineDeadline: normalizedFine,
        });
      } catch (err: any) {
        console.error('Failed to batch update event deadlines in Supabase:', err.message);
        return { success: false, count: 0, error: err.message };
      }
    }

    itemIds.forEach(id => {
      const idx = items.findIndex(i => i.item_id === id);
      if (idx >= 0) {
        items[idx].reg_deadline = normalizedReg;
        items[idx].fine_deadline = normalizedFine;
      }
    });
    this.setStorage('items', items);
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('wsf_settings_sync');
          bc.postMessage({ type: 'SETTINGS_UPDATED' });
          setTimeout(() => bc.close(), 100);
        }
        window.dispatchEvent(new CustomEvent('wsf_settings_updated'));
      } catch { }
    }
    return { success: true, count: itemIds.length };
  }

  public async resetItemDeadlines(
    itemIds: number[]
  ): Promise<{ success: boolean; count: number; error?: string }> {
    return this.batchUpdateItemDeadlines(itemIds, null, null);
  }

  // --- Registration Lock Matrix ---
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
    this.broadcastGlobalSync('locks', { itemId, collegeAfflNo, isOpen });

    const client = supabase;
    if (client) {
      try {
        await this.postServerApi('/api/admin/locks', {
          action: 'set_cell',
          itemId,
          collegeAfflNo,
          isOpen,
        });
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
    this.broadcastGlobalSync('locks', { itemId, isOpen });

    const client = supabase;
    if (client && dbRows.length > 0) {
      try {
        await this.postServerApi('/api/admin/locks', {
          action: 'set_row',
          itemId,
          isOpen,
          rows: dbRows,
        });
      } catch (err) {
        console.warn('Supabase entry_locks/events row upsert notice:', err);
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
    this.broadcastGlobalSync('locks', { isOpen, all: true });

    const client = supabase;
    if (client && bulkRows.length > 0) {
      try {
        await this.postServerApi('/api/admin/locks', {
          action: 'set_all',
          isOpen,
          rows: bulkRows,
        });
      } catch (err) {
        console.warn('Supabase bulk entry_locks upsert notice:', err);
      }
    }
  }

  // Backward compatibility helper
  public async setCollegeItemLock(collegeAfflNoOrId: number | string, itemIdOrCode: number | string, isUnlocked: boolean): Promise<EntryLock> {
    const college = this.getCollege(collegeAfflNoOrId);
    const item = this.getItem(itemIdOrCode);
    const affl = college ? college.affl_no : Number(collegeAfflNoOrId) || 0;
    const itmId = item ? item.item_id : Number(itemIdOrCode) || 0;
    return this.setEntryLockCell(itmId, affl, isUnlocked);
  }

  // --- Students ---
  public getStudents(collegeAfflNoOrId?: number | string): Student[] {
    const students = this.getStorage<Student[]>('students', []);
    const colleges = this.getColleges();
    const chestRows = this.getStorage<Array<{ cic_no?: number | string; chest_no?: number | string }>>('chest_no', []);
    const assignedByCic = new Map<string, string>();
    for (const row of chestRows) {
      if (row.cic_no !== undefined && row.cic_no !== null && row.chest_no !== undefined && row.chest_no !== null) {
        const trimmed = String(row.chest_no).trim();
        if (trimmed) {
          assignedByCic.set(String(row.cic_no).trim(), trimmed);
        }
      }
    }

    const enriched = students.map(s => {
      const cic = s.cic_no ?? s.admission_no ?? (s as any).cic_number;
      const cicKey = cic !== undefined && cic !== null ? String(cic).trim() : '';
      const serverChest = cicKey ? assignedByCic.get(cicKey) : undefined;
      const existingNumericChest =
        s.chest_no && /^\d+$/.test(String(s.chest_no).trim()) ? String(s.chest_no).trim() : undefined;
      const chest = serverChest || existingNumericChest || undefined;
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
    const numAffl = !isNaN(Number(collegeAfflNoOrId)) ? Number(collegeAfflNoOrId) : undefined;
    const targetAffl = col ? col.affl_no : (numAffl && numAffl > 0 ? numAffl : undefined);
    return targetAffl ? enriched.filter(s => Number(s.college_affl_no) === targetAffl) : enriched;
  }

  public async fetchStudentsForCollege(afflNo: number): Promise<Student[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, name, cic_no, college_affl_no, class, phase, phone, photo_url, created_at')
          .eq('college_affl_no', afflNo)
          .order('name', { ascending: true });
        if (!error && data && data.length > 0) {
          const safeStudents = data.map((s: Record<string, any>) => this.sanitizeStudentRow(s));
          const allStored = this.getStorage<Student[]>('students', []);
          const otherStudents = allStored.filter(s => s.college_affl_no !== afflNo);
          this.setStorage('students', [...otherStudents, ...safeStudents]);
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
          await this.postServerApi('/api/admin/manage', {
            action: 'clear_late_registrations',
            collegeAfflNo: numAffl,
          });
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
          await this.postServerApi('/api/admin/manage', {
            action: 'clear_late_registrations',
          });
        } catch (err) {
          console.warn('Supabase clearLateRegistrations notice:', err);
        }
      }
    }

    if (this.isClient) {
      try {
        window.localStorage.setItem('wsf_late_registrations', JSON.stringify(remaining));
      } catch (e) { }
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
          this.postServerApi('/api/students', {
            action: 'upsert',
            student: students[idx],
          }).catch(err => console.warn('saveStudent upsert error:', err));
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
      chest_no: student.chest_no && /^\d+$/.test(String(student.chest_no).trim()) ? String(student.chest_no).trim() : undefined,
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
        password: (newStudent as any).password || (cicVal ? `${cicVal}@${affl}` : `wafy@${Date.now().toString().slice(-4)}`)
      };
      if (typeof cicVal === 'number' || (typeof cicVal === 'string' && /^\d+$/.test(cicVal))) {
        dbPayload.cic_no = Number(cicVal);
      }
      this.postServerApi('/api/students', {
        action: 'insert',
        student: dbPayload,
      }).catch(err => console.warn('saveStudent insert error:', err));
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
    const numAffl = collegeAfflNoOrId !== undefined && !isNaN(Number(collegeAfflNoOrId)) ? Number(collegeAfflNoOrId) : undefined;
    const targetAffl = col ? col.affl_no : (numAffl && numAffl > 0 ? numAffl : undefined);

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
          const repaired = getCanonicalChestNo(s);
          const nextKey = repaired !== '—' ? repaired : getRegistrationStudentKey(s);
          if (nextKey) {
            count++;
            return { ...r, chest_no: nextKey };
          }
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
        chestNos.push(getRegistrationStudentKey(s));
      } else {
        console.warn(`[StudentIdentityResolver] Unable to resolve student identifier: ${val}`);
      }
    }

    const { min: minRequired, max: maxAllowed } = getItemParticipantBounds(item);

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

    // Validate phase eligibility & student participation quotas for this college
    for (const student of resolvedStudents) {
      const stuLabel =
        getCanonicalChestNo(student) !== '—'
          ? getCanonicalChestNo(student)
          : `CIC ${student.cic_no || 'N/A'}`;
      if (!bypassDeadline) {
        const stuCat = student.category || student.phase;
        if (!isCategoryMatching(stuCat, item.phase || item.category)) {
          return {
            success: false,
            error: `Student ${student.name || student.full_name} (${stuLabel}) [${stuCat || 'Unknown'}] is not eligible for ${item.phase || 'this'} event.`
          };
        }
      }
      const quotaCheck = checkStudentQuota(student, item, collegeRegs, allItems, quotaLimits);
      if (!quotaCheck.allowed) {
        return {
          success: false,
          error: `Student ${student.name || student.full_name} (${stuLabel}): ${quotaCheck.reason}`
        };
      }
    }

    if (supabase) {
      try {
        const res = await this.postServerApi<{ success: boolean; rows?: any[]; error?: string }>(
          '/api/registrations',
          {
            action: 'register',
            itemId: item.item_id,
            collegeAfflNo: college.affl_no,
            chestNos,
          }
        );
        if (!res || !res.success) {
          return { success: false, error: res?.error || 'Registration failed on server' };
        }
        const dbRows = res.rows || [];

        const regs = this.getStorage<Registration[]>('registrations', []);
        const logs = this.getStorage<RegistrationLog[]>('registration_logs', []);
        const remaining = regs.filter(r => !(Number(r.item_id) === Number(item.item_id) && Number(r.college_affl_no) === Number(college.affl_no)));

        const persistedChestNos: string[] =
          dbRows && dbRows.length > 0
            ? dbRows.map((r: any) => String(r.chest_no || '').trim()).filter(Boolean)
            : chestNos;

        if (dbRows && dbRows.length > 0) {
          remaining.push(...dbRows);
        }
        persistedChestNos.forEach(cNo => {
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
        this.pruneSubmissionsForRoster(item.item_id, college.affl_no, persistedChestNos, item.point_type === 'group' || item.item_type === 'Group');
        // Refresh server-assigned numeric chest_no rows created by trigger
        await this.fetchChestNos();

        // Reflect server-applied late fine or super fine in local college cache and late_registrations store
        const effectiveRegIso = item.reg_deadline || this.getFestSettings().reg_deadline;
        const regTimestampIso = dbRows?.[0]?.created_at || new Date().toISOString();
        const tierInfo = evaluateDeadlineTierAtTime(effectiveRegIso, regTimestampIso);
        const isLate = tierInfo.tier !== 'open';

        if (isLate) {
          const colList = this.getStorage<College[]>('colleges', []);
          const cIdx = colList.findIndex(c => c.affl_no === college.affl_no);
          if (cIdx >= 0) {
            colList[cIdx].fine_status = true;
            this.setStorage('colleges', colList);
          }

          const fineTier = tierInfo.tier === 'fine' ? 'fine' : 'super_fine';
          const fineAmount = tierInfo.fineAmount;
          const lateReason =
            fineTier === 'fine'
              ? 'Fine Period (₹500) — within 1 hr of deadline'
              : tierInfo.tier === 'super_fine'
                ? 'Super Fine Period (₹1,000) — 1 to 2 hrs after deadline'
                : 'Admin Entry Past Super Fine Cutoff (₹1,000)';

          const lateRows: LateRegistration[] = persistedChestNos.map(cNo => ({
            id: `late-${Date.now()}-${cNo}`,
            item_id: item.item_id,
            college_affl_no: college.affl_no,
            chest_no: cNo,
            late_reason: lateReason,
            fine_tier: fineTier,
            fine_amount: fineAmount,
            effective_deadline: effectiveRegIso,
            registered_at: regTimestampIso,
            created_at: regTimestampIso
          }));

          const existingLate = this.getStorage<LateRegistration[]>('late_registrations', [])
            .filter(r => !(r.item_id === item.item_id && r.college_affl_no === college.affl_no));
          this.setStorage('late_registrations', [...existingLate, ...lateRows]);
        } else {
          const existingLate = this.getStorage<LateRegistration[]>('late_registrations', [])
            .filter(r => !(r.item_id === item.item_id && r.college_affl_no === college.affl_no));
          this.setStorage('late_registrations', existingLate);
        }

        this.broadcastGlobalSync('registrations', { itemId: item.item_id, collegeAfflNo: college.affl_no });
        return { success: true };
      } catch (err: any) {
        console.error('Unexpected registration error:', err);
        return { success: false, error: err.message || 'Unexpected registration error' };
      }
    }

    // Fallback if supabase client not connected
    const regs = this.getStorage<Registration[]>('registrations', []);
    const remaining = regs.filter(r => !(r.item_id === item.item_id && r.college_affl_no === college.affl_no));
    const fallbackNowIso = new Date().toISOString();
    chestNos.forEach(cNo => {
      remaining.push({
        id: `reg-${Date.now()}-${cNo}`,
        item_id: item.item_id,
        college_affl_no: college.affl_no,
        college_id: `col-${college.affl_no}`,
        chest_no: cNo,
        created_at: fallbackNowIso
      });
    });
    this.setStorage('registrations', remaining);
    this.pruneSubmissionsForRoster(item.item_id, college.affl_no, chestNos, item.point_type === 'group' || item.item_type === 'Group');

    const effectiveRegIsoFallback = item.reg_deadline || this.getFestSettings().reg_deadline;
    const tierFallback = evaluateDeadlineTierAtTime(effectiveRegIsoFallback, fallbackNowIso);
    if (tierFallback.tier !== 'open' || college.fine_status || college.manual_lock_override) {
      const fineTier = tierFallback.tier === 'fine' ? 'fine' : tierFallback.tier === 'super_fine' || tierFallback.tier === 'closed' ? 'super_fine' : 'override';
      const fineAmount = tierFallback.tier === 'open' ? 0 : tierFallback.fineAmount;
      const lateReason =
        tierFallback.tier === 'fine'
          ? 'Fine Period (₹500) — within 1 hr of deadline'
          : tierFallback.tier === 'super_fine'
            ? 'Super Fine Period (₹1,000) — 1 to 2 hrs after deadline'
            : tierFallback.tier === 'closed'
              ? 'Admin Entry Past Super Fine Cutoff (₹1,000)'
              : college.fine_status
                ? 'Late Fine Flagged on Institution'
                : 'Admin Lock Override Entry';

      const lateRows: LateRegistration[] = chestNos.map(cNo => ({
        id: `late-${Date.now()}-${cNo}`,
        item_id: item.item_id,
        college_affl_no: college.affl_no,
        chest_no: cNo,
        late_reason: lateReason,
        fine_tier: fineTier,
        fine_amount: fineAmount,
        effective_deadline: effectiveRegIsoFallback,
        registered_at: fallbackNowIso,
        created_at: fallbackNowIso
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
        await this.postServerApi('/api/registrations', {
          action: 'unregister',
          itemId: item.item_id,
          collegeAfflNo: college.affl_no,
        });
      } catch (err: any) {
        console.error('Unexpected unregister error:', err);
        return { success: false, error: err.message || 'Unexpected unregister error' };
      }
    }

    const regs = this.getStorage<Registration[]>('registrations', []);
    const remaining = regs.filter(r => !(Number(r.item_id) === Number(item.item_id) && Number(r.college_affl_no) === Number(college.affl_no)));
    this.setStorage('registrations', remaining);
    const remainingLate = this.getStorage<LateRegistration[]>('late_registrations', [])
      .filter(r => !(Number(r.item_id) === Number(item.item_id) && Number(r.college_affl_no) === Number(college.affl_no)));
    this.setStorage('late_registrations', remainingLate);

    const remainingSubs = this.getStorage<SubmissionEntry[]>('submissions', [])
      .filter(s => !(Number(s.item_id) === Number(item.item_id) && Number(s.college_affl_no) === Number(college.affl_no)));
    this.setStorage('submissions', remainingSubs);

    await this.fetchChestNos();
    this.broadcastGlobalSync('registrations', { itemId: item.item_id, collegeAfflNo: college.affl_no, action: 'unregister' });

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
        this.postServerApi('/api/registrations', {
          action: 'clear_all',
          collegeAfflNo: affl,
        }).catch(err => console.warn('clearAllRegistrations error:', err));
      }
      const lateList = this.getStorage<LateRegistration[]>('late_registrations', []);
      this.setStorage('late_registrations', lateList.filter(l => l.college_affl_no !== affl));
      const subList = this.getStorage<SubmissionEntry[]>('submissions', []);
      this.setStorage('submissions', subList.filter(s => Number(s.college_affl_no) !== affl));
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
        this.postServerApi('/api/registrations', {
          action: 'clear_all',
        }).catch(err => console.warn('clearAllRegistrations error:', err));
      }
      this.setStorage('late_registrations', []);
      this.setStorage('submissions', []);
    }

    this.setStorage('registrations', remaining);
    this.setStorage('registration_logs', logs);
    this.broadcastGlobalSync('registrations', { action: 'clear_all' });
    return { success: true, count: clearedCount };
  }

  // --- Registration Logs ---
  public getRegistrationLogs(collegeAfflNoOrId?: number | string): RegistrationLog[] {
    const logs = this.getStorage<RegistrationLog[]>('registration_logs', []);
    if (!collegeAfflNoOrId) return logs;
    const col = this.getCollege(collegeAfflNoOrId);
    return col ? logs.filter(l => l.college_affl_no === col.affl_no) : logs;
  }

  // --- System Audit Logs ---
  public getSystemAuditLogs(filters?: {
    category?: string;
    severity?: string;
    collegeAfflNo?: number;
    itemId?: number;
    search?: string;
  }): SystemAuditLog[] {
    let logs = this.getStorage<SystemAuditLog[]>('system_audit_logs', []);
    if (!filters) return logs;

    if (filters.category && filters.category !== 'ALL') {
      logs = logs.filter(l => l.category?.toUpperCase() === filters.category?.toUpperCase());
    }
    if (filters.severity && filters.severity !== 'ALL') {
      logs = logs.filter(l => l.severity?.toLowerCase() === filters.severity?.toLowerCase());
    }
    if (filters.collegeAfflNo) {
      logs = logs.filter(l => Number(l.college_affl_no) === Number(filters.collegeAfflNo));
    }
    if (filters.itemId) {
      logs = logs.filter(l => Number(l.item_id) === Number(filters.itemId));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      logs = logs.filter(l =>
        l.description?.toLowerCase().includes(q) ||
        l.action_type?.toLowerCase().includes(q) ||
        l.actor_name?.toLowerCase().includes(q) ||
        (l.target_id && l.target_id.toLowerCase().includes(q))
      );
    }
    return logs;
  }

  public async fetchSystemAuditLogs(limit = 500): Promise<SystemAuditLog[]> {
    if (!supabase) return this.getSystemAuditLogs();
    try {
      const { data, error } = await supabase
        .from('system_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && data) {
        this.setStorage('system_audit_logs', data);
        return data;
      }
    } catch (e) {
      console.warn('fetchSystemAuditLogs notice:', e);
    }
    return this.getSystemAuditLogs();
  }

  public async logSystemEvent(event: {
    action_type: string;
    category: string;
    severity?: 'info' | 'success' | 'warning' | 'danger';
    actor_role?: string;
    actor_name?: string;
    college_affl_no?: number | null;
    item_id?: number | null;
    target_id?: string | null;
    description: string;
    details?: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    const newLog: SystemAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action_type: event.action_type,
      category: event.category,
      severity: event.severity || 'info',
      actor_role: event.actor_role || 'admin',
      actor_name: event.actor_name || 'Admin',
      college_affl_no: event.college_affl_no || null,
      item_id: event.item_id || null,
      target_id: event.target_id || null,
      description: event.description,
      details: event.details || {},
      created_at: new Date().toISOString()
    };

    // Update in-memory storage immediately for optimistic UI
    const current = this.getStorage<SystemAuditLog[]>('system_audit_logs', []);
    this.setStorage('system_audit_logs', [newLog, ...current]);

    if (supabase) {
      try {
        await this.postServerApi('/api/admin/manage', {
          action: 'log_audit',
          log: {
            action_type: newLog.action_type,
            category: newLog.category,
            severity: newLog.severity,
            actor_role: newLog.actor_role,
            actor_name: newLog.actor_name,
            college_affl_no: newLog.college_affl_no,
            item_id: newLog.item_id,
            target_id: newLog.target_id,
            description: newLog.description,
            details: newLog.details
          },
        });
      } catch (err: any) {
        console.warn('Supabase logAudit notice:', err.message);
      }
    }
    return { success: true };
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
        this.setStorage('registrations', regs);

        if (supabase) {
          this.postServerApi('/api/code-letters', {
            action: 'assign_legacy',
            itemId: target.item_id,
            collegeAfflNo: target.college_affl_no,
            codeLetter: letter,
          }).catch(err => console.warn('assignCodeLetter regId error:', err));
        }
      }
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
        this.postServerApi('/api/code-letters', {
          action: 'assign_legacy',
          itemId: itm.item_id,
          collegeAfflNo: col.affl_no,
          codeLetter: letter,
        }).catch(err => console.warn('assignCodeLetter legacy error:', err));
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
          await this.postServerApi('/api/admin/manage', {
            action: 'update_schedule_status',
            itemId: schedules[idx].item_id,
            status,
          });
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
        await this.postServerApi('/api/admin/manage', {
          action: 'save_schedule',
          itemId: numItemId,
          payload: {
            stage_number: numStage,
            starting: data.starting,
            ending: data.ending || null,
            status: statusVal,
          },
        });
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

  private normalizeChestRows(rows: any[]): Array<{ id?: string; cic_no: number | string; chest_no: string; college_affl_no?: number | null; created_at?: string }> {
    return (rows || []).map((row: any) => ({
      ...row,
      chest_no: row?.chest_no !== undefined && row?.chest_no !== null ? String(row.chest_no).trim() : '',
    }));
  }

  public getChestNos(): any[] {
    return this.getStorage('chest_no', []);
  }

  public async fetchChestNos(): Promise<any[]> {
    if (!supabase) return this.getChestNos();
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return this.getChestNos();
      const { data, error } = await supabase
        .from('chest_no')
        .select('*')
        .order('chest_no', { ascending: true });
      if (!error && data) {
        const normalized = this.normalizeChestRows(data);
        this.setStorage('chest_no', normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('Error fetching chest_no mapping from Supabase:', err);
    }
    return this.getChestNos();
  }

  public async allocateNumericChestNumbers(
    onlyRegistered: boolean = true,
    reset: boolean = false
  ): Promise<{
    success: boolean;
    totalAssigned?: number;
    newlyAssigned?: number;
    minChestNo?: number | null;
    maxChestNo?: number | null;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: 'Supabase connection is required for server-side chest number allocation.' };
    }
    try {
      const res = await this.postServerApi<{
        success: boolean;
        totalAssigned?: number;
        newlyAssigned?: number;
        minChestNo?: number | null;
        maxChestNo?: number | null;
      }>('/api/students', {
        action: 'allocate_chest_numbers',
        onlyRegistered,
        reset,
      });
      await this.fetchChestNos();
      return {
        success: true,
        totalAssigned: Number(res.totalAssigned ?? 0),
        newlyAssigned: Number(res.newlyAssigned ?? 0),
        minChestNo: res.minChestNo ?? null,
        maxChestNo: res.maxChestNo ?? null,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Unexpected error allocating chest numbers.' };
    }
  }

  public async fetchCodeLetters(itemId?: number | string): Promise<CodeLetter[]> {
    if (!supabase) return this.getCodeLetters(itemId);
    try {
      let query = supabase.from('code_letters').select('*');
      if (itemId !== undefined && itemId !== null) {
        query = query.eq('item_id', Number(itemId));
      }
      const { data, error } = await query;
      if (!error && data) {
        const normalized: CodeLetter[] = data.map((c: any) => ({
          ...c,
          item_id: Number(c.item_id),
          college_affl_no: Number(c.college_affl_no)
        }));
        if (itemId !== undefined && itemId !== null) {
          const numId = Number(itemId);
          const existing = this.getStorage<CodeLetter[]>('code_letters', []).filter(c => Number(c.item_id) !== numId);
          this.setStorage('code_letters', [...existing, ...normalized]);
        } else {
          this.setStorage('code_letters', normalized);
        }
        return normalized;
      }
    } catch (e) {
      console.warn('Error fetching code letters from Supabase:', e);
    }
    return this.getCodeLetters(itemId);
  }

  public async fetchEventParticipantsData(itemId: number | string): Promise<{
    registrations: Registration[];
    codeLetters: CodeLetter[];
  }> {
    const numItemId = Number(itemId);
    if (!supabase) {
      return {
        registrations: this.getRegistrations().filter(r => Number(r.item_id) === numItemId),
        codeLetters: this.getCodeLetters(numItemId)
      };
    }

    try {
      const client = supabase;

      // 1. Fetch registrations for this event
      const { data: regRows, error: regErr } = await client
        .from('registrations')
        .select('*')
        .eq('item_id', numItemId);

      if (regErr) {
        console.warn('Error fetching event registrations:', regErr.message);
      }

      // 2. Fetch late registrations for this event
      let lateRows: any[] = [];
      try {
        const { data: lateData, error: lateErr } = await client
          .from('late_registrations')
          .select('*')
          .eq('item_id', numItemId);
        if (!lateErr && lateData) {
          lateRows = lateData;
        }
      } catch (e) {
        // late_registrations table optional
      }

      // 3. Fetch code_letters for this event
      const { data: codeRows, error: codeErr } = await client
        .from('code_letters')
        .select('*')
        .eq('item_id', numItemId);

      if (codeErr) {
        console.warn('Error fetching event code letters:', codeErr.message);
      }

      // 3.5. Fetch submission_entries for this event (video / digital links)
      try {
        const { data: subRows, error: subErr } = await client
          .from('submission_entries')
          .select('*')
          .eq('item_id', numItemId);
        if (!subErr && subRows) {
          const normalizedSubs: SubmissionEntry[] = subRows.map((s: Record<string, any>) => ({
            id: s.id,
            college_affl_no: Number(s.college_affl_no),
            chest_no: s.chest_no,
            item_id: Number(s.item_id),
            status: (s.status || 'on_time') as SubmissionStatus,
            file_url: s.file_url || null,
            submitted_at: s.submitted_at || new Date().toISOString()
          }));
          const existingSubs = this.getStorage<SubmissionEntry[]>('submissions', []);
          const otherSubs = existingSubs.filter(s => Number(s.item_id) !== numItemId);
          this.setStorage('submissions', [...otherSubs, ...normalizedSubs]);
        }
      } catch (e) {
        // submission_entries optional
      }

      // 4. Fetch chest_no mapping table (authenticated only)
      let chestMapRows: any[] = [];
      try {
        const { data: sessionData } = await client.auth.getSession();
        if (sessionData?.session) {
          const { data: cData } = await client.from('chest_no').select('*');
          if (cData) {
            chestMapRows = this.normalizeChestRows(cData);
            this.setStorage('chest_no', chestMapRows);
          }
        }
      } catch (e) {
        // chest_no table optional
      }

      // Collect all chest numbers from registrations
      const combinedRegs = [...(regRows || []), ...lateRows];
      const chestNos = Array.from(new Set(combinedRegs.map(r => r.chest_no).filter(Boolean)));

      // 5. Fetch students details for these chest numbers / cic_nos
      let fetchedStudents: Student[] = [];
      if (chestNos.length > 0) {
        const chestSet = new Set(chestNos.map(c => String(c).trim().toUpperCase()));
        const mappedCicNos = chestMapRows
          .filter(c => chestSet.has(String(c.chest_no || '').trim().toUpperCase()) && c.cic_no != null)
          .map(c => Number(c.cic_no))
          .filter(n => Number.isFinite(n));

        const extractedCics = chestNos
          .map(cn => String(cn).trim().replace(/^(ST-|CH-)/i, ''))
          .filter(str => /^\d+$/.test(str))
          .map(str => Number(str))
          .filter(n => Number.isFinite(n));

        const cicLookupKeys = Array.from(new Set([...mappedCicNos, ...extractedCics]));
        if (cicLookupKeys.length > 0) {
          try {
            const { data: stuByCic } = await client
              .from('students')
              .select('id, name, cic_no, college_affl_no, class, phase, phone, photo_url, created_at')
              .in('cic_no', cicLookupKeys);
            if (stuByCic && stuByCic.length > 0) {
              fetchedStudents = [
                ...fetchedStudents,
                ...stuByCic.map((s: Record<string, any>) => this.sanitizeStudentRow(s)),
              ];
            }
          } catch (e) { }
        }

        // Legacy UUID fallback when registrations store students.id
        const uuidKeys = chestNos.filter(cn => isUuid(cn));
        if (uuidKeys.length > 0) {
          try {
            const { data: stuById } = await client
              .from('students')
              .select('id, name, cic_no, college_affl_no, class, phase, phone, photo_url, created_at')
              .in('id', uuidKeys);
            if (stuById && stuById.length > 0) {
              fetchedStudents = [
                ...fetchedStudents,
                ...stuById.map((s: Record<string, any>) => this.sanitizeStudentRow(s)),
              ];
            }
          } catch (e) { }
        }
      }

      // Update in-memory students storage (keyed once per unique student to avoid duplicates)
      if (fetchedStudents.length > 0) {
        const existingStudents = this.getStorage<Student[]>('students', []);
        const studentMap = new Map<string, Student>();
        existingStudents.forEach(s => {
          const key = s.id || (s.cic_no != null ? `cic:${s.cic_no}` : s.chest_no);
          if (key) studentMap.set(String(key), s);
        });
        fetchedStudents.forEach(s => {
          const key = s.id || (s.cic_no != null ? `cic:${s.cic_no}` : s.chest_no);
          if (key) studentMap.set(String(key), s);
        });
        this.setStorage('students', Array.from(studentMap.values()));
      }

      // Format code letters
      const newCodeLetters: CodeLetter[] = (codeRows || []).map((cl: any) => ({
        id: cl.id,
        item_id: Number(cl.item_id),
        college_affl_no: Number(cl.college_affl_no),
        chest_no: cl.chest_no,
        code_letter: cl.code_letter,
        created_at: cl.created_at
      }));

      // Update in-memory code_letters storage
      const storedCodeLetters = this.getStorage<CodeLetter[]>('code_letters', []);
      const otherCodeLetters = storedCodeLetters.filter(cl => Number(cl.item_id) !== numItemId);
      this.setStorage('code_letters', [...otherCodeLetters, ...newCodeLetters]);

      // Map code letters to registrations
      const codeLetterMap = new Map<string, string>();
      newCodeLetters.forEach(cl => {
        if (cl.chest_no && cl.code_letter) {
          codeLetterMap.set(cl.chest_no.trim().toUpperCase(), cl.code_letter.trim());
        }
      });

      const normalizedRegs: Registration[] = combinedRegs.map((r: any) => {
        const cleanChest = (r.chest_no || '').trim().toUpperCase();
        const activeLetter = codeLetterMap.get(cleanChest) || r.code_letter || null;
        return {
          ...r,
          id: r.id || `reg-${numItemId}-${r.chest_no}`,
          item_id: numItemId,
          college_affl_no: Number(r.college_affl_no),
          chest_no: r.chest_no,
          code_letter: activeLetter
        };
      });

      // Update in-memory registrations storage
      const existingRegs = this.getStorage<Registration[]>('registrations', []);
      const otherItemRegs = existingRegs.filter(r => Number(r.item_id) !== numItemId);
      this.setStorage('registrations', [...otherItemRegs, ...normalizedRegs]);

      return {
        registrations: normalizedRegs,
        codeLetters: newCodeLetters
      };
    } catch (err) {
      console.error('Failed to fetch event participants data:', err);
      return {
        registrations: this.getRegistrations().filter(r => Number(r.item_id) === numItemId),
        codeLetters: this.getCodeLetters(numItemId)
      };
    }
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
   * One-time allocation: strictly prevents re-rolls or duplicate assignments.
   */
  public async assignRandomCodeLetter(
    itemId: number,
    collegeAfflNo: number,
    chestNo: string
  ): Promise<{ success: boolean; codeLetter?: string; error?: string }> {
    const numItemId = Number(itemId);
    const numAffl = Number(collegeAfflNo);
    const cleanChestNo = chestNo.trim().toUpperCase();

    // 0. Check if this participant already has a code letter assigned (One-time only rule)
    const existingCodeLetters = this.getStorage<CodeLetter[]>('code_letters', []);
    const alreadyAssigned = existingCodeLetters.find(
      cl => Number(cl.item_id) === numItemId && (cl.chest_no || '').trim().toUpperCase() === cleanChestNo
    );
    if (alreadyAssigned && alreadyAssigned.code_letter) {
      return { success: true, codeLetter: alreadyAssigned.code_letter };
    }

    const regs = this.getStorage<Registration[]>('registrations', []);
    const itemRegs = regs.filter(r => Number(r.item_id) === numItemId);

    if (itemRegs.length === 0) {
      return { success: false, error: 'No participants registered for this event.' };
    }

    const targetItem = this.getItems().find(i => Number(i.item_id) === numItemId);
    const screeningActive = Boolean(targetItem && isScreeningEvent(targetItem));
    const qualifiedRegs = screeningActive
      ? itemRegs.filter(r => r.screening_status === 'qualified')
      : itemRegs;
    const poolRegs = qualifiedRegs.length > 0 ? qualifiedRegs : itemRegs;

    // Determine the full alphabet pool starting from A up to active participants count
    const poolSize = Math.max(poolRegs.length, 1);
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
    existingCodeLetters.forEach(cl => {
      const isOther = (cl.chest_no || '').trim().toUpperCase() !== cleanChestNo;
      if (Number(cl.item_id) === numItemId && isOther && cl.code_letter) {
        usedLetters.add(cl.code_letter.trim().toUpperCase());
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
    const remainingCodeLetters = existingCodeLetters.filter(
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

    // 3. Persist to Supabase via server API if connected
    if (supabase) {
      try {
        await this.postServerApi('/api/code-letters', {
          action: 'assign',
          itemId: numItemId,
          collegeAfflNo: numAffl,
          chestNo: cleanChestNo,
          codeLetter: randomLetter,
        });
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
        await this.postServerApi('/api/code-letters', {
          action: 'randomize_all',
          itemId: numItemId,
          entries: codeLetterInserts,
        });
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
        await this.postServerApi('/api/code-letters', {
          action: 'remove',
          itemId: numItemId,
          chestNo: cleanChestNo,
        });
      } catch (err: any) {
        console.warn('Supabase removeCodeLetter notice:', err.message);
      }
    }

    return { success: true };
  }

  // --- Points Matrix & Auto Calculation ---
  public getPointsMatrix(): any[] {
    return this.getStorage<any[]>('points_matrix', []);
  }

  public async fetchPointsMatrix(): Promise<any[]> {
    if (!supabase) return this.getPointsMatrix();
    try {
      const { data, error } = await supabase.from('points_matrix').select('*');
      if (!error && data) {
        this.setStorage('points_matrix', data);
        return data;
      }
    } catch (e) {
      console.warn('Error fetching points matrix:', e);
    }
    return this.getPointsMatrix();
  }

  public calculatePoints(phase?: string, category?: string, grade?: string, rank?: number | null, tabulation?: boolean): number {
    if (tabulation === false || (category || '').trim().toUpperCase() === 'D') {
      return 0;
    }
    const matrix = this.getStorage<any[]>('points_matrix', []);
    const normGrade = (grade || '').trim().toUpperCase();
    const numRank = rank ? Number(rank) : null;

    if (matrix && matrix.length > 0) {
      const targetPhaseKey = phase ? normalizeCategoryKey(phase) : '';
      const phaseMatches = (matrixPhase?: string | null) => {
        if (!targetPhaseKey || !matrixPhase) return true;
        return normalizeCategoryKey(matrixPhase) === targetPhaseKey;
      };

      const exactMatch = matrix.find(m => {
        const matchPhase = phaseMatches(m.phase);
        const matchCat = !category || !m.category || m.category.toUpperCase() === category.toUpperCase();
        const matchRank = numRank ? Number(m.rank) === numRank : (!m.rank || m.rank === 0);
        const matchGrade = normGrade ? (m.grade || '').toUpperCase() === normGrade : (!m.grade);
        return matchPhase && matchCat && matchRank && matchGrade;
      });
      if (exactMatch && exactMatch.points !== undefined) {
        return Number(exactMatch.points);
      }

      // Match by rank
      if (numRank) {
        const rankMatch = matrix.find(m => {
          const matchPhase = phaseMatches(m.phase);
          const matchCat = !category || !m.category || m.category.toUpperCase() === category.toUpperCase();
          return matchPhase && matchCat && Number(m.rank) === numRank;
        });
        if (rankMatch && rankMatch.points !== undefined) {
          return Number(rankMatch.points);
        }
      }

      // Match by grade
      if (normGrade) {
        const gradeMatch = matrix.find(m => {
          const matchPhase = phaseMatches(m.phase);
          const matchCat = !category || !m.category || m.category.toUpperCase() === category.toUpperCase();
          return matchPhase && matchCat && (m.grade || '').toUpperCase() === normGrade;
        });
        if (gradeMatch && gradeMatch.points !== undefined) {
          return Number(gradeMatch.points);
        }
      }
    }

    // Default Arts Fest Points Matrix Logic:
    let rankPts = 0;
    if (numRank === 1) rankPts = 5;
    else if (numRank === 2) rankPts = 3;
    else if (numRank === 3) rankPts = 1;

    let gradePts = 0;
    if (normGrade === 'A+' || normGrade === 'A') gradePts = 5;
    else if (normGrade === 'B') gradePts = 3;
    else if (normGrade === 'C') gradePts = 1;

    if (numRank && rankPts > 0) {
      return rankPts;
    }
    return gradePts;
  }

  // --- Live Results Fetch & Deduplication ---
  public async fetchResults(itemId?: number | string): Promise<Result[]> {
    if (!supabase) return this.getResults();
    try {
      let query = supabase.from('results').select('*');
      if (itemId !== undefined && itemId !== null) {
        query = query.eq('item_id', Number(itemId));
      }
      const { data, error } = await query;
      if (!error && data) {
        const normalized = data.map((r: any) => ({
          ...r,
          item_id: Number(r.item_id),
          college_affl_no: r.college_affl_no ? Number(r.college_affl_no) : null,
          mark_percentage: r.mark_percentage !== null ? Number(r.mark_percentage) : null,
          rank: r.rank !== null ? Number(r.rank) : null,
          points: r.points !== null ? Number(r.points) : 0,
          published: Boolean(r.published)
        }));

        // Deduplicate rows for the same participant/event
        const dedupedMap = new Map<string, Result>();
        for (const res of normalized) {
          const cleanChest = (res.chest_no || '').trim().toUpperCase();
          const cleanCode = (res.code_letter || '').trim().toUpperCase();
          const key = cleanChest ? `${res.item_id}:chest:${cleanChest}` : `${res.item_id}:code:${cleanCode}`;
          dedupedMap.set(key, res);
        }
        const clean = Array.from(dedupedMap.values());

        if (itemId !== undefined && itemId !== null) {
          const numId = Number(itemId);
          const existing = this.getStorage<Result[]>('results', []).filter(r => Number(r.item_id) !== numId);
          this.setStorage('results', [...existing, ...clean]);
        } else {
          this.setStorage('results', clean);
        }
        return this.getResults();
      }
    } catch (e) {
      console.warn('Error fetching results:', e);
    }
    return this.getResults();
  }

  // --- Result Entry & Scoring ---
  public getResults(): Result[] {
    const rawResults = this.getStorage<Result[]>('results', []);
    const items = this.getItems();
    const colleges = this.getColleges();
    const students = this.getStudents();
    const registrations = this.getRegistrations();

    // Deduplicate by item_id and chest_no / code_letter to prevent any repeated data
    const dedupedMap = new Map<string, Result>();
    for (const res of rawResults) {
      const cleanChest = (res.chest_no || '').trim().toUpperCase();
      const cleanCode = (res.code_letter || '').trim().toUpperCase();
      const key = cleanChest ? `${res.item_id}:chest:${cleanChest}` : `${res.item_id}:code:${cleanCode}`;
      dedupedMap.set(key, res);
    }
    const cleanResults = Array.from(dedupedMap.values());

    return cleanResults.map(res => {
      const itm = items.find(i => Number(i.item_id) === Number(res.item_id));
      const col = colleges.find(c => Number(c.affl_no) === Number(res.college_affl_no));
      const stu = findStudentByIdentifier(students, res.chest_no, res.college_affl_no || undefined);
      const resolvedChest = stu ? getCanonicalChestNo(stu) : '';
      const chestNo = resolvedChest && resolvedChest !== '—' ? resolvedChest : res.chest_no;
      const itemResults = cleanResults.filter(r => Number(r.item_id) === Number(res.item_id));
      const first = itemResults.find(r => Number(r.rank) === 1);
      const second = itemResults.find(r => Number(r.rank) === 2);
      const third = itemResults.find(r => Number(r.rank) === 3);

      return {
        ...res,
        chest_no: chestNo,
        item: itm,
        college: col,
        student: stu,
        first_reg: first ? registrations.find(r => Number(r.item_id) === Number(res.item_id) && Number(r.college_affl_no) === Number(first.college_affl_no)) : null,
        second_reg: second ? registrations.find(r => Number(r.item_id) === Number(res.item_id) && Number(r.college_affl_no) === Number(second.college_affl_no)) : null,
        third_reg: third ? registrations.find(r => Number(r.item_id) === Number(res.item_id) && Number(r.college_affl_no) === Number(third.college_affl_no)) : null,
        scores_breakdown: itemResults.map(r => ({
          code_letter: r.code_letter || '',
          criteria_a: Math.round((Number(r.mark_percentage) || 75) * 0.4),
          criteria_b: Math.round((Number(r.mark_percentage) || 75) * 0.4),
          criteria_c: Math.round((Number(r.mark_percentage) || 75) * 0.2),
          total: Number(r.mark_percentage) || 75
        }))
      };
    });
  }

  /**
   * Returns aggregated distinct results by event (one summary row per event that has results entered).
   * This ensures published results registry never repeats rows!
   */
  public getAggregatedEventResults(): Array<{
    item_id: number;
    item: Item | undefined;
    results: Result[];
    first: Result | undefined;
    second: Result | undefined;
    third: Result | undefined;
    is_published: boolean;
    total_scored: number;
  }> {
    const allResults = this.getResults();
    const items = this.getItems();
    const itemMap = new Map<number, Result[]>();

    for (const r of allResults) {
      const numId = Number(r.item_id);
      const list = itemMap.get(numId) || [];
      list.push(r);
      itemMap.set(numId, list);
    }

    const aggregated: any[] = [];
    itemMap.forEach((resList, itmId) => {
      const itm = items.find(i => Number(i.item_id) === itmId);
      const sorted = [...resList].sort((a, b) => {
        if (a.rank && b.rank) return Number(a.rank) - Number(b.rank);
        return (Number(b.mark_percentage) || 0) - (Number(a.mark_percentage) || 0);
      });
      const first = sorted.find(r => Number(r.rank) === 1) || sorted[0];
      const second = sorted.find(r => Number(r.rank) === 2) || sorted[1];
      const third = sorted.find(r => Number(r.rank) === 3) || sorted[2];
      const isPublished = sorted.some(r => Boolean(r.published));

      aggregated.push({
        item_id: itmId,
        item: itm,
        results: sorted,
        first,
        second,
        third,
        is_published: isPublished,
        total_scored: sorted.length
      });
    });

    return aggregated.sort((a, b) => (a.item?.item_code || '').localeCompare(b.item?.item_code || ''));
  }

  public async submitResultEntry(
    itemIdOrCode: number | string,
    scores: Array<{
      code_letter: string;
      college_affl_no?: number;
      chest_no?: string;
      mark_percentage?: number;
      total?: number;
      grade?: string;
      rank?: number | null;
      points?: number;
    }>
  ): Promise<{ success: boolean; error?: string }> {
    const itm = this.getItem(itemIdOrCode);
    const itemId = itm ? itm.item_id : Number(itemIdOrCode);
    const numItemId = Number(itemId);

    // 1. Resolve student and college details from code_letters / registrations
    const codeLetters = this.getCodeLetters(numItemId);
    const regs = this.getRegistrations().filter(r => Number(r.item_id) === numItemId);

    const sorted = [...scores].sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      return (b.mark_percentage || b.total || 0) - (a.mark_percentage || a.total || 0);
    });

    // Clean deduplicated entries
    const newResults: Result[] = [];
    const seenCodes = new Set<string>();

    for (let index = 0; index < sorted.length; index++) {
      const s = sorted[index];
      const cleanCode = (s.code_letter || '').trim().toUpperCase();
      if (!cleanCode || seenCodes.has(cleanCode)) continue;
      seenCodes.add(cleanCode);

      // Match registration or code_letter entry
      const matchingCodeLetter = codeLetters.find(cl => (cl.code_letter || '').trim().toUpperCase() === cleanCode);
      const matchingReg = regs.find(r => {
        const rCode = (r.code_letter || '').trim().toUpperCase();
        if (rCode && rCode === cleanCode) return true;
        if (matchingCodeLetter && (r.chest_no || '').trim().toUpperCase() === (matchingCodeLetter.chest_no || '').trim().toUpperCase()) return true;
        return false;
      });

      const cleanChest = s.chest_no || matchingCodeLetter?.chest_no || matchingReg?.chest_no || null;
      let afflNo = s.college_affl_no || matchingCodeLetter?.college_affl_no || matchingReg?.college_affl_no || null;
      if (!afflNo && cleanChest) {
        const stu = findStudentByIdentifier(this.getStudents(), cleanChest);
        if (stu && stu.college_affl_no) {
          afflNo = Number(stu.college_affl_no);
        }
      }

      const marks = s.mark_percentage !== undefined ? s.mark_percentage : (s.total !== undefined ? s.total : 75);
      const calculatedGrade = s.grade || (marks >= 90 ? 'A+' : marks >= 80 ? 'A' : marks >= 70 ? 'B' : 'C');
      const calculatedRank = s.rank !== undefined ? s.rank : (index < 3 ? index + 1 : null);
      const calculatedPoints = isNonTabulationEvent(itm)
        ? 0
        : (s.points !== undefined ? s.points : this.calculatePoints(itm?.phase, itm?.category, calculatedGrade, calculatedRank, itm?.tabulation));

      newResults.push({
        id: `res-${numItemId}-${cleanCode}`,
        item_id: numItemId,
        code_letter: cleanCode,
        college_affl_no: afflNo,
        chest_no: cleanChest,
        mark_percentage: marks,
        grade: calculatedGrade,
        rank: calculatedRank as any,
        points: calculatedPoints,
        published: false,
        best_in_fest: calculatedRank === 1 && marks >= 95,
        created_at: new Date().toISOString()
      });
    }

    // 2. Persist to Supabase via server API
    if (supabase) {
      try {
        const dbPayloads = newResults.map(r => ({
          item_id: numItemId,
          code_letter: r.code_letter,
          college_affl_no: r.college_affl_no,
          chest_no: r.chest_no,
          mark_percentage: r.mark_percentage,
          grade: r.grade,
          rank: r.rank,
          points: r.points,
          published: r.published || false,
          best_in_fest: r.best_in_fest || false
        }));

        await this.postServerApi('/api/results', {
          action: 'submit',
          itemId: numItemId,
          results: dbPayloads,
        });
      } catch (err: any) {
        console.error('Supabase results sync error:', err.message);
        return { success: false, error: err.message };
      }
    }

    // 3. Update in-memory storage
    const existingResults = this.getStorage<Result[]>('results', []);
    const otherResults = existingResults.filter(r => Number(r.item_id) !== numItemId);
    const merged = [...otherResults, ...newResults];
    this.setStorage('results', merged);
    this.broadcastGlobalSync('results', { itemId: numItemId });

    return { success: true };
  }

  public async publishResult(itemIdOrCode: number | string, publish: boolean = true): Promise<boolean> {
    const itm = this.getItem(itemIdOrCode);
    const itemId = itm ? itm.item_id : Number(itemIdOrCode);
    const numItemId = Number(itemId);
    if (!numItemId || isNaN(numItemId)) return false;

    if (supabase) {
      try {
        await this.postServerApi('/api/results', {
          action: 'publish',
          itemId: numItemId,
          publish,
        });
      } catch (err: any) {
        console.warn('Supabase publishResult notice:', err.message);
      }
    }

    const results = this.getStorage<Result[]>('results', []);
    results.forEach(r => {
      if (Number(r.item_id) === numItemId) {
        r.published = publish;
      }
    });
    this.setStorage('results', results);
    this.broadcastGlobalSync('results', { itemId: numItemId, publish });
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
      const student = a.chest_no
        ? findStudentByIdentifier(students, a.chest_no, a.college_affl_no || undefined) || null
        : null;

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
        await this.postServerApi('/api/submissions', {
          action: 'submit_appeal',
          payload: dbPayload,
        });
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error submitting appeal' };
      }
    }

    appeals.push(newAppeal);
    this.setStorage('appeals', appeals);
    this.broadcastGlobalSync('appeals', { appealId: newAppeal.id });
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
      this.broadcastGlobalSync('appeals', { appealId, status });
      if (supabase) {
        this.postServerApi('/api/submissions', {
          action: 'review_appeal',
          appealId,
          status,
          remarks,
        }).catch(err => console.warn('reviewAppeal error:', err));
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
      const matched = registrations.find(r => r.id === registrationId || (orig && registrationContainsStudent(r, orig)));
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

    let data: any;
    try {
      const res = await this.postServerApi<{ success: boolean; data?: any }>('/api/submissions', {
        action: 'submit_replacement',
        payload: {
          registration_id: isUuid(targetRegId) ? targetRegId : null,
          original_student_id: origUuid,
          replacement_student_id: repUuid,
          reason,
          status: 'Pending'
        },
      });
      data = res.data;
    } catch (err: any) {
      console.error('❌ Supabase submitReplacement error:', err.message);
      return { success: false, error: err.message };
    }

    const fullRep: Replacement = {
      ...data,
      original_student: orig,
      replacement_student: rep,
      registration: registrations.find(r => r.id === data.registration_id)
    };
    list.unshift(fullRep);
    this.setStorage('replacements', list);
    this.broadcastGlobalSync('replacements', { repId: fullRep.id });
    return { success: true, replacement: fullRep };
  }

  public async reviewReplacement(repId: string, status: AppealStatus): Promise<{ success: boolean; error?: string }> {
    if (supabase) {
      try {
        await this.postServerApi('/api/submissions', {
          action: 'review_replacement',
          repId,
          status,
        });
      } catch (err: any) {
        console.error('❌ Supabase review_replacement_tx error:', err.message);
        return { success: false, error: err.message };
      }

      // Re-fetch chest numbers, registrations & replacements to sync live state
      await Promise.all([
        this.syncWithSupabase(undefined, true),
        this.fetchRegistrationsForCollege(),
        this.fetchChestNos()
      ]);
      this.broadcastGlobalSync('replacements', { repId, status });
      return { success: true };
    }

    // Fallback if client not connected
    const list = this.getStorage<Replacement[]>('replacements', []);
    const idx = list.findIndex(r => r.id === repId);
    if (idx >= 0) {
      list[idx].status = status;
      this.setStorage('replacements', list);
      this.broadcastGlobalSync('replacements', { repId, status });
      return { success: true };
    }
    return { success: false, error: 'Replacement not found' };
  }

  // --- Submissions & Pre-Fest Screening ---
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
    const numAffl = !isNaN(Number(collegeAfflNoOrId)) ? Number(collegeAfflNoOrId) : undefined;
    const targetAffl = col ? col.affl_no : (numAffl && numAffl > 0 ? numAffl : undefined);
    return targetAffl ? enriched.filter(s => Number(s.college_affl_no) === targetAffl) : enriched;
  }

  public async fetchSubmissionEntries(collegeAfflNo?: number): Promise<SubmissionEntry[]> {
    if (supabase) {
      try {
        let q = supabase.from('submission_entries').select('*');
        if (collegeAfflNo) q = q.eq('college_affl_no', collegeAfflNo);
        const { data, error } = await q;
        if (!error && data) {
          const normalized: SubmissionEntry[] = data.map((s: Record<string, any>) => ({
            id: s.id,
            college_affl_no: Number(s.college_affl_no),
            chest_no: s.chest_no,
            item_id: Number(s.item_id),
            status: (s.status || 'on_time') as SubmissionStatus,
            file_url: s.file_url || null,
            submitted_at: s.submitted_at || new Date().toISOString()
          }));
          if (collegeAfflNo) {
            const existing = this.getStorage<SubmissionEntry[]>('submissions', []);
            const other = existing.filter(s => Number(s.college_affl_no) !== Number(collegeAfflNo));
            this.setStorage('submissions', [...other, ...normalized]);
          } else {
            this.setStorage('submissions', normalized);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch submission_entries:', err);
      }
    }
    return this.getSubmissionEntries(collegeAfflNo);
  }

  private pruneSubmissionsForRoster(
    itemId: number,
    collegeAfflNo: number,
    newChestNos: string[],
    isGroupEvent: boolean
  ): void {
    const allowedSet = new Set(newChestNos.map(c => c.trim().toUpperCase()).filter(Boolean));
    const subs = this.getStorage<SubmissionEntry[]>('submissions', []);
    const students = this.getStudents(collegeAfflNo);

    const next = subs.filter(s => {
      if (Number(s.item_id) !== Number(itemId) || Number(s.college_affl_no) !== Number(collegeAfflNo)) {
        return true;
      }
      if (allowedSet.size === 0) return false;
      if (isGroupEvent) return true;
      const stu = findStudentByIdentifier(students, s.chest_no, collegeAfflNo);
      const canonical = stu ? getCanonicalChestNo(stu).toUpperCase() : '';
      const regKey = stu ? getRegistrationStudentKey(stu).toUpperCase() : '';
      const raw = (s.chest_no || '').trim().toUpperCase();
      return (
        allowedSet.has(raw) ||
        (canonical && canonical !== '—' ? allowedSet.has(canonical) : false) ||
        (regKey ? allowedSet.has(regKey) : false)
      );
    });
    this.setStorage('submissions', next);
  }

  public async submitEntryLink(params: {
    collegeAfflNo: number;
    chestNo: string;
    itemId: number;
    fileUrl: string;
  }): Promise<{ success: boolean; entry?: SubmissionEntry; error?: string }> {
    const trimmedUrl = (params.fileUrl || '').trim();
    if (!trimmedUrl || !/^https?:\/\/\S+/i.test(trimmedUrl)) {
      return { success: false, error: 'Please enter a valid http:// or https:// video or file link.' };
    }

    const numItemId = Number(params.itemId);
    const numAffl = Number(params.collegeAfflNo);
    const cleanChest = (params.chestNo || '').trim();
    if (!cleanChest || !numItemId || !numAffl) {
      return { success: false, error: 'Missing participant or event information for submission.' };
    }

    const item = this.getItems().find(i => Number(i.item_id) === numItemId);
    if (!item || !requiresPreFestSubmission(item)) {
      return { success: false, error: 'This event does not require a pre-fest submission link.' };
    }

    // ─── Link Submission Deadline Guard (for screening events) ───────────
    const kind = getEventKind(item);
    if (kind === 'screening') {
      const dlSetting = this.getEventDeadlineSetting('screening');
      const linkEval = evaluateLinkSubmissionDeadline(dlSetting);
      if (!linkEval.canSubmitLink) {
        return {
          success: false,
          error: `Link submission is closed: ${linkEval.timeRemainingText}. The link submission deadline was ${dlSetting.link_submission_deadline ? formatIstDisplay(dlSetting.link_submission_deadline) : formatIstDisplay(dlSetting.fine_deadline)}.`,
        };
      }
    }

    const collegeRegs = this.getRegistrations(numAffl).filter(r => Number(r.item_id) === numItemId);
    if (collegeRegs.length === 0) {
      return { success: false, error: 'Please register your participant(s) for this event before submitting a link.' };
    }

    let collegeStudents = this.getStudents(numAffl);
    if (collegeStudents.length === 0 && supabase) {
      collegeStudents = await this.fetchStudentsForCollege(numAffl);
    }
    const matchedStudent = findStudentByIdentifier(collegeStudents, cleanChest, numAffl);
    const matchedReg = collegeRegs.find(r => {
      if (matchedStudent && registrationContainsStudent(r, matchedStudent)) return true;
      return (r.chest_no || '').trim().toUpperCase() === cleanChest.toUpperCase();
    });
    if (!matchedReg) {
      return { success: false, error: 'Selected participant is not registered for this event.' };
    }

    // Resolve unified 101+ chest number cleanly for submission_entries(item_id, chest_no)
    const rawStoredReg = this.getStorage<Registration[]>('registrations', []).find(
      r =>
        Number(r.item_id) === numItemId &&
        Number(r.college_affl_no) === numAffl &&
        (r.id === matchedReg.id || registrationContainsStudent(r, matchedStudent || matchedReg.chest_no))
    );
    const stuChestStr = String(matchedStudent?.chest_no ?? '').trim();
    const regChestStr = String(matchedReg.chest_no ?? '').trim();
    const dbChestNo = String(
      (/^\d+$/.test(stuChestStr) ? stuChestStr : undefined) ||
      (/^\d+$/.test(regChestStr) ? regChestStr : undefined) ||
      rawStoredReg?.chest_no ||
      (matchedStudent ? getRegistrationStudentKey(matchedStudent) : undefined) ||
      matchedReg.chest_no ||
      cleanChest
    ).trim();
    const isGroupEvent = item.point_type === 'group' || item.item_type === 'Group';
    const settings = this.getFestSettings();
    const regDeadline = item.reg_deadline || settings.reg_deadline;
    const fineDeadline = computeDeadlineSchedule(regDeadline)?.superFineEndIso || item.fine_deadline || settings.fine_deadline;
    const nowMs = Date.now();
    let status: SubmissionStatus = 'on_time';
    if (fineDeadline && nowMs > new Date(fineDeadline).getTime()) {
      status = 'late';
    } else if (regDeadline && nowMs > new Date(regDeadline).getTime()) {
      status = 'fine';
    }

    const nowIso = new Date().toISOString();

    if (supabase) {
      try {
        const res = await this.postServerApi<{ success: boolean; data?: any }>('/api/submissions', {
          action: 'upsert_entry_link',
          collegeAfflNo: numAffl,
          itemId: numItemId,
          chestNo: dbChestNo,
          status,
          fileUrl: trimmedUrl,
          nowIso,
          isGroupEvent,
        });
        const data = res.data;

        if (data) {

          const entry: SubmissionEntry = {
            id: data.id,
            college_affl_no: Number(data.college_affl_no),
            chest_no: data.chest_no,
            item_id: Number(data.item_id),
            status: (data.status || status) as SubmissionStatus,
            file_url: data.file_url,
            submitted_at: data.submitted_at || nowIso
          };
          const list = this.getStorage<SubmissionEntry[]>('submissions', []);
          const next = list.filter(s => {
            if (Number(s.item_id) !== numItemId) return true;
            if (isGroupEvent && Number(s.college_affl_no) === numAffl) return false;
            const sChest = (s.chest_no || '').trim().toUpperCase();
            return sChest !== cleanChest.toUpperCase() && sChest !== dbChestNo.toUpperCase();
          });
          next.push(entry);
          this.setStorage('submissions', next);
          await this.logSystemEvent({
            action_type: 'SUBMISSION_LINK_SAVED',
            category: 'REGISTRATION',
            severity: 'info',
            actor_role: 'college',
            college_affl_no: numAffl,
            item_id: numItemId,
            description: `Saved submission/screening link for ${item.item_code || numItemId} (${dbChestNo})`,
            details: { chest_no: dbChestNo, status: entry.status }
          });
          return { success: true, entry };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to save submission link' };
      }
    }

    const localEntry: SubmissionEntry = {
      id: `sub-${numItemId}-${dbChestNo}`,
      college_affl_no: numAffl,
      chest_no: dbChestNo,
      item_id: numItemId,
      status,
      file_url: trimmedUrl,
      submitted_at: nowIso
    };
    const list = this.getStorage<SubmissionEntry[]>('submissions', []);
    const next = list.filter(s => {
      if (Number(s.item_id) !== numItemId) return true;
      if (isGroupEvent && Number(s.college_affl_no) === numAffl) return false;
      const sChest = (s.chest_no || '').trim().toUpperCase();
      return sChest !== cleanChest.toUpperCase() && sChest !== dbChestNo.toUpperCase();
    });
    next.push(localEntry);
    this.setStorage('submissions', next);
    return { success: true, entry: localEntry };
  }

  public async updateScreeningStatus(params: {
    registrationIds: string[];
    itemId: number;
    status: ScreeningStatus;
    remarks?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const ids = (params.registrationIds || []).filter(Boolean);
    if (ids.length === 0) {
      return { success: false, error: 'No registration records selected for screening update.' };
    }

    const nowIso = new Date().toISOString();
    const remarks = params.remarks !== undefined ? (params.remarks.trim() || null) : undefined;

    if (supabase) {
      try {
        await this.postServerApi('/api/registrations', {
          action: 'update_screening',
          ids,
          status: params.status,
          remarks,
          nowIso,
        });
      } catch (err: any) {
        return { success: false, error: err?.message || 'Database error updating screening status' };
      }
    }

    const regs = this.getStorage<Registration[]>('registrations', []);
    const idSet = new Set(ids);
    const updatedRegs = regs.map(r => {
      if (!idSet.has(r.id)) return r;
      return {
        ...r,
        screening_status: params.status,
        screening_updated_at: nowIso,
        ...(remarks !== undefined ? { screening_remarks: remarks } : {})
      };
    });
    this.setStorage('registrations', updatedRegs);

    const item = this.getItems().find(i => Number(i.item_id) === Number(params.itemId));
    await this.logSystemEvent({
      action_type: 'SCREENING_SHORTLIST',
      category: 'REGISTRATION',
      severity: params.status === 'qualified' ? 'success' : params.status === 'eliminated' ? 'warning' : 'info',
      actor_role: 'admin',
      item_id: Number(params.itemId),
      description: `Marked ${ids.length} participant row(s) as "${params.status}" for ${item?.item_code || params.itemId} (${item?.name_eng || 'Screening Event'})`,
      details: { registration_ids: ids, screening_status: params.status, screening_remarks: remarks || null }
    });

    return { success: true };
  }

  // --- Leaderboard & Trophy Standings (Server-Side Computed) ---
  public async fetchServerLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      if (this.isClient) {
        const res = await fetch('/api/leaderboard', {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            this.setStorage('leaderboard', json.data);
            return json.data;
          }
        }
      }
    } catch (err) {
      console.warn('[festService] fetchServerLeaderboard API fallback:', err);
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('fest_leaderboard')
          .select('*')
          .order('rank', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          const colleges = this.getColleges();
          const formatted: LeaderboardEntry[] = data.map(row => {
            const matchedCol = colleges.find(c => Number(c.affl_no) === Number(row.affl_no));
            return {
              rank: Number(row.rank),
              college: matchedCol || ({
                id: row.college_id || `col-${row.affl_no}`,
                affl_no: Number(row.affl_no),
                affiliation_no: String(row.affl_no),
                name: row.college_name || '',
                short_name: row.college_short_name || '',
                code: row.college_short_name || '',
                type: row.college_type || 'wafy',
                st_foundation: 0,
                st_thamheediya: 0,
                st_aliya: 0,
                manual_lock_override: false,
              } as College),
              points: Number(row.points) || 0,
              gold: Number(row.gold) || 0,
              silver: Number(row.silver) || 0,
              bronze: Number(row.bronze) || 0,
              total_medals: Number(row.total_medals) || 0,
            };
          });
          this.setStorage('leaderboard', formatted);
          return formatted;
        }
      } catch (e) {
        console.warn('[festService] fetchServerLeaderboard View fallback:', e);
      }
    }

    return this.getLeaderboard();
  }

  public getLeaderboard(): LeaderboardEntry[] {
    const cached = this.getStorage<LeaderboardEntry[]>('leaderboard', []);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Offline / fallback calculation if server response is not yet cached
    const colleges = this.getColleges();
    const results = this.getResults().filter(r => r.published);
    const itemsById = new Map<number, Item>(this.getItems().map(i => [Number(i.item_id), i]));

    const standingsMap = new Map<number, { gold: number; silver: number; bronze: number; points: number }>();
    colleges.forEach(c => standingsMap.set(c.affl_no, { gold: 0, silver: 0, bronze: 0, points: 0 }));

    results.forEach(res => {
      if (res.college_affl_no) {
        const curr = standingsMap.get(res.college_affl_no);
        if (curr) {
          const itm = res.item_id != null ? itemsById.get(Number(res.item_id)) : undefined;
          curr.points += isNonTabulationEvent(itm) ? 0 : (res.points || 0);
          if (res.rank === 1) curr.gold += 1;
          else if (res.rank === 2) curr.silver += 1;
          else if (res.rank === 3) curr.bronze += 1;
        }
      }
    });

    const list = colleges
      .map(c => ({
        college: c,
        ...(standingsMap.get(c.affl_no) || { gold: 0, silver: 0, bronze: 0, points: 0 })
      }))
      .sort((a, b) => b.points - a.points || b.gold - a.gold);

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      total_medals: item.gold + item.silver + item.bronze,
    }));
  }

  // --- Volunteers (Aliya & PG) ---
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
      } catch (e) { }
    }

    if (supabase) {
      try {
        const bcChannel = supabase.channel('fest_realtime_sync');
        bcChannel.send({
          type: 'broadcast',
          event: 'volunteer_change',
          payload: { timestamp: Date.now() }
        }).catch(() => { });
      } catch (e) { }
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
      } catch (e) { }
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
            } catch (e) { }
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
            } catch (e) { }
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
          const res = await this.postServerApi<{ success: boolean; data?: any }>('/api/volunteers', {
            action: 'register',
            payload,
          });
          if (res.data) {
            newVol.id = res.data.id;
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
      } catch (e) { }
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
      } catch (e) { }
    }

    if (supabase && isUuid(volunteerId)) {
      try {
        await this.postServerApi('/api/volunteers', {
          action: 'update',
          volunteerId,
          updates: {
            duty_preference: updatedVol.duty_preference,
            phone: updatedVol.phone,
            tshirt_size: updatedVol.tshirt_size,
            status: updatedVol.status,
            notes: updatedVol.notes,
            updated_at: updatedVol.updated_at
          },
        });
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
      } catch (e) { }
    }

    if (supabase) {
      try {
        if (isUuid(volunteerIdOrStudentId)) {
          await this.postServerApi('/api/volunteers', {
            action: 'delete',
            idOrStudentId: volunteerIdOrStudentId,
          });
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
      } catch (e) { }
    }

    if (supabase) {
      try {
        const bcChannel = supabase.channel('fest_realtime_sync');
        bcChannel.send({
          type: 'broadcast',
          event: 'announcement_change',
          payload: { timestamp: Date.now() }
        }).catch(() => { });
      } catch (e) { }
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
      } catch (e) { }
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
            } catch (e) { }
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

        const res = await this.postServerApi<{ success: boolean; data?: any }>('/api/admin/manage', {
          action: 'create_announcement',
          payload,
        });

        if (res.data) {
          newNotice.id = res.data.id;
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
      } catch (e) { }
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
      } catch (e) { }
    }

    if (supabase && isUuid(id)) {
      try {
        await this.postServerApi('/api/admin/manage', {
          action: 'delete_announcement',
          id,
        });
      } catch (err) {
        console.warn('Supabase announcement delete notice:', err);
      }
    }

    this.notifyAnnouncementChange();
    return { success: true };
  }

  // ==========================================================================
  // Special Events System (Screening & Submission)
  // ==========================================================================
  // Pre-Fest Events System (Screening & Submission)
  // ==========================================================================

  public getPreFestSettings(): any[] {
    return this.getStorage<any[]>('preFestSettings', []);
  }

  public getPreFestRegistrations(collegeAfflNo?: number): any[] {
    const all = this.getStorage<any[]>('preFestRegistrations', []);
    if (collegeAfflNo) {
      const numAffl = Number(collegeAfflNo);
      return all.filter(r => Number(r.college_affl_no) === numAffl);
    }
    return all;
  }

  public getPreFestSubmissions(collegeAfflNo?: number): any[] {
    const all = this.getStorage<any[]>('preFestSubmissions', []);
    if (collegeAfflNo) {
      const numAffl = Number(collegeAfflNo);
      return all.filter(s => Number(s.college_affl_no) === numAffl);
    }
    return all;
  }

  // Backward compatibility aliases
  public getSpecialEventSettings(): any[] { return this.getPreFestSettings(); }
  public getSpecialEventRegistrations(collegeAfflNo?: number): any[] { return this.getPreFestRegistrations(collegeAfflNo); }
  public getSpecialEventSubmissions(collegeAfflNo?: number): any[] { return this.getPreFestSubmissions(collegeAfflNo); }

  public async fetchPreFestEventsData(): Promise<{
    settings: any[];
    events: any[];
    registrations: any[];
    submissions: any[];
    serverTime?: string;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/prefest-events');
      const data = await res.json();
      if (!res.ok) {
        return { settings: [], events: [], registrations: [], submissions: [], error: data?.error || 'Failed to fetch' };
      }
      if (data.settings) {
        this.setStorage('preFestSettings', data.settings);
      }
      if (data.registrations) {
        this.setStorage('preFestRegistrations', data.registrations);
      }
      if (data.submissions) {
        this.setStorage('preFestSubmissions', data.submissions);
      }
      return data;
    } catch (err: any) {
      return { settings: [], events: [], registrations: [], submissions: [], error: err?.message || 'Network error' };
    }
  }

  public async fetchSpecialEventsData() { return this.fetchPreFestEventsData(); }

  public async updatePreFestSettings(payload: {
    event_type: 'SCREENING' | 'SUBMISSION';
    registration_enabled: boolean;
    registration_opens_at: string | null;
    registration_closes_at: string | null;
    fine_closes_at?: string | null;
    fine_amount?: number | null;
    youtube_submission_enabled: boolean;
    youtube_submission_opens_at: string | null;
    youtube_submission_closes_at: string | null;
    disabled_event_ids: string[];
  }): Promise<{ success: boolean; error?: string; settings?: any }> {
    try {
      // Synchronize in local storage cache for immediate client reflection
      const currentList = this.getSpecialEventSettings();
      const existingIdx = currentList.findIndex(s => s.event_type === payload.event_type);
      const updatedSetting = {
        id: existingIdx >= 0 ? currentList[existingIdx].id : `setting-${payload.event_type.toLowerCase()}`,
        ...payload,
        updated_at: new Date().toISOString()
      };
      if (existingIdx >= 0) {
        currentList[existingIdx] = updatedSetting as any;
      } else {
        currentList.push(updatedSetting as any);
      }
      this.setStorage('prefest_registration_settings', currentList);

      // If updating screening schedule, apply reg_deadline & fine_deadline across screening items
      if (payload.event_type === 'SCREENING') {
        const items = this.getItems();
        let changed = false;
        items.forEach(itm => {
          if (isScreeningEvent(itm) || itm.is_screening || (itm.mode as string) === 'screening') {
            if (payload.registration_closes_at) itm.reg_deadline = payload.registration_closes_at;
            if (payload.fine_closes_at) itm.fine_deadline = payload.fine_closes_at;
            changed = true;
          }
        });
        if (changed) this.setStorage('items', items);
      }

      const res = await fetch('/api/prefest-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_settings', payload })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.error || 'Failed to update settings' };
      }
      return { success: true, settings: data.settings || updatedSetting };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  public async updateSpecialEventSettings(payload: any) {
    return this.updatePreFestSettings(payload);
  }

  public async togglePreFestEventDisabled(
    eventType: 'SCREENING' | 'SUBMISSION',
    eventId: string,
    disabled: boolean
  ): Promise<{ success: boolean; error?: string; settings?: any }> {
    try {
      const res = await fetch('/api/prefest-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_event_disabled', event_type: eventType, event_id: eventId, disabled })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.error || 'Failed to toggle event' };
      }
      return { success: true, settings: data.settings };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  public async toggleSpecialEventDisabled(
    eventType: 'SCREENING' | 'SUBMISSION',
    eventId: string,
    disabled: boolean
  ): Promise<{ success: boolean; error?: string; settings?: any }> {
    return this.togglePreFestEventDisabled(eventType, eventId, disabled);
  }

  // --- Universal Event Deadlines & Fines System ---
  public getEventDeadlineSettings(): EventDeadlineSetting[] {
    const list = this.getStorage<EventDeadlineSetting[]>('event_deadline_settings', []);
    if (list && list.length > 0) return list;
    return DEFAULT_EVENT_DEADLINES;
  }

  public getEventDeadlineSetting(kind: EventKind): EventDeadlineSetting {
    const list = this.getEventDeadlineSettings();
    const match = list.find(s => s.event_kind === kind);
    if (match) return match;
    const fallback = list.find(s => s.event_kind === 'general');
    if (fallback) return fallback;
    return DEFAULT_EVENT_DEADLINES.find(s => s.event_kind === kind) || DEFAULT_EVENT_DEADLINES[0];
  }

  public async updateEventDeadlineSetting(setting: Partial<EventDeadlineSetting>): Promise<{ success: boolean; error?: string; setting?: EventDeadlineSetting }> {
    try {
      // Optimistic cache update
      const list = [...this.getEventDeadlineSettings()];
      const idx = list.findIndex(s => s.event_kind === setting.event_kind);
      const updated = {
        ...(idx >= 0 ? list[idx] : {}),
        ...setting,
        updated_at: new Date().toISOString()
      } as EventDeadlineSetting;
      if (idx >= 0) list[idx] = updated;
      else list.push(updated);
      this.setStorage('event_deadline_settings', list);

      // Also mirror to items / festSettings if needed
      if (setting.event_kind === 'screening') {
        const items = this.getItems();
        let changed = false;
        items.forEach(itm => {
          if (isScreeningEvent(itm) || itm.is_screening || (itm.mode as string) === 'screening') {
            if (setting.no_fine_deadline) itm.reg_deadline = setting.no_fine_deadline;
            if (setting.fine_deadline) itm.fine_deadline = setting.fine_deadline;
            changed = true;
          }
        });
        if (changed) this.setStorage('items', items);
      } else if (setting.event_kind === 'general' || setting.event_kind === 'onstage') {
        const fs = this.getFestSettings();
        if (setting.no_fine_deadline) fs.reg_deadline = setting.no_fine_deadline;
        if (setting.fine_deadline) fs.fine_deadline = setting.fine_deadline;
        this.setStorage('festSettings', fs);
      }

      const res = await fetch('/api/admin/event-deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: setting })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.error || 'Failed to update deadline settings' };
      }
      return { success: true, setting: data.setting || updated };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating deadlines' };
    }
  }

  public async registerPreFestEvent(
    eventId: string,
    collegeId?: string,
    collegeAfflNo?: number
  ): Promise<{ success: boolean; error?: string; registration?: any }> {
    try {
      const res = await fetch('/api/prefest-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', event_id: eventId, college_id: collegeId, college_affl_no: collegeAfflNo })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.error || 'Failed to register' };
      }
      this.broadcastGlobalSync('prefest', { eventId, action: 'register' });
      return { success: true, registration: data.registration };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  public async registerSpecialEvent(
    eventId: string,
    collegeId?: string,
    collegeAfflNo?: number
  ) {
    return this.registerPreFestEvent(eventId, collegeId, collegeAfflNo);
  }

  public async unregisterPreFestEvent(
    registrationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/prefest-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unregister', registration_id: registrationId })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.error || 'Failed to unregister' };
      }
      this.broadcastGlobalSync('prefest', { registrationId, action: 'unregister' });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  public async unregisterSpecialEvent(registrationId: string) {
    return this.unregisterPreFestEvent(registrationId);
  }

  public async submitPreFestYouTube(
    registrationId: string,
    youtubeUrl: string
  ): Promise<{ success: boolean; error?: string; message?: string; submission?: any }> {
    try {
      const res = await fetch('/api/prefest-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_youtube', registration_id: registrationId, youtube_url: youtubeUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.error || 'Failed to submit YouTube video link' };
      }
      this.broadcastGlobalSync('prefest', { registrationId, action: 'submit_youtube' });
      return { success: true, message: data.message, submission: data.submission };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  public async submitSpecialEventYouTube(registrationId: string, youtubeUrl: string) {
    return this.submitPreFestYouTube(registrationId, youtubeUrl);
  }
}

export const festService = new FestService();


