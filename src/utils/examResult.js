// Labels for an exam's overall pass/fail. The API fails a student whose
// required paper has no result row at all (`missingCount` on section-summary
// rows, `missingSubjectsCount` on the result-card summary) — say so, rather
// than show a bare FAIL with zero failed subjects.

const count = (v) => Math.max(0, Number(v) || 0);
const papers = (n) => `${n} paper${n === 1 ? '' : 's'}`;

// Section-summary pill: "PASS", "FAIL", "FAIL · 2 failed · 1 paper missing".
export const sectionResultLabel = (row) => {
  if (row?.isPassed) return 'PASS';
  const parts = ['FAIL'];
  const failed = count(row?.failedCount);
  const missing = count(row?.missingCount);
  if (failed) parts.push(`${failed} failed`);
  if (missing) parts.push(`${papers(missing)} missing`);
  return parts.join(' · ');
};

// Result-card reason line, or null when the card has nothing to explain.
export const missingPapersReason = (summary) => {
  if (!summary || summary.isPassed) return null;
  const missing = count(summary.missingSubjectsCount);
  if (!missing) return null;
  return missing === 1
    ? 'Failed: 1 required paper has no result'
    : `Failed: ${missing} required papers have no result`;
};

// Result-card class and section: the exam's class and the section the marks
// were recorded in (`examClass` / `examSection`). An older API without them
// falls back to where the student sits today.
export const resultCardPlacement = (student) => ({
  className: (student?.examClass ?? student?.class)?.name || '',
  sectionName: (student?.examSection ?? student?.section)?.name || '',
});
