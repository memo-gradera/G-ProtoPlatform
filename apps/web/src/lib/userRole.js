import { usersService } from '@/services/usersService';
import { isMsalAuthMode } from '@/lib/authMode';
import { isApiBackendEnabled } from '@/services/backendMode';

/**
 * Merges app role from the User entity when the auth profile omits it.
 * In MSAL/API mode the role already comes from GET /api/users/me — never BASE44.
 */
export async function enrichUserWithRole(authUser) {
  if (!authUser) return null;

  if (isMsalAuthMode() || isApiBackendEnabled()) {
    if (authUser.role) {
      return authUser;
    }
    return usersService.me();
  }

  return usersService.enrichAuthUserWithRole(authUser);
}
