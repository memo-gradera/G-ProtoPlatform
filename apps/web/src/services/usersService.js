import { base44 } from '@/api/base44Client';
import { ROLES } from '@/domain/rbac';
import { devDataStore, isDevDataBypassEnabled } from '@/lib/devDataStore';

export const usersService = {
  list() {
    if (isDevDataBypassEnabled()) {
      return Promise.resolve(devDataStore.listUsers());
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
    return base44.entities.User.update(id, { role });
  },
};
