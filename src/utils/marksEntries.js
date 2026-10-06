/**
 * A typed-in mark as the API wants it: a blank field is "no mark" (null),
 * never 0. Turning blank into 0 records a fail the teacher never entered.
 */
export const toMark = (value) =>
  value === '' || value === null || value === undefined ? null : Number(value);

/** Ids of the students who already have a saved result for this paper. */
export const savedStudentIds = (results) =>
  new Set(
    (results || []).map((r) => (typeof r.studentId === 'object' ? r.studentId?._id : r.studentId)),
  );

/**
 * The bulk-entry rows for one paper. A row with no mark at all (and not marked
 * absent) is left out, so saving part of a section leaves the other students
 * untouched instead of giving them 0 / F — unless that student had a saved
 * result: then the marks were wiped on purpose and the row clears it.
 */
export function buildMarkEntries(students, marks, { hasTheory, hasPractical, saved }) {
  const usesTheory = hasTheory || !hasPractical; // a paper with no split is "theory"
  const entries = [];
  for (const s of students) {
    const m = marks[s._id] || {};
    const entry = { studentId: s._id };
    if (m.isAbsent) {
      entry.isAbsent = true;
    } else {
      const theory = usesTheory ? toMark(m.theoryObtained) : null;
      const practical = hasPractical ? toMark(m.practicalObtained) : null;
      if (theory === null && practical === null) {
        if (saved?.has(s._id)) entries.push({ studentId: s._id, clear: true });
        continue;
      }
      if (usesTheory) entry.theoryObtained = theory;
      if (hasPractical) entry.practicalObtained = practical;
    }
    if (m.remarks) entry.remarks = m.remarks;
    entries.push(entry);
  }
  return entries;
}
