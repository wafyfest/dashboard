import { Student, Registration, Item, College, MaxParticipation, normalizeCategoryKey, isSpecialEvent, getEffectiveStageMode } from '../types/fest';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates whether a string is a raw UUID.
 */
export function isUuid(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  return UUID_REGEX.test(val.trim());
}

const inMemoryChestToCic = new Map<string, string>();
const inMemoryCicToChest = new Map<string, string>();
let hasHydratedSessionStorage = false;

function hydrateSessionStorageOnce(): void {
  if (hasHydratedSessionStorage) return;
  if (typeof window === 'undefined') return;
  hasHydratedSessionStorage = true;
  try {
    const raw = sessionStorage.getItem('arts_fest_chest_no');
    if (raw) {
      const rows = JSON.parse(raw);
      if (Array.isArray(rows)) {
        registerChestNoMapping(rows);
      }
    }
  } catch (e) {
    // ignore sessionStorage errors
  }
}

export function registerChestNoMapping(
  rows: Array<{ cic_no?: number | string; chest_no?: number | string }> | null | undefined
): void {
  hasHydratedSessionStorage = true;
  if (!rows || !Array.isArray(rows)) return;
  rows.forEach(r => {
    if (r.cic_no != null && r.chest_no != null) {
      const cic = String(r.cic_no).trim();
      const chest = String(r.chest_no).trim();
      if (cic && chest) {
        inMemoryChestToCic.set(chest, cic);
        inMemoryCicToChest.set(cic, chest);
      }
    }
  });
}

export function getCicForChest(chestStr: string): string | undefined {
  if (!chestStr) return undefined;
  const trimmed = chestStr.trim();
  hydrateSessionStorageOnce();
  return inMemoryChestToCic.get(trimmed);
}

export function getChestForCic(cicStr: string): string | undefined {
  if (!cicStr) return undefined;
  const trimmed = cicStr.trim();
  hydrateSessionStorageOnce();
  return inMemoryCicToChest.get(trimmed);
}

/**
 * Returns a human-friendly canonical chest number for a student.
 * Never exposes raw UUIDs as chest numbers.
 */
/**
 * Returns the student's numeric chest number (`101+`) if assigned, otherwise raw CIC
 * (or student ID) for registration RPC lookup — never generates `ST-00000`.
 */
export function getRegistrationStudentKey(student: Partial<Student> | null | undefined): string {
  if (!student) return '';

  const rawChest = String(student.chest_no ?? '').trim();
  if (rawChest && /^\d+$/.test(rawChest)) {
    return rawChest;
  }

  const cic = student.cic_no ?? student.admission_no ?? student.cic_number;
  if (cic !== undefined && cic !== null && String(cic).trim() !== '') {
    const cicKey = String(cic).trim();
    const mapped = getChestForCic(cicKey);
    if (mapped && /^\d+$/.test(mapped)) {
      return mapped;
    }
    return cicKey.replace(/^(ST-|CH-)/i, '');
  }

  return student.id || '';
}

/**
 * Generates the canonical display chest number (`101+`).
 * Returns `—` if a student has not yet been allotted a server-side chest number.
 */
export function getCanonicalChestNo(student: Partial<Student> | null | undefined): string {
  if (!student) return '—';

  // Server-assigned numeric chest_no (101, 102, 103...)
  const trimmedChest = String(student.chest_no ?? '').trim();
  if (trimmedChest && !isUuid(trimmedChest)) {
    if (/^\d+$/.test(trimmedChest)) {
      return trimmedChest;
    }
  }

  // Check if student's CIC has an assigned chest number in the mapping
  const cic = student.cic_no ?? student.admission_no ?? student.cic_number;
  if (cic !== undefined && cic !== null) {
    const mappedChest = getChestForCic(String(cic).trim());
    if (mappedChest && /^\d+$/.test(mappedChest)) {
      return mappedChest;
    }
  }

  return '—';
}

interface StudentPoolIndex {
  byId: Map<string, Student>;
  byChest: Map<string, Student>;
  byCic: Map<string, Student>;
  byCanonical: Map<string, Student>;
}

const studentPoolIndexes = new WeakMap<Student[], StudentPoolIndex>();

