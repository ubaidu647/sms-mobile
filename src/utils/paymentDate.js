// Payment dates are calendar days in the user's own timezone. `toISOString()`
// is UTC, which in Pakistan (UTC+5) between 00:00 and 05:00 still reads as
// yesterday, so "today" is built from the local date parts instead.

export function localYMD(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
