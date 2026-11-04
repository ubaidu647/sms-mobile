// Academic year ("2025-2026") helpers, matching the backend and the admin web.
//
// A session starts in a fixed month: the one the API reports in force for the
// school (GET /schools/settings → effectiveAcademicYearStartMonth, applied with
// setSchoolAcademicYearStartMonth once the user is signed in), else
// EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH, else April.
// So with an April start, January–March still belong to the year that started
// the previous April. Built from LOCAL date parts.

const DEFAULT_START_MONTH = 4;

/** A 1–12 month number, or null for anything else. */
function monthOrNull(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}

// The signed-in user and their school's start month (in memory only); null
// month = follow the default.
let activeUser = null;
let schoolStartMonth = null;

/**
 * Select whose month applies (useSchoolSettings calls this when the user is
 * known). A different user starts from the default, never the previous
 * school's month.
 */
export function setAcademicYearUser(userKey) {
  const next = userKey ? String(userKey) : null;
  if (next === activeUser) return;
  activeUser = next;
  schoolStartMonth = null;
}

/** The user whose month is in force (null once signed out). */
export function academicYearUser() {
  return activeUser;
}

/** Record the school's start month (1–12), or null to follow the default. */
export function setSchoolAcademicYearStartMonth(month) {
  schoolStartMonth = monthOrNull(month);
}

/**
 * The start month to apply from a /schools/settings payload: the month the
 * API actually uses (`effectiveAcademicYearStartMonth`, including its env
 * fallback), else the school's own setting (null = default).
 */
export function startMonthFromSettings(settings) {
  return (
    monthOrNull(settings?.effectiveAcademicYearStartMonth) ??
    monthOrNull(settings?.academicYearStartMonth)
  );
}

/** Session end: forget the user and their school's month. */
export function clearAcademicYearStartMonth() {
  activeUser = null;
  schoolStartMonth = null;
}

/** The deployment default: EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH, else April. */
export function defaultAcademicYearStartMonth() {
  let raw;
  try {
    // Referenced literally so Expo inlines it into the bundle.
    raw = process.env.EXPO_PUBLIC_ACADEMIC_YEAR_START_MONTH;
  } catch {
    raw = undefined;
  }
  return monthOrNull(raw) ?? DEFAULT_START_MONTH;
}

/** The start month in force: the school's own, else the default. */
export function academicYearStartMonth() {
  return schoolStartMonth ?? defaultAcademicYearStartMonth();
}

/** Academic year containing `date` (default: now), e.g. "2026-2027". */
export function currentAcademicYear(date = new Date(), startMonth = academicYearStartMonth()) {
  const month = date.getMonth() + 1;
  const start =
    month >= (monthOrNull(startMonth) ?? DEFAULT_START_MONTH)
      ? date.getFullYear()
      : date.getFullYear() - 1;
  return `${start}-${start + 1}`;
}
