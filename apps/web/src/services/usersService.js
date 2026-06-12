import { base44 } from '@/api/base44Client';
import { ROLES } from '@/domain/rbac';
import { devDataStore, isDevDataBypassEnabled } from '@/lib/devDataStore';
import { isApiBackendEnabled } from '@/services/backendMode';
import { apiClient } from '@/services/apiClient';
import { normalizeApiUser } from '@/services/apiMappers';

export const usersService = {
  async me() {
    if (isDevDataBypassEnabled()) {
      const users = devDataStore.listUsers();
      return users.find((user) => user.id === 'dev-user') ?? users[0] ?? null;
    }
    if (isApiBackendEnabled()) {
      const profile = await apiClient.get('/users/me');
      return normalizeApiUser(profile);
    }
    const authUser = await base44.auth.me();
    return this.enrichAuthUserWithRole(authUser);
  },

  list() {
    if (isDevDataBypassEnabled()) {
      return Promise.resolve(devDataStore.listUsers());
    }
    if (isApiBackendEnabled()) {
      return apiClient.get('/users').then((users) => users.map(normalizeApiUser));
    }
    return base44.entities.User.list();
  },

  /**
   * @param {{ id?: string, email?: string } | string} criteria — auth id/email or email string
   * @returns {Promise<object|null>}
   */
  async getCurrentUserProfile(criteria) {
    const { id, email } =
      typeof criteria === 'string' ? { email: criteria } : criteria ?? {};

    if (!id && !email) {
      return null;
    }

    const users = await this.list();

    if (id) {
      const byId = users.find((user) => user.id === id);
      if (byId) return byId;
    }

    if (email) {
      const normalized = email.toLowerCase();
      return (
        users.find((user) => user.email?.toLowerCase() === normalized) ?? null
      );
    }

    return null;
  },

  /**
   * @param {object|null|undefined} authUser
   * @returns {Promise<object|null>}
   */
  async findProfileForAuthUser(authUser) {
    if (!authUser) return null;
    return this.getCurrentUserProfile({
      id: authUser.id,
      email: authUser.email,
    });
  },

  /**
   * Merges app role from the User entity when the auth profile omits it.
   * @param {object|null|undefined} authUser
   * @returns {Promise<object|null>}
   */
  async enrichAuthUserWithRole(authUser) {
    if (!authUser) return null;
    if (authUser.role && ROLES.includes(authUser.role)) {
      return authUser;
    }

    try {
      const profile = await this.findProfileForAuthUser(authUser);
      return { ...authUser, role: profile?.role || 'viewer' };
    } catch {
      return { ...authUser, role: 'viewer' };
    }
  },

  async updateRole(id, role) {
    const { assertCanPerformAction } = await import('@/lib/permissionGuard');
    await assertCanPerformAction('admin.manage_users');
    if (isDevDataBypassEnabled()) {
      return devDataStore.updateUserRole(id, role);
    }
    if (isApiBackendEnabled()) {
      const updated = await apiClient.patch(`/users/${id}/role`, { role });
      return normalizeApiUser(updated);
    }
    return base44.entities.User.update(id, { role });
  },
};
