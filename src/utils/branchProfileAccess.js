// Who may save the branch-profile form. Mirrors the API's upsert guard
// (branchProfile.controller.ts assertCanUpdateProfile / assertCanCreateProfile):
//   - an existing profile needs an update permission; a branch's first
//     profile needs a create permission — the two are not interchangeable;
//   - `<verb>-all-branch-profile` covers any branch;
//   - `<verb>-branch-profile` covers only the user's own branch;
//   - a predefined (admin) role covers everything.
import { refId, userBranchIdOf } from './permissions.js';

// `targetBranchId` empty means "my own branch" (the my-profile screen sends
// no branchId and the API falls back to the caller's branch).
export const canEditBranchProfile = (user, { profileExists, targetBranchId } = {}) => {
  const role = user?.role;
  if (role?.isPredefined) return true;
  const actions = role?.actions || [];
  const verb = profileExists ? 'update' : 'create';
  if (actions.includes(`${verb}-all-branch-profile`)) return true;
  if (!actions.includes(`${verb}-branch-profile`)) return false;
  const own = userBranchIdOf(user);
  if (!own) return false;
  const target = refId(targetBranchId);
  return !target || target === own;
};
