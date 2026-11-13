// Display helpers + status pills for the billing screen.
// Mirror of web src/app/dashboard/system/packages/format.js (RN pill shape).

// Plan and add-on prices and platform invoices are charged by the platform in
// its own currency. They never follow the school's currency setting
// (useSchoolCurrency), which labels the school's own money only. fmtMoney
// prefixes the symbol: "Rs 3,000".
export const PLATFORM_CURRENCY_SYMBOL = 'Rs';

export const fmtMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  const num = n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${PLATFORM_CURRENCY_SYMBOL} ${num}`;
};

export const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '-';

// Effective limit = (customLimits?.X ?? computedLimits.X) + add-on units.
// See src/utils/planAddons.js.
export { effectiveLimit, formatLimit } from '../utils/planAddons';

// Invoice `type` label: 'addon' → "Add-on" (pass the translated label),
// otherwise title case.
export const invoiceTypeLabel = (type, addonLabel = 'Add-on') => {
  if (!type) return '';
  if (type === 'addon') return addonLabel;
  return String(type).charAt(0).toUpperCase() + String(type).slice(1);
};

// Validate a grace-period input. Blank is allowed (means "use default/carry-over").
// Whole number, >= 0. Returns an error string, or '' when ok.
export const validateGraceDays = (raw) => {
  if (raw === '' || raw == null) return '';
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    return 'Grace period must be a whole number of days (0 or more).';
  }
  return '';
};

// Hard-block cutoff = endDate + gracePeriodInDays. Returns a Date, or null.
export const graceCutoff = (endDate, graceDays) => {
  if (!endDate) return null;
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return null;
  const g = Math.max(0, Number(graceDays) || 0);
  return new Date(d.getTime() + g * 24 * 60 * 60 * 1000);
};

export const SUB_STATUS_PILL = {
  trial: { bg: '#dbeafe', fg: '#1e40af' },
  active: { bg: '#dcfce7', fg: '#166534' },
  expired: { bg: '#f3f4f6', fg: '#374151' },
  cancelled: { bg: '#fee2e2', fg: '#991b1b' },
  upgraded: { bg: '#ccfbf1', fg: '#115e59' },
  downgraded: { bg: '#fef3c7', fg: '#92400e' },
};

export const INVOICE_STATUS_PILL = {
  unpaid: { bg: '#fee2e2', fg: '#991b1b' },
  paid: { bg: '#dcfce7', fg: '#166534' },
  void: { bg: '#f3f4f6', fg: '#374151' },
};

export const LIMIT_KEYS = [
  ['noOfStudents', 'Students'],
  ['noOfBranches', 'Branches'],
  ['noOfStaffs', 'Staff'],
  ['noOfSections', 'Sections'],
];

// Comma-joined list of enabled platform keys, or 'None'.
export const platformList = (platforms) =>
  Object.entries(platforms || {})
    .filter(([, on]) => on)
    .map(([k]) => k)
    .join(', ') || 'None';
