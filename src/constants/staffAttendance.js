// Mirror of sms-frontend/src/constants/staffAttendance.js. Keep in sync.
import { localYM, localYMD } from '../utils/localDate';

export const STAFF_ATTENDANCE_STATUSES = [
  'present',
  'absent',
  'late',
  'leave',
  'half-day',
  'holiday',
];

export const STAFF_LEAVE_TYPES = ['casual', 'sick', 'annual', 'unpaid', 'other'];

export const STAFF_TYPES = ['teaching', 'non-teaching'];

// Status-pill / button styling. Background + foreground used when inactive;
// `solid` is the active-state fill. `icon` is the Feather glyph.
export const STAFF_STATUS_PILL = {
  present: {
    label: 'Present',
    short: 'P',
    bg: '#dcfce7',
    fg: '#166534',
    solid: '#16a34a',
    icon: 'check-circle',
  },
  absent: {
    label: 'Absent',
    short: 'A',
    bg: '#fee2e2',
    fg: '#991b1b',
    solid: '#dc2626',
    icon: 'x-circle',
  },
  late: {
    label: 'Late',
    short: 'L',
    bg: '#fef3c7',
    fg: '#92400e',
    solid: '#f59e0b',
    icon: 'clock',
  },
  'half-day': {
    label: 'Half-day',
    short: 'H',
    bg: '#ffedd5',
    fg: '#9a3412',
    solid: '#f97316',
    icon: 'sun',
  },
  leave: {
    label: 'Leave',
    short: 'Lv',
    bg: '#dbeafe',
    fg: '#1e40af',
    solid: '#2563eb',
    icon: 'calendar',
  },
  holiday: {
    label: 'Holiday',
    short: 'Ho',
    bg: '#e5e7eb',
    fg: '#374151',
    solid: '#6b7280',
    icon: 'flag',
  },
};

// Statuses that require a reason field (optional but surfaced in UI).
export const NEEDS_REASON = ['absent', 'leave', 'half-day', 'late'];

// Statuses where arrival/departure times are meaningful.
export const ALLOWS_TIMES = ['present', 'late', 'half-day'];

export function todayISO() {
  return localYMD();
}

export function currentMonth() {
  return localYM();
}

export function formatWorkedMinutes(mins) {
  if (mins == null) return '—';
  const m = Number(mins);
  if (!Number.isFinite(m) || m <= 0) return '0h';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

export function titleCase(str) {
  if (!str) return '—';
  return str
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('-');
}
