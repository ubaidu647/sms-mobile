// Calendar days in the user's own timezone. `toISOString()` is UTC, which in
// Pakistan (UTC+5) between 00:00 and 05:00 still reads as yesterday, so "today"
// is built from the local date parts instead. Arithmetic on 'YYYY-MM-DD'
// strings is done in UTC so it never depends on the device's offset or DST.

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n) => String(n).padStart(2, '0');

/** Local calendar day of `date` as 'YYYY-MM-DD'. */
export function localYMD(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local calendar month of `date` as 'YYYY-MM'. */
export function localYM(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function parseYMD(ymd) {
  const m = YMD_RE.exec(String(ymd ?? '').slice(0, 10));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

const fmtUTC = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** 'YYYY-MM-DD' shifted by `n` days; '' when `ymd` isn't a date. */
export function addDaysYMD(ymd, n) {
  const d = parseYMD(ymd);
  if (!d) return '';
  d.setUTCDate(d.getUTCDate() + n);
  return fmtUTC(d);
}

/** Monday of the week containing `ymd`; '' when `ymd` isn't a date. */
export function startOfWeekYMD(ymd) {
  const d = parseYMD(ymd);
  if (!d) return '';
  const diff = (d.getUTCDay() + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return fmtUTC(d);
}

/**
 * Local day `n` months before `from`, clamped to the end of a shorter month
 * (31 May minus 3 months is 28/29 Feb, not 3 Mar).
 */
export function monthsAgoYMD(n, from = new Date()) {
  const y = from.getFullYear();
  const m = from.getMonth() - n;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return localYMD(new Date(y, m, Math.min(from.getDate(), lastDay)));
}
