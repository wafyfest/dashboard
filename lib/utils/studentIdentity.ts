import { Student, Registration, Item, College } from '../types/fest';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates whether a string is a raw UUID.
 */
export function isUuid(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  return UUID_REGEX.test(val.trim());
}

/**
 * Returns a human-friendly canonical chest number for a student.
 * Never exposes raw UUIDs as chest numbers.
 */
export function getCanonicalChestNo(student: Partial<Student> | null | undefined): string {
  if (!student) return 'ST-N/A';

  // 1. Primary Student Identifier: cic_no / admission_no
  const cic = student.cic_no ?? student.admission_no ?? student.cic_number;
  if (cic !== undefined && cic !== null && String(cic).trim() !== '') {
    const cicStr = String(cic).trim();
    if (cicStr.toUpperCase().startsWith('ST-') || cicStr.toUpperCase().startsWith('CH-')) {
      return cicStr.toUpperCase();
    }
    return `ST-${cicStr}`;
  }

  // 2. Chest No (if present and not a raw UUID)
  if (student.chest_no && student.chest_no.trim() !== '' && !isUuid(student.chest_no)) {
    return student.chest_no.trim().toUpperCase();
  }

  // 3. Fallback: Student ID prefix
  if (student.id && typeof student.id === 'string') {
    if (student.id.startsWith('stu-')) {
      return `CH-${student.id.replace('stu-', '')}`;
    }
    if (!isUuid(student.id)) {
      return `CH-${student.id}`;
    }
    // Truncated UUID fallback if nothing else is available
    return `CH-${student.id.slice(0, 6).toUpperCase()}`;
  }

  return 'ST-N/A';
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

  // Scope to college if specified, but maintain global list as fallback
  const pool = collegeAfflNo
    ? students.filter(s => s.college_affl_no === collegeAfflNo)
    : students;
  const fallbackPool = collegeAfflNo ? students : [];

  const searchInPool = (list: Student[]): Student | undefined => {
    // 1. Direct ID match
    let match = list.find(s => s.id === rawStr);
    if (match) return match;

    // 2. Primary CIC No / Admission No match
    match = list.find(s => {
      const cic = String(s.cic_no ?? s.admission_no ?? s.cic_number ?? '').trim();
      return cic !== '' && (cic === rawStr || cic.toUpperCase() === upperStr);
    });
    if (match) return match;

    // 3. Direct Chest No match (case-insensitive)
    match = list.find(s => s.chest_no && s.chest_no.trim().toUpperCase() === upperStr);
    if (match) return match;

    // 4. Formatted Chest No / Digits match (e.g., searching "20194" matches "ST-20194")
    if (digitsOnly) {
      match = list.find(s => {
        const cicDigits = String(s.cic_no ?? s.admission_no ?? s.cic_number ?? '').replace(/\D/g, '');
        const chestDigits = (s.chest_no || '').replace(/\D/g, '');
        return (cicDigits !== '' && cicDigits === digitsOnly) || (chestDigits !== '' && chestDigits === digitsOnly);
      });
      if (match) return match;
    }

    // 5. Match canonical chest number derived for each student
    match = list.find(s => getCanonicalChestNo(s).toUpperCase() === upperStr);
    if (match) return match;

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
    if (chestA !== 'ST-N/A' && chestB !== 'ST-N/A' && chestA === chestB) return true;

    const cicA = String(studentA.admission_no ?? studentA.cic_no ?? studentA.cic_number ?? '').trim();
    const cicB = String(studentB.admission_no ?? studentB.cic_no ?? studentB.cic_number ?? '').trim();
    if (cicA && cicB && cicA === cicB) return true;

    return false;
  }

  // If studentB_or_identifier is a string/number identifier
  const rawId = String(studentB_or_identifier).trim();
  if (!rawId) return false;

  if (studentA.id === rawId) return true;
  if (studentA.chest_no && studentA.chest_no.trim().toUpperCase() === rawId.toUpperCase()) return true;
  if (getCanonicalChestNo(studentA).toUpperCase() === rawId.toUpperCase()) return true;

  const cicA = String(studentA.admission_no ?? studentA.cic_no ?? studentA.cic_number ?? '').trim();
  if (cicA && (cicA === rawId || cicA.toUpperCase() === rawId.toUpperCase())) return true;

  return false;
}

/**
 * Formats a clean student display identifier for UI.
 * Bad: 6adb74c4-bbaa-43da-baef-a11d64d4a261
 * Good: ST-20194 MUHAMMED DILSHAD M P
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

  if (chest && chest !== 'ST-N/A') {
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
    } else if (String(studentOrIdentifier).trim() === registration.chest_no.trim()) {
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
  allRegistrations?: Registration[]
): Registration {
  const colAffl = registration.college_affl_no;
  const item = items?.find(i => i.item_id === registration.item_id);
  const college = colleges?.find(c => c.affl_no === colAffl);

  // Resolve main student for this registration row
  const student = findStudentByIdentifier(students, registration.chest_no, colAffl);

  // Group event participant aggregation
  let participants: Student[] = [];
  if (allRegistrations && allRegistrations.length > 0) {
    const groupRows = allRegistrations.filter(
      r => r.item_id === registration.item_id && r.college_affl_no === colAffl
    );
    participants = groupRows
      .map(r => findStudentByIdentifier(students, r.chest_no, colAffl))
      .filter((s): s is Student => s !== undefined);
  } else if (registration.participants && registration.participants.length > 0) {
    participants = registration.participants
      .map(p => findStudentByIdentifier(students, p.chest_no || p.id || p.admission_no, colAffl) || p)
      .filter((s): s is Student => s !== undefined);
  } else if (student) {
    participants = [student];
  }

  // Ensure canonical chest_no is present for display
  const chestNo = student ? getCanonicalChestNo(student) : (registration.chest_no || 'N/A');

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
  items?: Item[]
): {
  registeredEventsCount: number;
  onstageCount: number;
  offstageCount: number;
  individualCount: number;
  groupCount: number;
  events: Array<{ registration: Registration; item?: Item }>;
} {
  const studentRegs = registrations.filter(r => registrationContainsStudent(r, student));

  // Deduplicate by item_id to avoid counting multiple participant rows for the same group event
  const uniqueItemRegs = new Map<number, Registration>();
  studentRegs.forEach(r => {
    if (!uniqueItemRegs.has(r.item_id)) {
      uniqueItemRegs.set(r.item_id, r);
    }
  });

  let onstageCount = 0;
  let offstageCount = 0;
  let individualCount = 0;
  let groupCount = 0;

  const events: Array<{ registration: Registration; item?: Item }> = [];

  uniqueItemRegs.forEach((reg, itemId) => {
    const item = reg.item || items?.find(i => i.item_id === itemId);
    events.push({ registration: reg, item });

    if (item) {
      if (item.mode === 'onstage') onstageCount++;
      else offstageCount++;

      if (item.point_type === 'group' || item.item_type === 'Group') groupCount++;
      else individualCount++;
    }
  });

  return {
    registeredEventsCount: uniqueItemRegs.size,
    onstageCount,
    offstageCount,
    individualCount,
    groupCount,
    events
  };
}
