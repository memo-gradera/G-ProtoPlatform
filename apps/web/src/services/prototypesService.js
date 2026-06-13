import { base44 } from '@/api/base44Client';
import { devDataStore, isDevDataBypassEnabled } from '@/lib/devDataStore';
import { assertCanPerformAction } from '@/lib/permissionGuard';
import { isApiBackendEnabled } from '@/services/backendMode';
import { apiClient } from '@/services/apiClient';
import {
  mapPrototypeFormToApiCreatePayload,
  mapPrototypeFormToApiUpdatePayload,
  normalizePrototype,
  toApiPrototypeStatus,
} from '@/services/apiMappers';

const DEFAULT_SORT = '-created_date';
const DEFAULT_LIMIT = 500;

function mapPrototypePayloadForApi(payload = {}, { isUpdate = false } = {}) {
  const mapped = isUpdate
    ? mapPrototypeFormToApiUpdatePayload(payload)
    : mapPrototypeFormToApiCreatePayload(payload);

  if (mapped.status != null) {
    mapped.status = toApiPrototypeStatus(mapped.status);
  }

  return mapped;
}

export const prototypesService = {
  list(options = {}) {
    const { sort = DEFAULT_SORT, limit = DEFAULT_LIMIT } = options;
    if (isDevDataBypassEnabled()) {
      return Promise.resolve(devDataStore.listPrototypes({ sort, limit }));
    }
    if (isApiBackendEnabled()) {
      return apiClient
        .get('/prototypes')
        .then((items) => items.map(normalizePrototype));
    }
    return base44.entities.Prototype.list(sort, limit);
  },

  get(id) {
    if (isDevDataBypassEnabled()) {
      return Promise.resolve(devDataStore.getPrototype(id));
    }
    if (isApiBackendEnabled()) {
      return apiClient.get(`/prototypes/${id}`).then(normalizePrototype);
    }
    return base44.entities.Prototype.get(id);
  },

  async create(payload) {
    await assertCanPerformAction('prototype.create');
    if (isDevDataBypassEnabled()) {
      return devDataStore.createPrototype(payload);
    }
    if (isApiBackendEnabled()) {
      const created = await apiClient.post(
        '/prototypes',
        mapPrototypePayloadForApi(payload, { isUpdate: false }),
      );
      return normalizePrototype(created);
    }
    return base44.entities.Prototype.create(payload);
  },

  async update(id, payload) {
    const prototype = isDevDataBypassEnabled()
      ? devDataStore.getPrototype(id)
      : isApiBackendEnabled()
        ? normalizePrototype(await apiClient.get(`/prototypes/${id}`))
        : await base44.entities.Prototype.get(id);
    await assertCanPerformAction('prototype.save', {
      prototype,
      previousStatus: prototype.status,
      nextStatus: payload.status ?? prototype.status,
    });
    if (isDevDataBypassEnabled()) {
      return devDataStore.updatePrototype(id, payload);
    }
    if (isApiBackendEnabled()) {
      const updated = await apiClient.patch(
        `/prototypes/${id}`,
        mapPrototypePayloadForApi(payload, { isUpdate: true }),
      );
      return normalizePrototype(updated);
    }
    return base44.entities.Prototype.update(id, payload);
  },

  async publish(id, payload = {}) {
    const prototype = isDevDataBypassEnabled()
      ? devDataStore.getPrototype(id)
      : isApiBackendEnabled()
        ? normalizePrototype(await apiClient.get(`/prototypes/${id}`))
        : await base44.entities.Prototype.get(id);
    await assertCanPerformAction('prototype.publish', { prototype });
    const updatePayload = { status: 'demo_ready', ...payload };
    if (isDevDataBypassEnabled()) {
      return devDataStore.updatePrototype(id, updatePayload);
    }
    if (isApiBackendEnabled()) {
      const updated = await apiClient.post(`/prototypes/${id}/publish`, {});
      return normalizePrototype(updated);
    }
    return base44.entities.Prototype.update(id, updatePayload);
  },

  async archive(id, payload = {}) {
    const prototype = isDevDataBypassEnabled()
      ? devDataStore.getPrototype(id)
      : isApiBackendEnabled()
        ? normalizePrototype(await apiClient.get(`/prototypes/${id}`))
        : await base44.entities.Prototype.get(id);
    await assertCanPerformAction('prototype.archive', { prototype });
    const updatePayload = { status: 'archived', ...payload };
    if (isDevDataBypassEnabled()) {
      return devDataStore.updatePrototype(id, updatePayload);
    }
    if (isApiBackendEnabled()) {
      const updated = await apiClient.post(`/prototypes/${id}/archive`, {});
      return normalizePrototype(updated);
    }
    return base44.entities.Prototype.update(id, updatePayload);
  },
};
