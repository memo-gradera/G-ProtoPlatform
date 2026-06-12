import { base44 } from '@/api/base44Client';
import { canPerformAction, RbacError } from '@/domain/rbac';
import { createDevUser, isDevAuthBypassEnabled } from '@/lib/devUser';
import { enrichUserWithRole } from '@/lib/userRole';

export async function getCurrentUser() {
  if (isDevAuthBypassEnabled()) {
    return createDevUser();
  }
  const authUser = await base44.auth.me();
  return enrichUserWithRole(authUser);
}

/**
 * @param {string} action
 * @param {object} [resource]
 */
export async function assertCanPerformAction(action, resource = {}) {
  const user = await getCurrentUser();
  if (!canPerformAction(user, action, resource)) {
    throw new RbacError();
  }
  return user;
}
