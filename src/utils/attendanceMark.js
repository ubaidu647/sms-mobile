// Small rules for the attendance marking panels.

/** Unpaid leave is never paid: an entry of that type has isPaid false. */
export function withUnpaidLeaveRule(entry) {
  return entry?.leaveType === "unpaid" ? { ...entry, isPaid: false } : entry;
}

/**
 * The note for `skippedUnmarked` on POST /attendance/mark: pupils sent by a
 * correct-only caller that had no mark on the date, so were not saved.
 */
export function skippedUnmarkedMessage(n) {
  const count = Number(n) || 0;
  if (count <= 0) return "";
  return `${count} ${count === 1 ? "student was" : "students were"} not saved: no mark on this date to correct`;
}
