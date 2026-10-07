/**
 * A typed-in mark as the API wants it: a blank field is "no mark" (null),
 * never 0. Turning blank into 0 records a fail the teacher never entered.
 */
export const toMark = (value) =>
  value === '' || value === null || value === undefined ? null : Number(value);

/**
 * What a mark field keeps of a keystroke: digits and one decimal point, with a
 * comma (decimal comma keyboards) read as the point.
 */
export const cleanMarkInput = (value) => {
  const [whole, ...rest] = String(value ?? '')
    .replace(/,/g, '.')
    .replace(/[^0-9.]/g, '')
    .split('.');
  return rest.length ? `${whole}.${rest.join('')}` : whole;
};

/**
 * The students whose typed marks aren't numbers (e.g. a lone "."). Saving must
 * stop on these: sent as-is they'd reach the API as NaN.
 */
export function invalidMarkStudents(students, marks, { hasTheory, hasPractical }) {
  const usesTheory = hasTheory || !hasPractical;
  return students.filter((s) => {
    const m = marks[s._id] || {};
    if (m.isAbsent) return false;
    const bad = (v) => Number.isNaN(toMark(v));
    return (usesTheory && bad(m.theoryObtained)) || (hasPractical && bad(m.practicalObtained));
  });
}

/** Ids of the students who already have a saved result for this paper. */
export const savedStudentIds = (results) =>
  new Set(
    (results || []).map((r) => (typeof r.studentId === 'object' ? r.studentId?._id : r.studentId)),
  );

/**
 * The bulk-entry rows for one paper. A row with no mark at all (and not marked
 * absent) is left out, so saving part of a section leaves the other students
 * untouched instead of giving them 0 / F — unless that student had a saved
 * result: then the marks were wiped on purpose and the row clears it. Throws
 * when a mark isn't a number (see invalidMarkStudents), rather than send NaN.
 */
export function buildMarkEntries(students, marks, { hasTheory, hasPractical, saved }) {
  if (invalidMarkStudents(students, marks, { hasTheory, hasPractical }).length) {
    throw new Error('Some marks are not numbers — check invalidMarkStudents() first');
  }
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

// Edited rows are tracked as a Map of studentId -> edit stamp. A save snapshots
// the map; once it lands only rows still carrying their snapshot stamp are
// released back to the server copy, so a mark typed while the save was in
// flight stays protected from the post-save refetch. Stamps are global so a
// row re-edited after a reset can never match an older snapshot.
let editStamp = 0;

export function noteEdit(edited, studentId) {
  editStamp += 1;
  edited.set(studentId, editStamp);
}

export function releaseSavedEdits(edited, snapshot) {
  snapshot.forEach((stamp, studentId) => {
    if (edited.get(studentId) === stamp) edited.delete(studentId);
  });
}
