// Mirror of sms-frontend/src/constants/timetable.js. Keep in sync.
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const DAY_SHORT = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export const PERIOD_TYPES = ['lesson', 'break', 'assembly', 'sports', 'library', 'other'];

export const SLOT_TYPES = [
  'lesson',
  'break',
  'assembly',
  'sports',
  'library',
  'free',
  'exam',
  'other',
];

export const SLOT_PILL = {
  lesson: { bg: '#ccfbf1', fg: '#0f766e', label: 'Lesson' },
  break: { bg: '#fef3c7', fg: '#92400e', label: 'Break' },
  assembly: { bg: '#ede9fe', fg: '#5b21b6', label: 'Assembly' },
  sports: { bg: '#dbeafe', fg: '#1e40af', label: 'Sports' },
  library: { bg: '#eef2ff', fg: '#3730a3', label: 'Library' },
  free: { bg: '#f3f4f6', fg: '#374151', label: 'Free' },
  exam: { bg: '#fee2e2', fg: '#991b1b', label: 'Exam' },
  other: { bg: '#f3f4f6', fg: '#374151', label: 'Other' },
};

export const PERIOD_PILL = {
  lesson: { bg: '#ccfbf1', fg: '#0f766e', label: 'Lesson' },
  break: { bg: '#fef3c7', fg: '#92400e', label: 'Break' },
  assembly: { bg: '#ede9fe', fg: '#5b21b6', label: 'Assembly' },
  sports: { bg: '#dbeafe', fg: '#1e40af', label: 'Sports' },
  library: { bg: '#eef2ff', fg: '#3730a3', label: 'Library' },
  other: { bg: '#f3f4f6', fg: '#374151', label: 'Other' },
};

// The school's academic year (its own start month, else April) — one rule,
// shared with every screen; see utils/academicYear.
export { currentAcademicYear } from '../utils/academicYear';

export function addMinutes(hhmm, minutes) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor((total % (24 * 60)) / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export function isHHmm(v) {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
}

export function titleCase(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
