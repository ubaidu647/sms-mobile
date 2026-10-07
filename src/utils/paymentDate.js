// Payment dates are calendar days in the user's own timezone; see localDate.js.
import { localYMD } from './localDate.js';

export { localYMD };

/** Why `value` can't be used as a payment date, or '' when it can. */
export function paymentDateError(value, today = localYMD()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return 'Payment date must be YYYY-MM-DD';
  const [, y, m, d] = match.map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    return 'Payment date is not a real date';
  }
  if (match[0] > today) return 'Payment date cannot be in the future';
  return '';
}
