/**
 * Indian Standard Time (IST, UTC+05:30) Date Utilities
 * 
 * Ensures all deadline inputs and calculations strictly follow IST
 * without client-browser local timezone offset skew or ISO slicing bugs.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Converts an ISO 8601 UTC string to a 'YYYY-MM-DDTHH:mm' string in IST (+05:30)
 * directly compatible with HTML `<input type="datetime-local">`.
 */
export function formatToIstInput(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  // Shift UTC epoch by IST offset
  const istEpoch = d.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istEpoch);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = istDate.getUTCFullYear();
  const mm = pad(istDate.getUTCMonth() + 1);
  const dd = pad(istDate.getUTCDate());
  const hh = pad(istDate.getUTCHours());
  const min = pad(istDate.getUTCMinutes());

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/**
 * Converts an HTML `<input type="datetime-local">` value (entered in IST)
 * to an ISO 8601 UTC string for PostgreSQL TIMESTAMPTZ storage.
 */
export function parseIstInputToIso(inputStr: string): string {
  if (!inputStr || inputStr.trim() === '') return '';
  // Format is YYYY-MM-DDTHH:mm
  // Append :00+05:30 to explicitly anchor to IST
  const istFullString = `${inputStr}:00+05:30`;
  const d = new Date(istFullString);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

/**
 * Formats a Date/ISO string for human display in Indian Standard Time (IST)
 * Example: "Oct 25, 2026, 11:59 PM IST"
 */
export function formatIstDisplay(
  dateInput?: string | Date | null,
  options?: { showDateOnly?: boolean; showTimeOnly?: boolean; includeTzLabel?: boolean }
): string {
  if (!dateInput) return 'Not set';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return 'Invalid date';

  const tzLabel = options?.includeTzLabel ?? true;

  if (options?.showDateOnly) {
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  if (options?.showTimeOnly) {
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + (tzLabel ? ' IST' : '');
  }

  const datePart = d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const timePart = d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return `${datePart}, ${timePart}${tzLabel ? ' IST' : ''}`;
}

/**
 * Adds hours to an IST input string ('YYYY-MM-DDTHH:mm')
 * Useful for fast extension presets like +6h, +12h, +24h, +48h.
 */
export function addHoursToIstInput(inputVal: string, hours: number): string {
  if (!inputVal) {
    // If empty, start from current time in IST + hours
    const nowIstEpoch = Date.now() + (hours * 60 * 60 * 1000);
    return formatToIstInput(new Date(nowIstEpoch).toISOString());
  }
  const iso = parseIstInputToIso(inputVal);
  if (!iso) return '';
  const nextDate = new Date(new Date(iso).getTime() + (hours * 60 * 60 * 1000));
  return formatToIstInput(nextDate.toISOString());
}

export const FINE_WINDOW_HOURS = 1;
export const SUPER_FINE_WINDOW_HOURS = 2;
export const FINE_WINDOW_MS = FINE_WINDOW_HOURS * 60 * 60 * 1000;
export const SUPER_FINE_WINDOW_MS = SUPER_FINE_WINDOW_HOURS * 60 * 60 * 1000;
export const FINE_AMOUNT_RS = 500;
export const SUPER_FINE_AMOUNT_RS = 1000;

export type RegistrationDeadlineTier = 'open' | 'fine' | 'super_fine' | 'closed';

export interface DeadlineSchedule {
  regDeadlineIso: string;
  fineEndIso: string;
  superFineEndIso: string;
  regEndMs: number;
  fineEndMs: number;
  superFineEndMs: number;
}

/**
 * Computes the fixed 1h Fine (₹500) and 2h Super Fine (₹1,000) cutoffs from a normal deadline.
 */
export function computeDeadlineSchedule(regDeadlineIso?: string | null): DeadlineSchedule | null {
  if (!regDeadlineIso) return null;
  const regEndMs = new Date(regDeadlineIso).getTime();
  if (Number.isNaN(regEndMs)) return null;
  const fineEndMs = regEndMs + FINE_WINDOW_MS;
  const superFineEndMs = regEndMs + SUPER_FINE_WINDOW_MS;
  return {
    regDeadlineIso: new Date(regEndMs).toISOString(),
    fineEndIso: new Date(fineEndMs).toISOString(),
    superFineEndIso: new Date(superFineEndMs).toISOString(),
    regEndMs,
    fineEndMs,
    superFineEndMs,
  };
}

/**
 * Evaluates which deadline tier & fine amount applies at a given timestamp.
 * - <= normal deadline: 'open' (₹0)
 * - +0h to +1h: 'fine' (₹500)
 * - +1h to +2h: 'super_fine' (₹1,000)
 * - > +2h: 'closed' (locked for all colleges)
 */
export function evaluateDeadlineTierAtTime(
  regDeadlineIso?: string | null,
  atTime: string | Date | number = Date.now()
): {
  tier: RegistrationDeadlineTier;
  fineAmount: 0 | 500 | 1000;
  label: string;
  schedule: DeadlineSchedule | null;
  elapsedMs: number;
} {
  const schedule = computeDeadlineSchedule(regDeadlineIso);
  const atMs =
    typeof atTime === 'number'
      ? atTime
      : atTime instanceof Date
        ? atTime.getTime()
        : new Date(atTime).getTime();

  if (!schedule || Number.isNaN(atMs)) {
    return { tier: 'open', fineAmount: 0, label: 'On Time', schedule, elapsedMs: 0 };
  }

  const elapsedMs = Math.max(0, atMs - schedule.regEndMs);

  if (atMs <= schedule.regEndMs) {
    return { tier: 'open', fineAmount: 0, label: 'On Time', schedule, elapsedMs: 0 };
  }
  if (atMs <= schedule.fineEndMs) {
    return { tier: 'fine', fineAmount: FINE_AMOUNT_RS, label: 'Fine (₹500)', schedule, elapsedMs };
  }
  if (atMs <= schedule.superFineEndMs) {
    return {
      tier: 'super_fine',
      fineAmount: SUPER_FINE_AMOUNT_RS,
      label: 'Super Fine (₹1,000)',
      schedule,
      elapsedMs,
    };
  }
  return {
    tier: 'closed',
    fineAmount: SUPER_FINE_AMOUNT_RS,
    label: 'Super Fine Ended (Locked)',
    schedule,
    elapsedMs,
  };
}

/**
 * Formats a delay/remaining millisecond duration in human-readable form (d / h / m).
 */
export function formatDurationCompact(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalMinutes = Math.floor(safeMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${Math.max(1, mins)}m`;
}

/**
 * Computes live registration deadline status in relation to current time in IST.
 */
export function getDeadlineStatus(
  regDeadlineIso?: string | null,
  _ignoredFineDeadlineIso?: string | null
): {
  status: RegistrationDeadlineTier;
  fineAmount: 0 | 500 | 1000;
  label: string;
  badgeClass: string;
  timeRemainingText: string;
  isCustom: boolean;
  schedule: DeadlineSchedule | null;
} {
  const now = Date.now();
  const evaluated = evaluateDeadlineTierAtTime(regDeadlineIso, now);
  const schedule = evaluated.schedule;

  if (!schedule || evaluated.tier === 'open') {
    const diff = schedule ? schedule.regEndMs - now : 0;
    const timeText = schedule ? `${formatDurationCompact(diff)} left (No Fine)` : 'Open (No Fine)';

    return {
      status: 'open',
      fineAmount: 0,
      label: 'Open (No Fine)',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      timeRemainingText: timeText,
      isCustom: false,
      schedule,
    };
  }

  if (evaluated.tier === 'fine') {
    const diff = schedule.fineEndMs - now;
    return {
      status: 'fine',
      fineAmount: FINE_AMOUNT_RS,
      label: 'Fine Period (₹500)',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      timeRemainingText: `${formatDurationCompact(diff)} left (₹500 Fine)`,
      isCustom: false,
      schedule,
    };
  }

  if (evaluated.tier === 'super_fine') {
    const diff = schedule.superFineEndMs - now;
    return {
      status: 'super_fine',
      fineAmount: SUPER_FINE_AMOUNT_RS,
      label: 'Super Fine (₹1,000)',
      badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25',
      timeRemainingText: `${formatDurationCompact(diff)} left (₹1,000 Super Fine)`,
      isCustom: false,
      schedule,
    };
  }

  return {
    status: 'closed',
    fineAmount: 0,
    label: 'Registration Locked',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    timeRemainingText: 'Super fine period ended — locked',
    isCustom: false,
    schedule,
  };
}

export interface EventDeadlineEvaluation {
  tier: 'upcoming' | 'open' | 'fine' | 'super_fine' | 'closed';
  canRegister: boolean;
  fineAmount: number;
  label: string;
  badgeClass: string;
  timeRemainingText: string;
  diffMs: number;
}

export function evaluateEventDeadlineSetting(
  setting?: {
    start_time?: string | null;
    no_fine_deadline?: string | null;
    fine_deadline?: string | null;
    fine_amount?: number | null;
    has_super_fine?: boolean;
    super_fine_deadline?: string | null;
    super_fine_amount?: number | null;
    is_active?: boolean;
  } | null,
  atTime: string | Date | number = Date.now()
): EventDeadlineEvaluation {
  const atMs =
    typeof atTime === 'number'
      ? atTime
      : atTime instanceof Date
        ? atTime.getTime()
        : new Date(atTime).getTime();

  if (!setting) {
    return {
      tier: 'open',
      canRegister: true,
      fineAmount: 0,
      label: 'Open (No Schedule Restriction)',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      timeRemainingText: 'Always Open',
      diffMs: 0
    };
  }

  // Explicitly disabled by admin
  if (setting.is_active === false) {
    return {
      tier: 'closed',
      canRegister: false,
      fineAmount: 0,
      label: 'Registration Disabled',
      badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      timeRemainingText: 'Registration disabled by fest admin',
      diffMs: 0
    };
  }

  const startMs = setting.start_time ? new Date(setting.start_time).getTime() : 0;
  const noFineMs = setting.no_fine_deadline ? new Date(setting.no_fine_deadline).getTime() : Infinity;
  const fineMs = setting.fine_deadline ? new Date(setting.fine_deadline).getTime() : noFineMs;
  const fineAmt = setting.fine_amount ?? 500;
  const hasSuperFine = Boolean(setting.has_super_fine && setting.super_fine_deadline);
  const superFineMs = hasSuperFine ? new Date(setting.super_fine_deadline!).getTime() : fineMs;
  const superFineAmt = setting.super_fine_amount ?? 1000;

  // 1. Not yet started
  if (startMs > 0 && atMs < startMs) {
    const diff = startMs - atMs;
    return {
      tier: 'upcoming',
      canRegister: false,
      fineAmount: 0,
      label: 'Registration Upcoming',
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      timeRemainingText: `Opens in ${formatDurationCompact(diff)}`,
      diffMs: diff
    };
  }

  // 2. Open without fine
  if (atMs <= noFineMs) {
    const diff = noFineMs - atMs;
    return {
      tier: 'open',
      canRegister: true,
      fineAmount: 0,
      label: 'Open (No Fine)',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      timeRemainingText: `${formatDurationCompact(diff)} left (Free)`,
      diffMs: diff
    };
  }

  // 3. Late Fine window
  if (atMs <= fineMs) {
    const diff = fineMs - atMs;
    return {
      tier: 'fine',
      canRegister: true,
      fineAmount: fineAmt,
      label: `Late Fine Active (₹${fineAmt})`,
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      timeRemainingText: `${formatDurationCompact(diff)} left (₹${fineAmt} Fine)`,
      diffMs: diff
    };
  }

  // 4. Super Fine window (only if super fine is enabled)
  if (hasSuperFine && atMs <= superFineMs) {
    const diff = superFineMs - atMs;
    return {
      tier: 'super_fine',
      canRegister: true,
      fineAmount: superFineAmt,
      label: `Super Fine Active (₹${superFineAmt})`,
      badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25',
      timeRemainingText: `${formatDurationCompact(diff)} left (₹${superFineAmt} Super Fine)`,
      diffMs: diff
    };
  }

  // 5. Complete lockout
  return {
    tier: 'closed',
    canRegister: false,
    fineAmount: hasSuperFine ? superFineAmt : fineAmt,
    label: 'Registration Locked',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    timeRemainingText: hasSuperFine ? 'Super fine period ended — locked' : 'Late fine period ended — locked',
    diffMs: 0
  };
}


/**
 * Evaluates whether the screening link submission window is open, upcoming, or closed.
 * Uses the dedicated `link_submission_deadline` field from event_deadline_settings.
 * Falls back to fine_deadline → no_fine_deadline if link_submission_deadline is not set.
 */
export interface LinkSubmissionDeadlineEvaluation {
  canSubmitLink: boolean;
  label: string;
  badgeClass: string;
  timeRemainingText: string;
  deadlineIso: string | null;
  diffMs: number;
}

export function evaluateLinkSubmissionDeadline(
  setting?: {
    start_time?: string | null;
    link_submission_deadline?: string | null;
    fine_deadline?: string | null;
    no_fine_deadline?: string | null;
    is_active?: boolean;
  } | null,
  atTime: string | Date | number = Date.now()
): LinkSubmissionDeadlineEvaluation {
  const atMs =
    typeof atTime === 'number'
      ? atTime
      : atTime instanceof Date
        ? atTime.getTime()
        : new Date(atTime).getTime();

  if (!setting) {
    return {
      canSubmitLink: true,
      label: 'Link Submission Open',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      timeRemainingText: 'Always Open (no deadline set)',
      deadlineIso: null,
      diffMs: 0,
    };
  }

  // Disabled by admin
  if (setting.is_active === false) {
    return {
      canSubmitLink: false,
      label: 'Link Submission Disabled',
      badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      timeRemainingText: 'Disabled by fest admin',
      deadlineIso: null,
      diffMs: 0,
    };
  }

  // Resolve the effective deadline: prefer dedicated field, fall back to fine/no_fine
  const deadlineIso = setting.link_submission_deadline || setting.fine_deadline || setting.no_fine_deadline || null;
  if (!deadlineIso) {
    return {
      canSubmitLink: true,
      label: 'Link Submission Open',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      timeRemainingText: 'No deadline configured',
      deadlineIso: null,
      diffMs: 0,
    };
  }

  const deadlineMs = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadlineMs)) {
    return {
      canSubmitLink: true,
      label: 'Link Submission Open',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      timeRemainingText: 'Invalid deadline — treating as open',
      deadlineIso,
      diffMs: 0,
    };
  }

  // Not yet started (before registration window opens)
  const startMs = setting.start_time ? new Date(setting.start_time).getTime() : 0;
  if (startMs > 0 && atMs < startMs) {
    const diff = startMs - atMs;
    return {
      canSubmitLink: false,
      label: 'Link Submission Upcoming',
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      timeRemainingText: `Opens in ${formatDurationCompact(diff)}`,
      deadlineIso,
      diffMs: diff,
    };
  }

  // Still within the link submission window
  if (atMs <= deadlineMs) {
    const diff = deadlineMs - atMs;
    return {
      canSubmitLink: true,
      label: 'Link Submission Open',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      timeRemainingText: `${formatDurationCompact(diff)} left to submit link`,
      deadlineIso,
      diffMs: diff,
    };
  }

  // Past the deadline
  return {
    canSubmitLink: false,
    label: 'Link Submission Closed',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    timeRemainingText: 'Link submission deadline has passed',
    deadlineIso,
    diffMs: 0,
  };
}
