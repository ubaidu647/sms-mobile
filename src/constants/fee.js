// Mirror of sms-frontend/src/constants/fee.js. Keep in sync.
import { localYMD } from '../utils/localDate';

export const FEE_FREQUENCIES = ['monthly', 'one-time', 'annual', 'quarterly'];

export const PAYMENT_METHODS = ['cash', 'bank-transfer', 'online', 'cheque', 'card', 'other'];

export const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  'bank-transfer': 'Bank Transfer',
  online: 'Online',
  cheque: 'Cheque',
  card: 'Card',
  other: 'Other',
};

export const VOUCHER_STATUSES = ['unpaid', 'partial', 'paid', 'overdue', 'void'];

export const VOUCHER_STATUS_PILL = {
  unpaid: { bg: '#f3f4f6', fg: '#374151', label: 'Unpaid' },
  partial: { bg: '#fef3c7', fg: '#92400e', label: 'Partial' },
  paid: { bg: '#dcfce7', fg: '#166534', label: 'Paid' },
  overdue: { bg: '#fee2e2', fg: '#991b1b', label: 'Overdue' },
  void: { bg: '#111827', fg: '#ffffff', label: 'Void' },
};

export const PAYMENT_METHOD_PILL = {
  cash: { bg: '#d1fae5', fg: '#065f46', label: 'Cash' },
  'bank-transfer': { bg: '#dbeafe', fg: '#1e40af', label: 'Bank' },
  online: { bg: '#eef2ff', fg: '#3730a3', label: 'Online' },
  cheque: { bg: '#ede9fe', fg: '#5b21b6', label: 'Cheque' },
  card: { bg: '#fce7f3', fg: '#9d174d', label: 'Card' },
  other: { bg: '#f3f4f6', fg: '#374151', label: 'Other' },
};

export const REFERENCE_REQUIRED_METHODS = ['bank-transfer', 'cheque', 'online'];

export function currentAcademicYear() {
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function todayYMD() {
  return localYMD();
}

export function toYMD(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export function formatMonth(ym) {
  if (!ym) return '—';
  const [y, m] = String(ym).split('-');
  if (!y || !m) return ym;
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(d.getTime())) return ym;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

export function formatMoney(n) {
  const num = Number(n) || 0;
  return `₨ ${num.toLocaleString()}`;
}

export function titleCase(s) {
  if (!s) return '';
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
}

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];
