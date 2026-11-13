/**
 * The record an edit form may open from, or undefined while it must wait.
 *
 * A form takes its defaults once, on mount, and saves every field it shows, so
 * opening it from a cached record writes that record's stale values back. Only
 * a fetch made since this observer mounted counts. `isFetchedAfterMount` alone
 * is not enough: a failed refetch sets it too, with the stale data still there.
 */
export const freshRecord = (detail) =>
  detail.isFetchedAfterMount && !detail.isError ? detail.data?.data : undefined;
