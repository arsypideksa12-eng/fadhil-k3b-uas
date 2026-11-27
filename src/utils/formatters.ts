const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const MONTHS_EN_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats any YYYY-MM-DD string or Date object into DD-MMM-YYYY (e.g., 27-Nov-2026).
 */
export function formatDateDDMMMYYYY(input: string | Date | undefined | null): string {
  if (!input) return '-';

  let year: number;
  let monthIdx: number;
  let day: number;

  if (typeof input === 'string') {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      year = Number(match[1]);
      monthIdx = Number(match[2]) - 1;
      day = Number(match[3]);
    } else {
      const parsed = new Date(input);
      if (Number.isNaN(parsed.getTime())) return input;
      year = parsed.getFullYear();
      monthIdx = parsed.getMonth();
      day = parsed.getDate();
    }
  } else {
    if (Number.isNaN(input.getTime())) return '-';
    year = input.getFullYear();
    monthIdx = input.getMonth();
    day = input.getDate();
  }

  const dd = String(day).padStart(2, '0');
  const mmm = MONTHS_EN_SHORT[monthIdx] ?? MONTHS_SHORT[monthIdx] ?? 'Jan';
  return `${dd}-${mmm}-${year}`;
}

/**
 * Formats YYYY-MM into MMM-YYYY (e.g., Nov-2026).
 */
export function formatMonthMMMYYYY(periodMonth: string): string {
  const match = periodMonth.match(/^(\d{4})-(\d{2})$/);
  if (!match) return periodMonth;
  const year = match[1];
  const mIdx = Number(match[2]) - 1;
  return `${MONTHS_EN_SHORT[mIdx] ?? 'Jan'}-${year}`;
}

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalMonthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getCurrentTimeHHMMSS(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function formatIDR(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

export function countDaysInclusive(startDate: string, endDate: string): number {
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(365, diff));
}

export function isLateCheckIn(
  checkInTime: string,
  scheduleStartTime: string,
  toleranceMinutes: number
): boolean {
  const [inH, inM] = checkInTime.split(':').map(Number);
  const [schH, schM] = scheduleStartTime.split(':').map(Number);
  if ([inH, inM, schH, schM].some((n) => Number.isNaN(n))) return false;
  const inTotal = inH * 60 + inM;
  const limitTotal = schH * 60 + schM + toleranceMinutes;
  return inTotal > limitTotal;
}

export function getDayNameID(date: Date = new Date()): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()] ?? 'Senin';
}

export function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'KH';
}

/**
 * Mirrors firebase-blueprint.json boundary limits for client pre-validation & truncation.
 */
export const BLUEPRINT_LIMITS = {
  idPattern: /^[a-zA-Z0-9_\-]+$/,
  employeeCodePattern: /^[A-Z0-9\-]+$/,
  timeHHMMPattern: /^([01]\d|2[0-3]):[0-5]\d$/,
  dateYYYYMMDDPattern: /^\d{4}-\d{2}-\d{2}$/,
  periodMonthPattern: /^\d{4}-\d{2}$/,
  maxTitle: 100,
  maxName: 120,
  maxDescription: 300,
  maxReason: 500,
  maxPhotoLength: 160000,
} as const;
