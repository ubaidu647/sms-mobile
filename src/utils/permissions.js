// Direct port of web's src/utils/permissions.js — RBAC helpers for the three-tier
// model: <verb>-<resource> branch, <verb>-all-branch-<resource> org,
// <verb>-own-<resource> self.

const splitVerb = (action) => {
  const m = action.match(/^([a-z]+)-(.+)$/);
  if (!m) return null;
  return { verb: m[1], resource: m[2] };
};

const variants = (base) => {
  const parts = splitVerb(base);
  if (!parts) return { base, allBranch: null, own: null };
  return {
    base,
    allBranch: `${parts.verb}-all-branch-${parts.resource}`,
    own: `${parts.verb}-own-${parts.resource}`,
  };
};

export const resolveScope = (role, base) => {
  if (role?.isPredefined) return 'all';
  const actions = role?.actions || [];
  const { allBranch, own } = variants(base);
  if (allBranch && actions.includes(allBranch)) return 'all';
  if (actions.includes(base)) return 'branch';
  if (own && actions.includes(own)) return 'own';
  return 'none';
};

export const canSee = (role, base) => resolveScope(role, base) !== 'none';
export const onlyOwn = (role, base) => resolveScope(role, base) === 'own';
export const isOrgLevel = (role, base) => resolveScope(role, base) === 'all';

export const canEditScope = (role, base) => {
  const scope = resolveScope(role, base);
  return scope === 'all' || scope === 'branch';
};

export const hasAnyAction = (role, keys) => {
  if (role?.isPredefined) return true;
  const actions = role?.actions || [];
  return keys.some((k) => actions.includes(k));
};

// System super-admin — owns the Organizations/Packages/Subscriptions module.
// Matches web middleware which keys off role.name === 'super-admin'.
export const isSuperAdmin = (role) => role?.name === 'super-admin';

// Where a signed-in user lands: super-admins in the system module, everyone
// else on the school dashboard.
export const homeHref = (role) =>
  isSuperAdmin(role) ? '/(app)/system/organizations' : '/(app)/dashboard';

// ── Branch reach ──
// A branch-tier action (`pay-payslip`) only covers records of the user's own
// branch; another branch's record needs the org-tier `*-all-branch-*` action.
// Mirrors the API rule `hasOrgAccess(all) || record.branchId === user.branchId`.

// String id of a populated-or-raw ref (`{ _id }` or an id string).
export const refId = (v) => String((v && typeof v === 'object' ? v._id : v) || '');

export const userBranchIdOf = (user) =>
  String(
    (typeof user?.branchId === 'string' && user.branchId) ||
      user?.branchId?._id ||
      user?.branch?._id ||
      '',
  );

// True when `user` may perform `base` (e.g. 'record-payment') on a record
// belonging to `targetBranchId`. With no target branch known only org reach
// is assumed safe.
export const canActOnBranch = (user, base, targetBranchId) => {
  const scope = resolveScope(user?.role, base);
  if (scope === 'all') return true;
  if (scope !== 'branch') return false;
  const target = refId(targetBranchId);
  const own = userBranchIdOf(user);
  return !!target && !!own && target === own;
};
