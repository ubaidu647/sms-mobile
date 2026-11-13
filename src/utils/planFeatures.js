// The plan's add-on module catalogue, client side. Mirror of
// sms-backend/src/shared/planFeatures.ts — keep the key list in sync. The
// backend stays authoritative: a call into a module the plan lacks is refused
// with 403 `PLAN_FEATURE_DISABLED`. This only decides what the menus show.
// Pure (no React Native imports) — covered by planFeatures.test.mjs.

export const PLAN_FEATURE_KEYS = [
  'admissions',
  'certificates',
  'library',
  'inventory',
  'leave',
  'staff-attendance',
  'staff-salary',
  'transport',
  'accounting',
  'whatsapp',
];

/** Saved with every gating list so "no add-ons" is distinguishable from "all". */
export const CORE_FEATURE = 'core';

export const PLAN_FEATURE_DISABLED = 'PLAN_FEATURE_DISABLED';

export const LOCKED_MODULE_DISPLAYS = ['lock', 'hide'];
export const DEFAULT_LOCKED_MODULE_DISPLAY = 'lock';

// English names, for the places that are not translated yet (the locale files
// carry the same names under `planModules.modules`).
export const PLAN_FEATURE_LABELS = {
  admissions: 'Admissions',
  certificates: 'Certificates',
  library: 'Library',
  inventory: 'Inventory',
  leave: 'Leave',
  'staff-attendance': 'Staff Attendance',
  'staff-salary': 'Staff Salary',
  transport: 'Transport',
  accounting: 'Accounting',
  whatsapp: 'WhatsApp',
};

const KNOWN = new Set([CORE_FEATURE, ...PLAN_FEATURE_KEYS]);
const MODULE_KEYS = new Set(PLAN_FEATURE_KEYS);

export const isPlanFeatureKey = (value) => MODULE_KEYS.has(value);

// Role-permission menu keys (constants/rolePermissions.js `AVAILABLE_MENUS`,
// and the `menu` of each `AVAILABLE_ACTIONS` entry) that belong to an add-on.
// Every other menu is core. Keys the mobile app has no screen for yet are
// listed too, so a role created on the web keeps the same meaning here.
export const MENU_FEATURES = {
  admissions: 'admissions',
  certificates: 'certificates',
  library: 'library',
  inventory: 'inventory',
  leave: 'leave',
  'my-leave': 'leave',
  'staff-attendance': 'staff-attendance',
  'salary-dashboard': 'staff-salary',
  'salary-structure': 'staff-salary',
  payslip: 'staff-salary',
  'salary-policy': 'staff-salary',
  vehicle: 'transport',
  route: 'transport',
  'transport-assignment': 'transport',
  account: 'accounting',
  journal: 'accounting',
  'account-mapping': 'accounting',
  'financial-report': 'accounting',
  'accounting-period': 'accounting',
  whatsapp: 'whatsapp',
};

/** The add-on a role menu key belongs to, or null for a core menu. */
export const featureForMenu = (menuKey) => MENU_FEATURES[menuKey] ?? null;

/**
 * The add-on modules a package's stored `features` list opens, or null when it
 * opens all of them (empty list, legacy free text naming no known key, or no
 * list). Same rule as the backend's `enabledPlanFeatures`.
 */
export function enabledPlanFeatures(features) {
  if (!Array.isArray(features) || !features.some((f) => KNOWN.has(f))) return null;
  return PLAN_FEATURE_KEYS.filter((k) => features.includes(k));
}

/**
 * `features` from GET /subscription/me/status: an array of the enabled add-on
 * keys, or null meaning all. Anything else (an older API without the field)
 * is treated as "all" — fail open; the API still refuses what the plan lacks.
 */
export function normalizeStatusFeatures(raw) {
  if (!Array.isArray(raw)) return null;
  return raw.filter(isPlanFeatureKey);
}

/** Whether `key` is open under `features` (null/undefined = all; no key = core). */
export function isFeatureEnabled(features, key) {
  if (!key) return true;
  if (!Array.isArray(features)) return true;
  return features.includes(key);
}

/** 'lock' | 'hide' from a school-settings value; unknown → 'lock'. */
export const normalizeLockedModuleDisplay = (value) =>
  LOCKED_MODULE_DISPLAYS.includes(value) ? value : DEFAULT_LOCKED_MODULE_DISPLAY;

/**
 * How a navigation item for `key` shows: 'open', 'locked' (dimmed with a lock,
 * tap explains) or 'hidden'. `display` is the school's lockedModuleDisplay.
 */
export function navItemState(features, key, display) {
  if (isFeatureEnabled(features, key)) return 'open';
  return normalizeLockedModuleDisplay(display) === 'hide' ? 'hidden' : 'locked';
}

// ── Role forms ──
// Menus/actions of a module the plan lacks are never offered, whatever the
// lock/hide setting. A role that already holds them keeps them: the forms only
// filter what they SHOW, never what they save.

/** Menu definitions (`{ key }`) whose module the plan includes. */
export const filterMenusByPlan = (menus, features) =>
  (menus || []).filter((m) => isFeatureEnabled(features, featureForMenu(m.key)));

/** Action definitions (`{ key, menu }`) whose module the plan includes. */
export const filterActionsByPlan = (actions, features) =>
  (actions || []).filter((a) => isFeatureEnabled(features, featureForMenu(a.menu)));

// ── API errors ──

/** True when the API refused the call because the plan lacks the module. */
export function isPlanFeatureDisabledError(err) {
  const status = err?.response?.status ?? err?.status;
  const code = err?.response?.data?.code ?? err?.code;
  return status === 403 && code === PLAN_FEATURE_DISABLED;
}

// ── System → Packages form ──

/** The modules to show ticked when a package opens in the form. */
export function packageFeatureSelection(features) {
  const enabled = enabledPlanFeatures(features);
  return enabled === null ? [...PLAN_FEATURE_KEYS] : enabled;
}

/** The `features` a package form saves: always `core`, then the ticked modules in catalogue order. */
export const packageFeaturesPayload = (selected) => [
  CORE_FEATURE,
  ...PLAN_FEATURE_KEYS.filter((k) => (selected || []).includes(k)),
];

/**
 * One-line summary of a package's stored `features` for detail rows:
 * "All modules", "Core only (no add-ons)" or the included add-ons' names.
 * `text` overrides the words (translated callers pass `t` results).
 */
export function describePlanFeatures(features, text = {}) {
  const {
    all = 'All modules',
    coreOnly = 'Core only (no add-ons)',
    label = (k) => PLAN_FEATURE_LABELS[k] ?? k,
  } = text;
  const enabled = enabledPlanFeatures(features);
  if (enabled === null) return all;
  if (!enabled.length) return coreOnly;
  return enabled.map(label).join(', ');
}
