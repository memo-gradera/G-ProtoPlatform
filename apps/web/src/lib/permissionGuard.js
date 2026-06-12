import { getBase44Client } from '@/api/base44Client';
import { canPerformAction, RbacError } from '@/domain/rbac';
import { isBase44AuthMode, isMsalAuthMode } from '@/lib/authMode';
import { createDevUser, isDevAuthBypassEnabled } from '@/lib/devUser';
import { enrichUserWithRole } from '@/lib/userRole';
import { getSessionUser, setSessionUser } from '@/auth/sessionUser';
import { apiClient } from '@/services/apiClient';
import { normalizeApiUser } from '@/services/apiMappers';

export async function getCurrentUser() {
  if (isDevAuthBypassEnabled()) {
    return createDevUser();
  }

  const cached = getSessionUser();
  if (cached) {
    return cached;
  }

  if (isMsalAuthMode()) {
    const profile = await apiClient.get('/users/me');
    const appUser = normalizeApiUser(profile);
    setSessionUser(appUser);
    return appUser;
  }

  if (!isBase44AuthMode()) {
    throw new RbacError('Authentication required.');
  }

  const client = getBase44Client();
  if (!client) {
    throw new RbacError('Authentication required.');
  }

  const authUser = await client.auth.me();
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
