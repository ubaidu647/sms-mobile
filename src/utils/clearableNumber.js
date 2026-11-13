/**
 * A numeric form field on an edit: blank is null, which the API reads as
 * "clear it". `Number('')` would save a 0 instead, and leaving the field out
 * keeps the old value.
 */
export const clearableNumber = (value) =>
  value === null || value === undefined || String(value).trim() === '' ? null : Number(value);
