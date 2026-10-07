// What of the signed-in user is written to AsyncStorage (unencrypted). Cold
// start only needs enough to route and gate screens before /auth/me answers:
// the role (actions/menus), the account type and the ids that scope queries.
// Name, email, phone etc. are not stored; /auth/me re-fetches the full profile.

const KEEP = ['role', 'type', 'staffType', 'branchName'];
const isIdKey = (k) => k === 'id' || k === '_id' || /(Id|_id)$/.test(k);

export function persistableUser(user) {
  if (!user || typeof user !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(user)) {
    if (KEEP.includes(k) || isIdKey(k)) out[k] = v;
  }
  // Populated refs: keep only their ids (branch name is not personal data).
  if (user.branch && typeof user.branch === 'object') {
    out.branch = { _id: user.branch._id, name: user.branch.name };
  }
  if (user.staff && typeof user.staff === 'object') out.staff = { _id: user.staff._id };
  if (user.branchId && typeof user.branchId === 'object') {
    out.branchId = { _id: user.branchId._id, name: user.branchId.name };
  }
  return out;
}
