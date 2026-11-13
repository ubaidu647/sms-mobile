// Launch offers on a package: the first `maxSchools` schools starting on it
// (signup, assign or change) pay `price`, and keep it on renewals until their
// subscription's `priceLock.until`. A school gets a package's offer once.
// Mirrors sms-backend/src/modules/subscription/subscription.helper.ts
// (resolvePriceLock); the server is authoritative. Pure — covered by
// launchOffer.test.mjs.

const idOf = (v) => (v && typeof v === 'object' ? v._id : v);

/** Slots still free on a package's offer (0 when there is no offer). */
export const launchOfferSlotsLeft = (pkg) => {
  const o = pkg?.launchOffer;
  if (!o || typeof o.maxSchools !== 'number') return 0;
  return Math.max(0, o.maxSchools - (Number(o.claimed) || 0));
};

/** True when a new school starting on `pkg` would get its offer. */
export const launchOfferOpen = (pkg) =>
  !!pkg?.launchOffer?.active &&
  typeof pkg.launchOffer.price === 'number' &&
  launchOfferSlotsLeft(pkg) > 0;

/**
 * Price a school starting on `pkg` pays: the offer price when the offer is
 * open and the super-admin applies it, else the package price. (A school that
 * took this package's offer before gets its old lock instead; only the server
 * knows that.)
 */
export const startPrice = (pkg, applyOffer = true) =>
  applyOffer && launchOfferOpen(pkg) ? pkg.launchOffer.price : pkg?.price;

/**
 * Body fields for the "Apply launch offer" switch on signup / assign /
 * change: `{ launchOffer: false }` when the package's offer is open and the
 * super-admin turned it off; nothing otherwise (the server applies an open
 * offer by default).
 */
export const launchOfferField = (pkg, apply) =>
  launchOfferOpen(pkg) && !apply ? { launchOffer: false } : {};

/** The subscription's price lock while it lasts, else null. */
export const livePriceLock = (sub, nowMs = Date.now()) => {
  const lock = sub?.priceLock;
  if (!lock || typeof lock.price !== 'number' || !lock.until) return null;
  const until = new Date(lock.until).getTime();
  return Number.isFinite(until) && until > nowMs ? lock : null;
};

/**
 * Price a renewal bills: the locked launch price while the lock lasts (a
 * renewal stays on the same package), else the catalog package's current
 * price, else the snapshot's.
 */
export const renewalPrice = (sub, pkg, nowMs = Date.now()) => {
  const lock = livePriceLock(sub, nowMs);
  if (lock && (!pkg || String(idOf(sub?.packageId)) === String(pkg._id))) return lock.price;
  return pkg?.price ?? sub?.packageSnapshot?.price;
};

// ── Package form ──

/** Form fields for a package's offer (strings; `enabled` = offer active). */
export const launchOfferToForm = (offer) => ({
  enabled: !!offer?.active,
  price: typeof offer?.price === 'number' ? String(offer.price) : '',
  maxSchools: typeof offer?.maxSchools === 'number' ? String(offer.maxSchools) : '',
  lockDays: typeof offer?.lockDays === 'number' ? String(offer.lockDays) : '',
});

const blank = (v) => v == null || String(v).trim() === '';

/**
 * `launchOffer` body from the form. All three fields blank → `null` (no offer;
 * removes an existing one) when `hadOffer`, else omitted ({}). Otherwise every
 * field is required: price >= 0, max schools a whole number >= 1, lock days a
 * whole number 1–3650; `enabled` becomes `active` (off pauses the offer and
 * keeps its claimed count). `claimed` is the server's and never sent.
 * Returns { launchOffer } / {} or { error: 'price' | 'maxSchools' | 'lockDays' }.
 */
export const launchOfferPayload = (form, hadOffer = false) => {
  if (blank(form?.price) && blank(form?.maxSchools) && blank(form?.lockDays)) {
    return hadOffer ? { launchOffer: null } : {};
  }
  const price = blank(form.price) ? NaN : Number(form.price);
  if (!Number.isFinite(price) || price < 0) return { error: 'price' };
  const maxSchools = blank(form.maxSchools) ? NaN : Number(form.maxSchools);
  if (!Number.isInteger(maxSchools) || maxSchools < 1) return { error: 'maxSchools' };
  const lockDays = blank(form.lockDays) ? NaN : Number(form.lockDays);
  if (!Number.isInteger(lockDays) || lockDays < 1 || lockDays > 3650) return { error: 'lockDays' };
  return { launchOffer: { active: !!form.enabled, price, maxSchools, lockDays } };
};