function getStudentPoolIndex(list: Student[]): StudentPoolIndex {
  let index = studentPoolIndexes.get(list);
  if (index) return index;

  const byId = new Map<string, Student>();
  const byChest = new Map<string, Student>();
  const byCic = new Map<string, Student>();
  const byCanonical = new Map<string, Student>();

  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.id) byId.set(s.id, s);

    const rawChest = String(s.chest_no ?? '').trim();
    if (rawChest) {
      const up = rawChest.toUpperCase();
      byChest.set(up, s);
      const digits = rawChest.replace(/\D/g, '');
      if (digits) byChest.set(digits, s);
    }

    const cic = String(s.cic_no ?? s.admission_no ?? s.cic_number ?? '').trim();
    if (cic) {
      const upperCic = cic.toUpperCase();
      byCic.set(cic, s);
      byCic.set(upperCic, s);
      byCic.set(`ST-${upperCic}`, s);
      byCic.set(`CH-${upperCic}`, s);
      const digits = cic.replace(/\D/g, '');
      if (digits) byCic.set(digits, s);
    }

    const canonical = getCanonicalChestNo(s);
    if (canonical && canonical !== '—') {
      byCanonical.set(canonical.toUpperCase(), s);
    }
  }

  index = { byId, byChest, byCic, byCanonical };
  studentPoolIndexes.set(list, index);
  return index;
}

/**
 * Centralized student identity resolver.
 * Safely resolves a student from any identifier (UUID, chest_no, admission_no, or legacy values).
 */
export function findStudentByIdentifier(
  students: Student[],
  identifier: string | number | null | undefined,
  collegeAfflNo?: number
): Student | undefined {
  if (identifier === null || identifier === undefined) return undefined;
  const rawStr = String(identifier).trim();
  if (!rawStr) return undefined;

  const upperStr = rawStr.toUpperCase();
  const digitsOnly = rawStr.replace(/\D/g, '');

  const numColAffl = collegeAfflNo != null ? Number(collegeAfflNo) : undefined;
  const pool = !isNaN(numColAffl as number) && (numColAffl as number) > 0
    ? students.filter(s => Number(s.college_affl_no) === numColAffl)
    : students;
  const fallbackPool = pool !== students ? students : [];

  const searchInPool = (list: Student[]): Student | undefined => {
    if (!list || list.length === 0) return undefined;
    const index = getStudentPoolIndex(list);

    // 0. If mapped in chest_no table, resolve directly to CIC
    const mappedCic = getCicForChest(rawStr);
    if (mappedCic) {
      const hit = index.byCic.get(mappedCic);
      if (hit) return hit;
    }

    // 1. Direct ID match
    let hit = index.byId.get(rawStr);
    if (hit) return hit;

    // 2. Direct Assigned Chest No match
    hit = index.byChest.get(upperStr);
    if (hit) return hit;

    // 3. Primary CIC match
    hit = index.byCic.get(upperStr);
    if (hit) return hit;

    // 4. Digits match
    if (digitsOnly) {
      hit = index.byCic.get(digitsOnly) || index.byChest.get(digitsOnly);
      if (hit) return hit;
    }

    // 5. Canonical chest match
    hit = index.byCanonical.get(upperStr);
    if (hit) return hit;

    return undefined;
  };

  return searchInPool(pool) || (fallbackPool.length > 0 ? searchInPool(fallbackPool) : undefined);
}

/**
 * Checks if two student representations refer to the exact same student.
 */
