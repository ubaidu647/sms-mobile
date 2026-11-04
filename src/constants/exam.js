// Mirror of sms-frontend/src/constants/exam.js. Keep in sync.
export const EXAM_TYPES = [
  'mid-term',
  'final',
  'monthly',
  'weekly',
  'mock',
  'pre-board',
  'other',
];

export const EXAM_STATUSES = ['planned', 'in-progress', 'completed', 'published'];

export const EXAM_SUBJECT_STATUSES = ['planned', 'completed', 'graded'];

export const GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'F'];

export const EXAM_STATUS_PILL = {
  planned: { bg: '#f3f4f6', fg: '#374151', solid: '#6b7280', label: 'Planned' },
  'in-progress': { bg: '#dbeafe', fg: '#1e40af', solid: '#2563eb', label: 'In Progress' },
  completed: { bg: '#dcfce7', fg: '#166534', solid: '#16a34a', label: 'Completed' },
  published: { bg: '#ede9fe', fg: '#5b21b6', solid: '#7c3aed', label: 'Published' },
};

export const EXAM_SUBJECT_STATUS_PILL = {
  planned: { bg: '#f3f4f6', fg: '#374151', label: 'Planned' },
  completed: { bg: '#dbeafe', fg: '#1e40af', label: 'Completed' },
  graded: { bg: '#dcfce7', fg: '#166534', label: 'Graded' },
};

export const GRADE_PILL = {
  'A+': { bg: '#d1fae5', fg: '#065f46' },
  A: { bg: '#dcfce7', fg: '#166534' },
  'B+': { bg: '#ecfccb', fg: '#3f6212' },
  B: { bg: '#fef3c7', fg: '#854d0e' },
  'C+': { bg: '#fef3c7', fg: '#92400e' },
  C: { bg: '#ffedd5', fg: '#9a3412' },
  F: { bg: '#fee2e2', fg: '#991b1b' },
};

export function gradeFromPercentage(pct) {
  if (pct == null || Number.isNaN(pct)) return '—';
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C+';
  if (pct >= 40) return 'C';
  return 'F';
}

// The school's academic year (its own start month, else April) — one rule,
// shared with every screen; see utils/academicYear.
export { currentAcademicYear } from '../utils/academicYear';

export const ACADEMIC_YEAR_REGEX = /^\d{4}-\d{4}$/;

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export function toYMD(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function titleCase(s) {
  if (!s) return '';
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
}
