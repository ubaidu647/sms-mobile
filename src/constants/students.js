import { localYMD } from '../utils/localDate';

export const GENDERS = ['male', 'female', 'other'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const ADMISSION_TYPES = ['new', 'transfer'];

export const ACADEMIC_STATUSES = [
  'enrolled',
  'promoted',
  'transferred',
  'graduated',
  'dropped',
  'suspended',
];

export const ACADEMIC_STATUS_PILL = {
  enrolled: { bg: '#dcfce7', fg: '#166534' },
  promoted: { bg: '#ccfbf1', fg: '#0f766e' },
  transferred: { bg: '#dbeafe', fg: '#1d4ed8' },
  graduated: { bg: '#e9d5ff', fg: '#7c3aed' },
  dropped: { bg: '#fee2e2', fg: '#991b1b' },
  suspended: { bg: '#fef3c7', fg: '#92400e' },
};

export const STATUS_PILL = {
  active: { bg: '#dcfce7', fg: '#166534', label: 'Active' },
  blocked: { bg: '#fee2e2', fg: '#991b1b', label: 'Blocked' },
};

export function titleCase(str) {
  if (!str) return '—';
  return str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export function currentAcademicYear() {
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

export function todayISO() {
  return localYMD();
}
