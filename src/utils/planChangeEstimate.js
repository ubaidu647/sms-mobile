import { addonPeriodValue, addonRenewalTotal, carriedAddons } from './planAddons.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Preview of a plan change, mirroring createSubscriptionWithInvoice in
 * sms-backend/src/modules/subscription/subscription.helper.ts. The server is
 * authoritative. `invoice` is the current subscription's latest, null if none.
 *
 *   paid, or no invoice  credit for the unused time of the current plan
 *   unpaid               voided on change: only the unused share of the credit
 *                        it consumed comes back
 *   void                 no credit
 *
 * Carried-forward credit always counts, and what the new price cannot absorb
 * carries on to the new subscription.
 *
 * Renewals take `startFrom`:
 *   'today'   (default) as above — the new period starts now.
 *   'endDate' the new period starts when the current one ends: the unused days
 *             stay days, so no credit for them (carried credit still counts).
 *             The server refuses it while the current invoice is unpaid
 *             (`refused: true`). A plan already past its end date renews from
 *             today either way.
 * With `newDurationInDays`, `endDate` is the new period's end.
 *
 * Add-ons (`addons`, each { resource, module?, quantity, unitPrice, paid,
 * removable } as built by addonsWithInvoices; a module add-on is 1 × unitPrice)
 * are billed on invoices of their own:
 *   - the paid ones' unused value is credited — unless the renewal keeps them
 *     and starts at the end date (their days are kept as days);
 *   - `keepAddons` (renewals only) bills them again for the whole new period
 *     at their unit price, rescaled if the period length changes. With
 *     `newFeatures` (the renewed package's `features`), a module add-on the
 *     plan now includes itself is not carried (see carriedAddons);
 *   - an unpaid add-on invoice also refuses `startFrom: 'endDate'`.
 * A package change drops them (leave `keepAddons` false).
 *
 * `newPrice` is what the school will pay: a launch-offer price, or the locked
 * price on a renewal while the lock lasts (see launchOffer.js).
 */
export function estimatePlanChange({
  current,
  invoice,
  newPrice,
  newDurationInDays,
  startFrom = 'today',
  addons = [],
  keepAddons = false,
  newFeatures,
  nowMs = Date.now(),
}) {
  const snap = current?.packageSnapshot;
  if (newPrice == null || snap?.price == null || !current?.endDate) return null;

  // With no cycle length on the snapshot, the server goes by the plan's dates.
  let totalDays = snap.durationInDays ?? 0;
  if (totalDays <= 0 && current.startDate) {
    totalDays = (new Date(current.endDate) - new Date(current.startDate)) / MS_PER_DAY;
  }
  const remainingDays = Math.max(0, (new Date(current.endDate).getTime() - nowMs) / MS_PER_DAY);
  const unusedShare = (amount) =>
    amount > 0 && totalDays > 0 ? round2(amount * (remainingDays / totalDays)) : 0;

  const paid = !invoice || invoice.status === 'paid';
  const extendsPlan = startFrom === 'endDate' && new Date(current.endDate).getTime() > nowMs;
  let unusedCredit = 0;
  if (extendsPlan) {
    // Unused days are kept as days: nothing credited for them.
  } else if (paid) {
    unusedCredit = unusedShare(snap.price);
  } else if (invoice.status === 'unpaid' && invoice.creditApplied > 0) {
    unusedCredit = Math.min(invoice.creditApplied, unusedShare(invoice.creditApplied));
  }

  const addonList = addons ?? [];
  const addonsUnpaid = addonList.some((a) => a.removable);
  const addonValueLeft = round2(
    addonList.reduce(
      (sum, a) => sum + (a.paid ? unusedShare(addonPeriodValue(a)) : 0),
      0,
    ),
  );
  const addonCredit = extendsPlan && keepAddons ? 0 : addonValueLeft;
  const addonCharge = keepAddons
    ? addonRenewalTotal(
        newFeatures === undefined ? addonList : carriedAddons(addonList, newFeatures),
        snap.durationInDays,
        newDurationInDays ?? snap.durationInDays,
      )
    : 0;

  const carried = current.carriedCredit ?? 0;
  const credit = round2(unusedCredit + addonCredit + carried);
  const gross = round2(newPrice + addonCharge);
  const applied = round2(Math.min(credit, gross));

  const periodFrom = extendsPlan ? new Date(current.endDate).getTime() : nowMs;
  const endDate =
    newDurationInDays > 0 ? new Date(periodFrom + newDurationInDays * MS_PER_DAY) : null;

  return {
    credit,
    carriedForward: round2(credit - applied),
    amountDue: round2(gross - applied),
    addonCredit,
    addonCharge,
    direction: newPrice >= snap.price ? 'Upgrade' : 'Downgrade',
    invoiceUnpaid: !paid,
    addonsUnpaid,
    extendsPlan,
    refused: extendsPlan && (!paid || addonsUnpaid),
    endDate,
  };
}
