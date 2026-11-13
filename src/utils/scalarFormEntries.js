const isBlank = (v) => v === '' || v === null || v === undefined;

/**
 * The [field, value] pairs of a form's scalar fields, as multipart strings.
 *
 * A blank field is left out, which the API reads as "leave it unchanged". To
 * clear a field it needs '', so pass `initial` (the values the edit form opened
 * with) and a field emptied there is sent as ''. Only one that had a value:
 * forms opened from a list row hold a partial record, and a field the row did
 * not carry is not one the user emptied. `required` fields, which the API
 * refuses to clear, stay left out.
 */
export function scalarFormEntries(data, fields, { initial, required = [] } = {}) {
  const entries = [];
  for (const field of fields) {
    const value = data[field];
    if (!isBlank(value)) entries.push([field, String(value)]);
    else if (initial && !isBlank(initial[field]) && !required.includes(field))
      entries.push([field, '']);
  }
  return entries;
}

/**
 * The patch for an object the API merges over the stored one (`keys` maps its
 * keys to form fields): filled keys, '' for keys emptied in an edit, and null
 * when there is nothing to send. Emptying every key still sends them all, and a
 * key that was never set stays out, so it cannot trip the API's required check.
 */
export function nestedFormPatch(keys, data, { initial } = {}) {
  const patch = {};
  for (const [key, field] of Object.entries(keys)) {
    const value = data[field];
    if (!isBlank(value)) patch[key] = value;
    else if (initial && !isBlank(initial[field])) patch[key] = '';
  }
  return Object.keys(patch).length ? patch : null;
}

/**
 * The message of the first required field an edit emptied, or null. Such a field
 * is never sent, so saving without this check would report success unchanged.
 * `required` maps form fields to messages.
 */
export function emptiedRequiredMessage(data, initial, required) {
  const field = Object.keys(required).find((f) => isBlank(data[f]) && !isBlank(initial[f]));
  return field ? required[field] : null;
}
