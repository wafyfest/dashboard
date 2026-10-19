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

/**
 * Computes live registration deadline status in relation to current time in IST.
 */
export function getDeadlineStatus(
  regDeadlineIso?: string | null,
  fineDeadlineIso?: string | null
): {
  status: 'open' | 'fine' | 'closed';
  label: string;
  badgeClass: string;
  timeRemainingText: string;
  isCustom: boolean;
} {
  const now = Date.now();
  const regTime = regDeadlineIso ? new Date(regDeadlineIso).getTime() : 0;
  const fineTime = fineDeadlineIso ? new Date(fineDeadlineIso).getTime() : 0;

  if (regTime && now <= regTime) {
    const diff = regTime - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    const timeText = days > 0 ? `${days}d ${remHours}h left (No Fine)` : `${hours}h left (No Fine)`;

    return {
      status: 'open',
      label: 'Open (No Fine)',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      timeRemainingText: timeText,
      isCustom: false
    };
  }

  if (fineTime && now <= fineTime) {
    const diff = fineTime - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    const timeText = days > 0 ? `${days}d ${remHours}h left (With Fine)` : `${hours}h left (With Fine)`;

    return {
      status: 'fine',
      label: 'Fine Period Active',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      timeRemainingText: timeText,
      isCustom: false
    };
  }

  return {
    status: 'closed',
    label: 'Registration Closed',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    timeRemainingText: 'Deadline has passed',
    isCustom: false
  };
}
