// Pure rules for the "which cash/bank account" picker on payment forms (no
// React / RN imports so node tests can load them). The server resolves the
// account itself when a branch keeps one of the kind; with several it asks the
// client to name one (but only when auto-post is on, which the client can't
// see), so the choice is offered and never required here.

/** Only literal cash is cash; every other method moves through a bank account. */
export const methodToCashOrBank = (method) => (method === 'cash' ? 'cash' : 'bank');

/** The accounts a payment by `method` can post to, in server (code) order. */
export function accountsForMethod(accounts, method) {
  const mode = methodToCashOrBank(method);
  return (Array.isArray(accounts) ? accounts : []).filter((a) => a?.category === mode);
}

/**
 * What the picker shows. `accounts` is undefined until the list has loaded.
 * Only 'choose' renders options; the rest leave the form submittable, because
 * the list failing says nothing about whether the server needs a choice. A 403
 * is 'hidden': retrying cannot help, so there is nothing useful to say.
 */
export function accountPickerState({ accounts, method, isLoading, isError, errorStatus }) {
  if (Array.isArray(accounts)) {
    return accountsForMethod(accounts, method).length > 1 ? 'choose' : 'hidden';
  }
  if (isLoading) return 'loading';
  if (isError && errorStatus !== 403) return 'error';
  return 'hidden';
}

/**
 * `selectedId` if it can still be sent for this method, else ''. Clears a choice
 * left behind by a cash ↔ bank switch (the server refuses a head of the wrong
 * kind) or by the list narrowing to one account. An unloaded list clears nothing.
 */
export function keptAccountId(accounts, method, selectedId) {
  if (!selectedId || !Array.isArray(accounts)) return selectedId || '';
  const matching = accountsForMethod(accounts, method);
  if (matching.length < 2) return '';
  return matching.some((a) => a._id === selectedId) ? selectedId : '';
}
