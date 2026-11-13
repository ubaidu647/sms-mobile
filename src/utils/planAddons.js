// Plan add-ons bought in the middle of a plan period: extra units of a plan
// limit (students, branches, staff, sections, storage GB) or one gated module.
// Mirrors sms-backend/src/modules/subscription/subscription.addons.ts; the
// server is authoritative for every figure.

import { PLAN_FEATURE_KEYS, PLAN_FEATURE_LABELS, enabledPlanFeatures } from './planFeatures.js';

const round2 = (n) => Math.round(n * 100) / 100;

/** Limit add-ons, in display order. `storageGB` is counted in GB. */
export const ADDON_RESOURCES = ['noOfStudents', 'noOfBranches', 'noOfStaffs', 'noOfSections', 'storageGB'];

/** `resource` of a module add-on (one gated module, quantity always 1). */
export const MODULE_RESOURCE = 'module';

export const isModuleAddon = (a) => a?.resource === MODULE_RESOURCE;

/** Units an add-on bills: always 1 for a module, else its quantity. */
export const addonUnits = (a) => (isModuleAddon(a) ? 1 : Number(a?.quantity) || 0);

/** Price of an add-on for one whole period: units × unit price. */
export const addonPeriodValue = (a) => round2(addonUnits(a) * (Number(a?.unitPrice) || 0));

/**
 * Extra units per limit. The current-subscription endpoints send them summed
 * as `addonLimits`; history rows only carry the `addons` list, so sum that.
 */
export const addonTotals = (sub) => {
  if (sub?.addonLimits && typeof sub.addonLimits === 'object') return sub.addonLimits;
  const totals = {};
  for (const a of sub?.addons ?? []) {
    if (!a?.resource || isModuleAddon(a)) continue;
    totals[a.resource] = (totals[a.resource] ?? 0) + (Number(a.quantity) || 0);
  }
  return totals;
};

/** The limit before add-ons: the per-school override, else the plan's. null = unknown. */
export const baseLimit = (sub, key) => {
  const v = sub?.customLimits?.[key] ?? sub?.computedLimits?.[key];
  return typeof v === 'number' ? v : null;
};

/**
 * { total, base, extra } for one limit. total = base + extra; null when the
 * plan has no limit on record (shown as ∞).
 */
export const limitBreakdown = (sub, key) => {
  const base = baseLimit(sub, key);
  const extra = Number(addonTotals(sub)?.[key]) || 0;
  return { base, extra, total: base == null ? null : base + extra };
};

/** Effective limit = (customLimits ?? computedLimits) + add-on units. */
export const effectiveLimit = (sub, key) => limitBreakdown(sub, key).total;

/**
 * Display text for a limit: "400 (300 + 100 add-on)" with add-ons, "300"
 * without, "∞" when unknown. `withAddon` formats the add-on case, so callers
 * can pass a translated string.
 */
export const formatLimit = (sub, key, withAddon) => {
  const { base, extra, total } = limitBreakdown(sub, key);
  if (total == null) return '∞';
  if (!extra) return String(total);
  return withAddon
    ? withAddon({ total, base, extra })
    : `${total} (${base} + ${extra} add-on)`;
};

/** [[resource, price]] for every listed (non-null) add-on price, in display order. */
export const listedAddonPrices = (prices) =>
  ADDON_RESOURCES.filter((k) => typeof prices?.[k] === 'number').map((k) => [k, prices[k]]);

/**
 * Join each add-on to its invoice (from the school's invoice list). An add-on
 * can be removed only while it is billed on its own `addon` invoice and that
 * invoice is unpaid; one carried over on a renewal is billed on the renewal
 * invoice and cannot be removed. `invoices` must be loaded: an add-on whose
 * invoice is missing from the list counts as paid (nothing owed).
 */
export const addonsWithInvoices = (addons, invoices) => {
  const byId = new Map((invoices ?? []).map((inv) => [String(inv._id), inv]));
  return (addons ?? []).map((a) => {
    const invoice = a?.invoiceId ? byId.get(String(a.invoiceId?._id ?? a.invoiceId)) ?? null : null;
    return {
      ...a,
      invoice,
      // As the server counts it: no invoice on record means nothing was owed.
      paid: !invoice || invoice.status === 'paid',
      removable: invoice?.type === 'addon' && invoice.status === 'unpaid',
    };
  });
};

/**
 * What kept add-ons add to a renewal bill: Σ quantity × unitPrice for the
 * whole new period, the unit price rescaled when the period length changes
 * (a unit price is per plan period).
 */
export const addonRenewalTotal = (addons, oldDays, newDays) =>
  round2(
    (addons ?? []).reduce((sum, a) => {
      const unit =
        oldDays > 0 && newDays > 0 && oldDays !== newDays
          ? round2((a.unitPrice * newDays) / oldDays)
          : a.unitPrice;
      return sum + round2(addonUnits(a) * (Number(unit) || 0));
    }, 0),
  );

