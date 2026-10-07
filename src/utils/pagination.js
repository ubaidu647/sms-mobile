// Server-paged lists: how many pages `total` rows fill. Screens clamp their
// page to this after a delete/void shrinks the list.

/** Number of pages for `total` rows at `limit` per page (always at least 1). */
export function pageCount(total, limit) {
  const size = Math.max(1, Number(limit) || 1);
  const rows = Math.max(0, Number(total) || 0);
  return Math.max(1, Math.ceil(rows / size));
}

