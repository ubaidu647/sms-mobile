// Mirror of sms-frontend/src/constants/staffSalary.js. Keep in sync.
import { localYMD } from '../utils/localDate';
import { round2 } from '../utils/money';

export const COMPONENT_TYPES = ['fixed', 'percent'];

export const PAYSLIP_STATUSES = ['draft', 'finalized', 'partially-paid', 'paid', 'cancelled'];

export const PAYSLIP_STATUS_PILL = {
  draft: { bg: '#f3f4f6', fg: '#374151', solid: '#6b7280', label: 'Draft' },
  finalized: { bg: '#dbeafe', fg: '#1e40af', solid: '#2563eb', label: 'Finalized' },
  'partially-paid': {
    bg: '#fef3c7',
    fg: '#92400e',
    solid: '#d97706',
    label: 'Partially Paid',
  },
  paid: { bg: '#dcfce7', fg: '#166534', solid: '#16a34a', label: 'Paid' },
  cancelled: { bg: '#fee2e2', fg: '#991b1b', solid: '#dc2626', label: 'Cancelled' },
};

export const PAYMENT_METHODS = ['cash', 'bank-transfer', 'cheque', 'online', 'other'];

export const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  'bank-transfer': 'Bank Transfer',
  cheque: 'Cheque',
  online: 'Online',
  other: 'Other',
};

export const REFERENCE_REQUIRED_METHODS = ['bank-transfer', 'cheque', 'online'];

export const STAFF_TYPES = ['teaching', 'non-teaching'];

export const STAFF_TYPE_LABELS = {
  teaching: 'Teaching Staff',
  'non-teaching': 'Non-Teaching Staff',
};

export const ABSENT_DEDUCTION_MODES = ['per-day', 'fixed'];

export const POLICY_DEFAULTS = {
  workingDaysPerMonth: 26,
  freeAbsencesPerMonth: 0,
  absentDeductionMode: 'per-day',
  absentDeductionMultiplier: 1,
  absentDeductionAmount: 0,
  freeLatesPerMonth: 0,
  lateGroupSize: 3,
  lateDeductionDays: 0.5,
  halfDayDeductionFactor: 0.5,
  unpaidLeaveDeductionFactor: 1,
  paidLeaveDeductionFactor: 0,
  overtimeBonusPerHour: 0,
  perfectAttendanceBonus: 0,
  isActive: true,
};

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function previousMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function todayISO() {
  return localYMD();
}

export function formatMonth(ym) {
  if (!ym) return '—';
  const [y, m] = String(ym).split('-');
  if (!y || !m) return ym;
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(d.getTime())) return ym;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function formatMoney(n, currency = 'PKR') {
  // Rounded to paisa so float noise (33333 × 7.5%) never shows as 2499.975.
  const num = round2(n);
  const sym = currency === 'PKR' ? '₨' : currency;
  return `${sym} ${num.toLocaleString()}`;
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

// Same validator as the web — used by PolicyPanel.
export function validatePolicyForm(f) {
  if (!(f.workingDaysPerMonth >= 1 && f.workingDaysPerMonth <= 31))
    return 'Working days per month must be between 1 and 31';
  if (!(f.freeAbsencesPerMonth >= 0 && f.freeAbsencesPerMonth <= 31))
    return 'Free absences must be between 0 and 31';
  if (f.lateGroupSize < 1) return 'Late group size must be at least 1';
  const nonNeg = [
    ['absentDeductionMultiplier', 'Absent multiplier'],
    ['absentDeductionAmount', 'Absent amount'],
    ['freeLatesPerMonth', 'Free lates'],
    ['lateDeductionDays', 'Late deduction days'],
    ['overtimeBonusPerHour', 'Overtime bonus'],
    ['perfectAttendanceBonus', 'Perfect attendance bonus'],
  ];
  for (const [k, label] of nonNeg) {
    if (f[k] < 0) return `${label} must be ≥ 0`;
  }
  const factors = [
    ['halfDayDeductionFactor', 'Half-day factor'],
    ['unpaidLeaveDeductionFactor', 'Unpaid-leave factor'],
    ['paidLeaveDeductionFactor', 'Paid-leave factor'],
  ];
  for (const [k, label] of factors) {
    if (!(f[k] >= 0 && f[k] <= 1)) return `${label} must be between 0 and 1`;
  }
  return null;
}
