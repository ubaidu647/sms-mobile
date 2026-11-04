export const GRADES = [
  'nursery',
  'kg-1',
  'kg-2',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
];

export const CLASS_TYPES = [
  'pre-primary',
  'primary',
  'middle',
  'secondary',
  'higher-secondary',
];

export const MEDIUMS = ['english', 'urdu', 'arabic', 'other'];

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const TYPE_PILL = {
  'pre-primary': { bg: '#f5d0fe', fg: '#7e22ce' },
  primary: { bg: '#e9d5ff', fg: '#7c3aed' },
  middle: { bg: '#ddd6fe', fg: '#5b21b6' },
  secondary: { bg: '#dbeafe', fg: '#1d4ed8' },
  'higher-secondary': { bg: '#cffafe', fg: '#0e7490' },
};

export const MEDIUM_PILL = {
  english: { bg: '#ccfbf1', fg: '#0f766e' },
  urdu: { bg: '#dcfce7', fg: '#166534' },
  arabic: { bg: '#fef3c7', fg: '#92400e' },
  other: { bg: '#e5e7eb', fg: '#374151' },
};

export const GRADE_PILL_BG = '#dbeafe';
export const GRADE_PILL_FG = '#1d4ed8';

export const STATUS_PILL = {
  active: { bg: '#dcfce7', fg: '#166534', label: 'Active' },
  inactive: { bg: '#fee2e2', fg: '#991b1b', label: 'Inactive' },
};

export function titleCase(str) {
  if (!str) return '—';
  return str
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

// The school's academic year (its own start month, else April) — one rule,
// shared with every screen; see utils/academicYear.
export { currentAcademicYear } from '../utils/academicYear';