/**
 * The add-ons a renewal carries into a plan with `planFeatures` (the renewed
 * package's stored `features`): every limit add-on, and each module add-on
 * the plan does not include itself (a plan opening every module carries
 * none). Same rule as the backend's mergeAddons.
 */
export const carriedAddons = (addons, planFeatures) => {
  const open = enabledPlanFeatures(planFeatures);
  return (addons ?? []).filter(
    (a) => !isModuleAddon(a) || (open !== null && !!a.module && !open.includes(a.module)),
  );
};

// ── Module add-ons ──

/** English module name ("WhatsApp"); pass `label` for a translated one. */
export const moduleName = (key, label) =>
  label ? label(key) : PLAN_FEATURE_LABELS[key] ?? key ?? 'Module';

/** Keys of the modules opened by add-ons: `addonModules` when sent, else from `addons`. */
export const addonModuleKeys = (sub) => {
  if (Array.isArray(sub?.addonModules)) return sub.addonModules;
  const keys = [];
  for (const a of sub?.addons ?? []) {
    if (isModuleAddon(a) && a.module && !keys.includes(a.module)) keys.push(a.module);
  }
  return keys;
};

/**
 * [{ key, price }] for each module this school could still buy (the server's
 * `buyableModules`), price null when the plan lists none.
 */
export const buyableModuleOffers = (sub) =>
  (Array.isArray(sub?.buyableModules) ? sub.buyableModules : [])
    .filter((k) => PLAN_FEATURE_KEYS.includes(k))
    .map((key) => {
      const p = sub?.moduleAddonPrices?.[key];
      return { key, price: typeof p === 'number' ? p : null };
    });

/**
 * Validate the add-on form and build the quote/purchase body.
 * Blank unit price = use the plan's price (the server refuses when none is
 * listed). A module add-on sends `module` and no quantity.
 * Returns { payload } or { error: 'quantity' | 'unitPrice' | 'resource' | 'module' }.
 */
export const addonPayload = ({ schoolId, resource, module, quantity, unitPrice }) => {
  let payload;
  if (resource === MODULE_RESOURCE) {
    if (!PLAN_FEATURE_KEYS.includes(module)) return { error: 'module' };
    payload = { schoolId, resource, module };
  } else {
    if (!ADDON_RESOURCES.includes(resource)) return { error: 'resource' };
    const q = quantity === '' || quantity == null ? NaN : Number(quantity);
    if (!Number.isInteger(q) || q < 1 || q > 100000) return { error: 'quantity' };
    payload = { schoolId, resource, quantity: q };
  }
  if (unitPrice !== '' && unitPrice != null) {
    const p = Number(unitPrice);
    if (!Number.isFinite(p) || p < 0) return { error: 'unitPrice' };
    payload.unitPrice = p;
  }
  return { payload };
};

/** Package form fields for add-on prices: strings, '' = not listed. */
export const addonPricesToForm = (prices) =>
  Object.fromEntries(
    ADDON_RESOURCES.map((k) => [k, typeof prices?.[k] === 'number' ? String(prices[k]) : '']),
  );

/**
 * Package `addonPrices` body from the form: blank → null (not sold), else a
 * number >= 0. Returns { addonPrices } or { error: resourceKey }.
 */
export const addonPricesPayload = (form) => {
  const addonPrices = {};
  for (const k of ADDON_RESOURCES) {
    const raw = form?.[k];
    if (raw === '' || raw == null || String(raw).trim() === '') {
      addonPrices[k] = null;
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return { error: k };
    addonPrices[k] = n;
  }
  return { addonPrices };
};

/** Package form fields for module add-on prices: strings, '' = not sold. */
export const moduleAddonPricesToForm = (prices) =>
  Object.fromEntries(
    PLAN_FEATURE_KEYS.map((k) => [k, typeof prices?.[k] === 'number' ? String(prices[k]) : '']),
  );

/**
 * Package `moduleAddonPrices` body from the form. Only modules the plan does
 * not include (`included` = the ticked module keys) can be sold; the rest are
 * saved as null. Blank → null, else a number >= 0.
 * Returns { moduleAddonPrices } or { error: moduleKey }.
 */
export const moduleAddonPricesPayload = (form, included = []) => {
  const moduleAddonPrices = {};
  for (const k of PLAN_FEATURE_KEYS) {
    const raw = form?.[k];
    if (included.includes(k) || raw === '' || raw == null || String(raw).trim() === '') {
      moduleAddonPrices[k] = null;
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return { error: k };
    moduleAddonPrices[k] = n;
  }
  return { moduleAddonPrices };
};

/** [[moduleKey, price]] for every listed module price, in catalogue order. */
export const listedModulePrices = (prices) =>
  PLAN_FEATURE_KEYS.filter((k) => typeof prices?.[k] === 'number').map((k) => [k, prices[k]]);
