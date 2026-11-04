export const TEACHING_ROLES = ['teacher', 'co-teacher', 'substitute'];

export const ROLE_PILL = {
  teacher: { bg: '#ccfbf1', fg: '#0f766e', label: 'Teacher' },
  'co-teacher': { bg: '#dbeafe', fg: '#1e40af', label: 'Co-teacher' },
  substitute: { bg: '#fef3c7', fg: '#92400e', label: 'Substitute' },
};

export const ACADEMIC_YEAR_REGEX = /^\d{4}-\d{4}$/;

// The school's academic year (its own start month, else April) — one rule,
// shared with every screen; see utils/academicYear.
export { currentAcademicYear } from '../utils/academicYear';

export function fmtDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '—';
  }
}

export function titleCase(s) {
  if (!s) return '';
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
}
