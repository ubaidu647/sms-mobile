/**
 * The fields of an edit form that differ from what it was opened with.
 *
 * An edit sends only these: re-sending an unchanged value is not harmless —
 * an ended transport assignment refuses any end date, even its own, and a
 * repeated status re-runs its side effects.
 */
export function changedFields(initial, current) {
  const norm = (v) => (v === undefined || v === null ? '' : String(v));
  const changed = {};
  for (const [key, value] of Object.entries(current)) {
    if (norm(value) !== norm(initial[key])) changed[key] = value;
  }
  return changed;
}

/**
 * A transport assignment edit's payload: its changed fields, plus the fee on
 * screen whenever the route or stop changed. Left out, the server re-prices
 * the assignment from the new stop, so the admin would see one fee and save
 * another.
 */
export function assignmentEditChanges(initial, current) {
  const changed = changedFields(initial, current);
  const moved = 'routeId' in changed || 'stopName' in changed;
  const fee = current.monthlyFee;
  if (moved && fee !== undefined && fee !== null && fee !== '') changed.monthlyFee = fee;
  return changed;
}
