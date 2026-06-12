import { usersService } from '@/services/usersService';

/**
 * Merges app role from the User entity when the auth profile omits it.
 */
export async function enrichUserWithRole(authUser) {
  return usersService.enrichAuthUserWithRole(authUser);
}
