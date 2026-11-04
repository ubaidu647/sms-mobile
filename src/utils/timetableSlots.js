// Builds the week's slot list for a timetable "replace" save.
//
// The save replaces the section's whole week, so a lesson cell that is left
// out of `slots` is deleted on the server. A cell with a subject but no
// teacher (or a teacher but no subject) must therefore never be dropped
// silently — it is reported as incomplete so the caller can block the save.
// A lesson cell with neither is simply "no lesson" and is left out on purpose.

// `grid[day][periodNumber] = { subjectId, staffId, room, notes }`
// `periodConfig = { workingDays: [...], periods: [{ number, type, name }] }`
export const buildTimetableSlots = (grid, periodConfig) => {
  const slots = [];
  const incomplete = [];
  const days = periodConfig?.workingDays || [];
  const periods = periodConfig?.periods || [];
  days.forEach((day) => {
    periods.forEach((p) => {
      const cell = grid?.[day]?.[p.number];
      if (p.type !== 'lesson') {
        slots.push({ day, periodNumber: p.number, slotType: p.type, customLabel: p.name });
        return;
      }
      const subjectId = cell?.subjectId || '';
      const staffId = cell?.staffId || '';
      if (!subjectId && !staffId) return; // no lesson
      if (!subjectId || !staffId) {
        incomplete.push({
          day,
          periodNumber: p.number,
          periodName: p.name,
          missing: subjectId ? 'teacher' : 'subject',
        });
        return;
      }
      slots.push({
        day,
        periodNumber: p.number,
        slotType: 'lesson',
        subjectId,
        staffId,
        ...(cell.room ? { room: cell.room } : {}),
        ...(cell.notes ? { notes: cell.notes } : {}),
      });
    });
  });
  return { slots, incomplete };
};

// Set of "day:periodNumber" keys, for highlighting incomplete cells.
export const incompleteKeys = (incomplete) =>
  new Set((incomplete || []).map((i) => `${i.day}:${i.periodNumber}`));

// "Monday P2 needs a teacher; Tuesday P4 needs a subject" (first few, then "+N more").
export const describeIncomplete = (incomplete, dayLabels = {}, max = 3) => {
  const list = incomplete || [];
  const shown = list
    .slice(0, max)
    .map((i) => `${dayLabels[i.day] || i.day} P${i.periodNumber} needs a ${i.missing}`);
  const rest = list.length - shown.length;
  return shown.join('; ') + (rest > 0 ? `; +${rest} more` : '');
};
