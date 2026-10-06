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
