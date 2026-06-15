import { getBase44Client } from '@/api/base44Client';
import { ROLES } from '@/domain/rbac';
import { isMsalAuthMode } from '@/lib/authMode';
import { devDataStore, isDevDataBypassEnabled } from '@/lib/devDataStore';
import { isApiBackendEnabled } from '@/services/backendMode';
import { apiClient } from '@/services/apiClient';
import { normalizeApiUser } from '@/services/apiMappers';

function buildAdminUsersQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.role) params.set('role', filters.role);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return query ? `?${query}` : '';
}

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

    const client = getBase44Client();
    if (!client) {
      return null;
    }

    const authUser = await client.auth.me();
    return this.enrichAuthUserWithRole(authUser);
  },

  list(filters = {}) {
    if (isDevDataBypassEnabled()) {
      return Promise.resolve(devDataStore.listUsers(filters));
    }
    if (isApiBackendEnabled()) {
      return apiClient
        .get(`/admin/users${buildAdminUsersQuery(filters)}`)
        .then((users) => users.map(normalizeApiUser));
    }
    const client = getBase44Client();
    if (!client) {
      return Promise.resolve([]);
    }
    return client.entities.User.list();
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

    if (isMsalAuthMode() || isApiBackendEnabled()) {
      if (authUser.role && ROLES.includes(authUser.role)) {
        return authUser;
      }
      try {
        const profile = await this.me();
        return profile ?? { ...authUser, role: 'viewer' };
      } catch {
        return { ...authUser, role: 'viewer' };
      }
    }

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

  async createUser(payload) {
    const { assertCanPerformAction } = await import('@/lib/permissionGuard');
    await assertCanPerformAction('admin.manage_users');
    if (isDevDataBypassEnabled()) {
      return devDataStore.createUser(payload);
    }
    if (isApiBackendEnabled()) {
      const created = await apiClient.post('/admin/users', payload);
      return normalizeApiUser(created);
    }
    const client = getBase44Client();
    if (!client) {
      throw new Error('User management is unavailable in the current backend mode.');
    }
    return client.entities.User.create(payload);
  },

  async updateUser(id, payload) {
    const { assertCanPerformAction } = await import('@/lib/permissionGuard');
    await assertCanPerformAction('admin.manage_users');
    if (isDevDataBypassEnabled()) {
      return devDataStore.updateUser(id, payload);
    }
    if (isApiBackendEnabled()) {
      const updated = await apiClient.patch(`/admin/users/${id}`, payload);
      return normalizeApiUser(updated);
    }
    const client = getBase44Client();
    if (!client) {
      throw new Error('User management is unavailable in the current backend mode.');
    }
    return client.entities.User.update(id, payload);
  },

  async updateUserStatus(id, status) {
    const { assertCanPerformAction } = await import('@/lib/permissionGuard');
    await assertCanPerformAction('admin.manage_users');
    if (isDevDataBypassEnabled()) {
      return devDataStore.updateUserStatus(id, status);
    }
    if (isApiBackendEnabled()) {
      const updated = await apiClient.patch(`/admin/users/${id}/status`, { status });
      return normalizeApiUser(updated);
    }
    throw new Error('User status management is unavailable in the current backend mode.');
  },

  async updateRole(id, role) {
    return this.updateUser(id, { role });
  },
};
