import { base44 } from '@/api/base44Client';
import { devDataStore, isDevDataBypassEnabled } from '@/lib/devDataStore';
import { assertCanPerformAction } from '@/lib/permissionGuard';

const DEFAULT_SORT = '-created_date';
const DEFAULT_LIMIT = 500;

export const prototypesService = {
  list(options = {}) {
    const { sort = DEFAULT_SORT, limit = DEFAULT_LIMIT } = options;
    if (isDevDataBypassEnabled()) {
      return Promise.resolve(devDataStore.listPrototypes({ sort, limit }));
    }
    return base44.entities.Prototype.list(sort, limit);
  },

  async create(payload) {
    await assertCanPerformAction('prototype.create');
    if (isDevDataBypassEnabled()) {
      return devDataStore.createPrototype(payload);
    }
    return base44.entities.Prototype.create(payload);
  },

  async update(id, payload) {
    const prototype = isDevDataBypassEnabled()
      ? devDataStore.getPrototype(id)
      : await base44.entities.Prototype.get(id);
    await assertCanPerformAction('prototype.save', {
      prototype,
      previousStatus: prototype.status,
      nextStatus: payload.status ?? prototype.status,
    });
    if (isDevDataBypassEnabled()) {
      return devDataStore.updatePrototype(id, payload);
    }
    return base44.entities.Prototype.update(id, payload);
  },

  async publish(id, payload = {}) {
    const prototype = isDevDataBypassEnabled()
      ? devDataStore.getPrototype(id)
      : await base44.entities.Prototype.get(id);
    await assertCanPerformAction('prototype.publish', { prototype });
    const updatePayload = { status: 'demo_ready', ...payload };
    if (isDevDataBypassEnabled()) {
      return devDataStore.updatePrototype(id, updatePayload);
    }
    return base44.entities.Prototype.update(id, updatePayload);
  },

  async archive(id, payload = {}) {
    const prototype = isDevDataBypassEnabled()
      ? devDataStore.getPrototype(id)
      : await base44.entities.Prototype.get(id);
    await assertCanPerformAction('prototype.archive', { prototype });
    const updatePayload = { status: 'archived', ...payload };
    if (isDevDataBypassEnabled()) {
      return devDataStore.updatePrototype(id, updatePayload);
    }
    return base44.entities.Prototype.update(id, updatePayload);
  },
};
