// Shapes of the fee voucher generation responses, normalised for the screens.
//
// POST /fee/voucher/generate-section →
//   { total, createdCount, skippedCount, skipped: [{ studentId, studentName?, reason }] }
// POST /fee/voucher/regenerate-section →
//   { total, regeneratedCount, generatedCount, skippedPaymentCount, skippedOtherCount,
//     skippedDueToPayments: [{ studentId, studentName?, voucherId, paidAmount }],
//     skippedOther: [{ studentId, studentName?, reason }] }
// POST /fee/voucher/generate-student → 201 voucher, or 200 { skipped: true, existing }
//   with the reason in the response message.

const asCount = (n) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
const asList = (v) => (Array.isArray(v) ? v : []);

const skipRow = (row, reason) => ({
  studentId: String(row?.studentId ?? ''),
  name: typeof row?.studentName === 'string' && row.studentName ? row.studentName : null,
  reason: reason || 'Skipped',
});

/**
 * One shape for both section runs:
 *   { total, created, regenerated, skippedCount, skipped: [{ studentId, name, reason }] }
 * `regenerated` is null for a plain generate run.
 */
export function normalizeSectionResult(data, mode = 'generate') {
  const d = data && typeof data === 'object' ? data : {};
  if (mode === 'regenerate') {
    const paid = asList(d.skippedDueToPayments).map((r) =>
      skipRow(r, `Has payments (${asCount(r?.paidAmount)} paid) — left unchanged`),
    );
    const other = asList(d.skippedOther).map((r) => skipRow(r, r?.reason));
    const skipped = [...paid, ...other];
    return {
      total: asCount(d.total),
      created: asCount(d.generatedCount),
      regenerated: asCount(d.regeneratedCount),
      skippedCount: Math.max(
        skipped.length,
        asCount(d.skippedPaymentCount) + asCount(d.skippedOtherCount),
      ),
      skipped,
    };
  }
  const skipped = asList(d.skipped).map((r) => skipRow(r, r?.reason));
  return {
    total: asCount(d.total),
    created: asCount(d.createdCount),
    regenerated: null,
    skippedCount: Math.max(skipped.length, asCount(d.skippedCount)),
    skipped,
  };
}

/** One-line summary for a toast. */
export function sectionResultSummary(result) {
  const parts = [`${result.created} created`];
  if (result.regenerated != null) parts.unshift(`${result.regenerated} regenerated`);
  parts.push(`${result.skippedCount} skipped`);
  return parts.join(' · ');
}

/**
 * The single-student generate response: `{ skipped: false }` when a voucher
 * was created, else `{ skipped: true, reason }` (the 200 "not generated" case).
 */
export function studentGenerateOutcome(res) {
  if (res?.data?.skipped === true) {
    const msg = typeof res?.message === 'string' ? res.message : '';
    return {
      skipped: true,
      reason: msg.replace(/^Voucher not generated:\s*/i, '') || 'Voucher not generated',
    };
  }
  return { skipped: false, reason: null };
}

/** The server's message of a failed request, in full. */
export function apiErrorMessage(err, fallback = 'Failed') {
  return err?.response?.data?.message || err?.message || fallback;
}