export function isSameStudent(
  studentA: Partial<Student> | null | undefined,
  studentB_or_identifier: Partial<Student> | string | number | null | undefined
): boolean {
  if (!studentA || !studentB_or_identifier) return false;

  if (typeof studentB_or_identifier === 'object') {
    const studentB = studentB_or_identifier;
    if (studentA.id && studentB.id && studentA.id === studentB.id) return true;

    const chestA = getCanonicalChestNo(studentA);
    const chestB = getCanonicalChestNo(studentB);
    if (chestA !== '—' && chestB !== '—' && chestA === chestB) return true;

    const cicA = String(studentA.admission_no ?? studentA.cic_no ?? studentA.cic_number ?? '').trim();
    const cicB = String(studentB.admission_no ?? studentB.cic_no ?? studentB.cic_number ?? '').trim();
    if (cicA && cicB && cicA === cicB) return true;

    return false;
  }

  // If studentB_or_identifier is a string/number identifier
  const rawId = String(studentB_or_identifier).trim();
  if (!rawId) return false;

  if (studentA.id === rawId) return true;
  const studentAChest = String(studentA.chest_no ?? '').trim();
  if (studentAChest && studentAChest.toUpperCase() === rawId.toUpperCase()) return true;
  if (getCanonicalChestNo(studentA).toUpperCase() === rawId.toUpperCase()) return true;

  const cicA = String(studentA.admission_no ?? studentA.cic_no ?? studentA.cic_number ?? '').trim();
  if (
    cicA &&
    (cicA === rawId ||
      cicA.toUpperCase() === rawId.toUpperCase() ||
      `ST-${cicA}`.toUpperCase() === rawId.toUpperCase() ||
      `CH-${cicA}`.toUpperCase() === rawId.toUpperCase())
  ) {
    return true;
  }

  // Check if rawId is a server-assigned chest_no matching studentA's CIC or vice versa
  if (cicA) {
    const mappedCic = getCicForChest(rawId);
    if (mappedCic && (mappedCic === cicA || `ST-${mappedCic}`.toUpperCase() === `ST-${cicA}`.toUpperCase())) {
      return true;
    }
    const mappedChest = getChestForCic(cicA);
    if (mappedChest && (mappedChest === rawId || mappedChest.toUpperCase() === rawId.toUpperCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Formats a clean student display identifier for UI.
 * Bad: 6adb74c4-bbaa-43da-baef-a11d64d4a261
 * Good: 101 MUHAMMED DILSHAD M P
 */
export function getStudentDisplayIdentifier(
  student: Partial<Student> | null | undefined,
  fallbackIdentifier?: string
): string {
  if (!student) {
    if (!fallbackIdentifier) return 'Unknown Student';
    if (isUuid(fallbackIdentifier)) {
      return `Unknown Student (${fallbackIdentifier.slice(0, 8)}...)`;
    }
    return `Unknown Student (${fallbackIdentifier})`;
  }

  const chest = getCanonicalChestNo(student);
  const name = student.full_name || student.name || 'Participant';

  if (chest && chest !== '—') {
    return `${chest} ${name}`;
  }

  const cic = student.admission_no ?? student.cic_no ?? student.cic_number;
  if (cic) {
    return `Adm:${cic} ${name}`;
  }

  return name;
}

/**
 * Helper to check if a registration (individual or group) contains a given student.
 */
export function registrationContainsStudent(
  registration: Registration,
  studentOrIdentifier: Student | string | number | null | undefined,
  allStudents?: Student[]
): boolean {
  if (!registration || !studentOrIdentifier) return false;

  // Direct exact match on cic_no if present
  if (registration.cic_no != null && String(registration.cic_no).trim() !== '') {
    const regCic = String(registration.cic_no).trim();
    if (typeof studentOrIdentifier === 'object') {
      const stuCic = String(studentOrIdentifier.cic_no ?? studentOrIdentifier.admission_no ?? studentOrIdentifier.cic_number ?? '').trim();
      if (stuCic && stuCic === regCic) return true;
    } else if (String(studentOrIdentifier).trim() === regCic) {
      return true;
    }
  }

  // Direct match on participant list if present
  if (registration.participants && registration.participants.length > 0) {
    const isMatch = registration.participants.some(p => isSameStudent(p, studentOrIdentifier));
    if (isMatch) return true;
  }

  // Match on registration.student object if present
  if (registration.student && isSameStudent(registration.student, studentOrIdentifier)) {
    return true;
  }

  // Match on registration.chest_no field (which could be UUID, Chest No, or Admission No)
  if (registration.chest_no) {
    if (typeof studentOrIdentifier === 'object') {
      if (isSameStudent(studentOrIdentifier, registration.chest_no)) return true;
    } else if (String(studentOrIdentifier).trim() === String(registration.chest_no).trim()) {
      return true;
    }
  }

  // If allStudents is provided, resolve registration.chest_no to student object and compare
  if (allStudents && registration.chest_no) {
    const resolvedRegStudent = findStudentByIdentifier(
      allStudents,
      registration.chest_no,
      registration.college_affl_no
    );
    if (resolvedRegStudent && isSameStudent(resolvedRegStudent, studentOrIdentifier)) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes a database registration record into a consistent application object.
 */
export function normalizeRegistration(
  registration: Registration,
  students: Student[],
  items?: Item[],
  colleges?: College[],
  allOrGroupRegistrations?: Registration[]
): Registration {
  const colAffl = Number(registration.college_affl_no);
  const itmId = Number(registration.item_id);
  const item = items?.find(i => Number(i.item_id || i.id) === itmId);
  const college = colleges?.find(c => Number(c.affl_no) === colAffl);

  // Resolve main student for this registration row
  const student = findStudentByIdentifier(students, registration.cic_no || registration.chest_no, colAffl);

  // Group event participant aggregation
  let participants: Student[] = [];
  if (allOrGroupRegistrations && allOrGroupRegistrations.length > 0) {
    const groupRows = allOrGroupRegistrations.filter(
      r => Number(r.item_id) === itmId && Number(r.college_affl_no) === colAffl
    );
    participants = groupRows
      .map(r => findStudentByIdentifier(students, r.cic_no || r.chest_no, colAffl) || ({
        id: `reg-${r.id || r.chest_no || r.cic_no}`,
        full_name: r.chest_no ? `Chest #${r.chest_no}` : `CIC: ${r.cic_no}`,
        name: r.chest_no ? `Chest #${r.chest_no}` : `CIC: ${r.cic_no}`,
        chest_no: r.chest_no,
        cic_no: r.cic_no,
        college_affl_no: colAffl,
      } as any))
      .filter((s): s is Student => s !== undefined);
  } else if (registration.participants && registration.participants.length > 0) {
    participants = registration.participants
      .map(p => findStudentByIdentifier(students, (p as any).cic_no || p.chest_no || p.id || p.admission_no, colAffl) || p)
      .filter((s): s is Student => s !== undefined);
  } else if (student) {
    participants = [student];
  }

  // Ensure canonical chest_no is present for display without collapsing distinct rows to '—'
  const resolvedChest = student ? getCanonicalChestNo(student) : '';
  const chestNo = resolvedChest && resolvedChest !== '—' ? resolvedChest : (registration.chest_no || '—');

  return {
    ...registration,
    chest_no: chestNo,
    item: item || registration.item,
    college: college || registration.college,
    student: student || registration.student,
    participants: participants.length > 0 ? participants : registration.participants
  };
}

/**
 * Safe student event count & quota calculation logic.
 */
export function calculateStudentEvents(
  student: Student,
  registrations: Registration[],
  items?: Item[],
  allStudents?: Student[]
): {
  registeredEventsCount: number;
  onstageCount: number;
  offstageCount: number;
  individualCount: number;
  groupCount: number;
  generalCount: number;
  totalFestivalEventsCount: number;
  events: Array<{ registration: Registration; item?: Item }>;
} {
  const studentRegs = registrations.filter(r => registrationContainsStudent(r, student, allStudents));

  // Deduplicate by item_id to avoid counting multiple participant rows for the same group event
  const uniqueItemRegs = new Map<number, Registration>();
  studentRegs.forEach(r => {
    const itmId = Number(r.item_id);
    if (!isNaN(itmId) && !uniqueItemRegs.has(itmId)) {
      uniqueItemRegs.set(itmId, r);
    }
  });

  let onstageCount = 0;
  let offstageCount = 0;
  let individualCount = 0;
  let groupCount = 0;
  let generalCount = 0;
  let quotaEventsCount = 0;

  const events: Array<{ registration: Registration; item?: Item }> = [];

  uniqueItemRegs.forEach((reg, itemId) => {
    const item = reg.item || items?.find(i => Number(i.item_id || i.id) === itemId);
    events.push({ registration: reg, item });

    // Special Programs are exempt from student max_participation quotas
    if (item && !isSpecialEvent(item)) {
      const isGroup = item.point_type === 'group' || item.item_type === 'Group';
      const itemCat = normalizeCategoryKey(item.phase || item.category);

      if (itemCat === 'GENERAL') {
        generalCount++;
      }

      if (isGroup) {
        groupCount++;
      } else {
        individualCount++;
        quotaEventsCount++;
        if (getEffectiveStageMode(item) === 'onstage') {
          onstageCount++;
        } else {
          offstageCount++;
        }
      }
    } else if (!item) {
      quotaEventsCount++;
      individualCount++;
    }
  });

  return {
    registeredEventsCount: quotaEventsCount,
    onstageCount,
    offstageCount,
    individualCount,
    groupCount,
    generalCount,
    totalFestivalEventsCount: groupCount + individualCount,
    events
  };
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  stats: {
    registeredEventsCount: number;
    onstageCount: number;
    offstageCount: number;
    individualCount: number;
    groupCount: number;
    generalCount: number;
  };
  totalStats: {
    registeredEventsCount: number;
    onstageCount: number;
    offstageCount: number;
    individualCount: number;
    groupCount: number;
    generalCount: number;
  };
  isAlreadyRegisteredInItem: boolean;
  quota?: MaxParticipation;
}

const DEFAULT_FALLBACK_QUOTAS: MaxParticipation[] = [
  { phase: 'Foundation', off_max: 4, on_max: 3, total_max: 7, group_max: 2 },
  { phase: 'Thamheediyya', off_max: 4, on_max: 3, total_max: 7, group_max: 3 },
  { phase: 'Aliya', off_max: 4, on_max: 3, total_max: 7, group_max: 4 },
  { phase: 'PG', off_max: 5, on_max: 4, total_max: 6, group_max: 4 },
  { phase: 'General', off_max: 2, on_max: 2, total_max: 2, group_max: 3 }
];

/**
 * Validates a student's participation quota against max_participation quotas.
 * Respects Rule 16 (Individual on_max, off_max, total_max) and Rule 17 (General category limit = 2),
 * with group events tracked independently under group_max.
 */
export function checkStudentQuota(
  student: Student,
  targetItem: Item,
  collegeRegistrations: Registration[],
  allItems: Item[],
  quotaLimits?: MaxParticipation[],
  allStudents?: Student[]
): QuotaCheckResult {
  const targetItemId = Number(targetItem.item_id || targetItem.id);

  // Check if student is already in this event in collegeRegistrations
  const isAlreadyRegisteredInItem = collegeRegistrations.some(
    r => Number(r.item_id) === targetItemId && registrationContainsStudent(r, student, allStudents)
  );

  // Absolute stats across all registrations in the festival (consistent across all modals)
  const totalStats = calculateStudentEvents(student, collegeRegistrations, allItems, allStudents);

  // Stats excluding current target item (to evaluate available headroom for adding this event)
  const otherRegs = collegeRegistrations.filter(r => Number(r.item_id) !== targetItemId);
  const stats = calculateStudentEvents(student, otherRegs, allItems, allStudents);

  const quotas = (quotaLimits && quotaLimits.length > 0) ? quotaLimits : DEFAULT_FALLBACK_QUOTAS;
  const studentCatKey = normalizeCategoryKey(student.category || student.phase);
  const quota = quotas.find(q => normalizeCategoryKey(q.phase) === studentCatKey)
    || quotas.find(q => normalizeCategoryKey(q.phase) === 'GENERAL')
    || quotas[0];

  if (!quota || isSpecialEvent(targetItem)) {
    return {
      allowed: true,
      stats,
      totalStats,
      isAlreadyRegisteredInItem,
      quota
    };
  }

  const isGroup = targetItem.point_type === 'group' || targetItem.item_type === 'Group';
  const isOnstage = getEffectiveStageMode(targetItem) === 'onstage';
  const isOffstage = !isOnstage;
  const isGeneral = normalizeCategoryKey(targetItem.phase || targetItem.category) === 'GENERAL';

  // 1. Group Events Quota Check (independent from individual limits)
  if (isGroup) {
    if (stats.groupCount >= quota.group_max) {
      return {
        allowed: false,
        reason: `Exceeds max group limit (${stats.groupCount}/${quota.group_max})`,
        stats,
        totalStats,
        isAlreadyRegisteredInItem,
        quota
      };
    }
  } else {
    // 2. Individual Events Quota Check (Rule 16: max 3 on, max 4 off, max 7 total)
    // 2a. Check Onstage Limit
    if (isOnstage && stats.onstageCount >= quota.on_max) {
      return {
        allowed: false,
        reason: `Exceeds max onstage limit (${stats.onstageCount}/${quota.on_max})`,
        stats,
        totalStats,
        isAlreadyRegisteredInItem,
        quota
      };
    }

    // 2b. Check Offstage Limit
    if (isOffstage && stats.offstageCount >= quota.off_max) {
      return {
        allowed: false,
        reason: `Exceeds max offstage limit (${stats.offstageCount}/${quota.off_max})`,
        stats,
        totalStats,
        isAlreadyRegisteredInItem,
        quota
      };
    }

    // 2c. Check Total Individual Events Limit
    if (stats.individualCount >= quota.total_max) {
      return {
        allowed: false,
        reason: `Exceeds max individual limit (${stats.individualCount}/${quota.total_max})`,
        stats,
        totalStats,
        isAlreadyRegisteredInItem,
        quota
      };
    }
  }

  // 3. General Category Limit (Rule 17: Maximum 2 General events)
  if (isGeneral && stats.generalCount >= 2) {
    return {
      allowed: false,
      reason: `Exceeds General category limit (${stats.generalCount}/2)`,
      stats,
      totalStats,
      isAlreadyRegisteredInItem,
      quota
    };
  }

  return {
    allowed: true,
    stats,
    totalStats,
    isAlreadyRegisteredInItem,
    quota
  };
}
