import { base44 } from '@/api/base44Client';
import {
  assertTransition,
  normalizeStatus,
  toStorageStatus,
  trimWorkflowContext,
  WorkflowValidationError,
} from '@/domain/ideaWorkflow';
import { devDataStore, isDevDataBypassEnabled } from '@/lib/devDataStore';
import { assertCanPerformAction } from '@/lib/permissionGuard';
import { ideaStatusHistoryService } from '@/services/ideaStatusHistoryService';
import { isApiBackendEnabled } from '@/services/backendMode';
import { apiClient } from '@/services/apiClient';
import {
  buildTransitionPayload,
  normalizeIdea,
  toApiIdeaStatus,
} from '@/services/apiMappers';

const DEFAULT_SORT = '-created_date';
const DEFAULT_LIMIT = 500;

export { WorkflowValidationError };

function stripStatus(payload = {}) {
  const { status: _status, ...rest } = payload;
  return rest;
}

function mapIdeaPayloadForApi(payload = {}) {
  const mapped = { ...payload };
  if (mapped.status != null) {
    mapped.status = toApiIdeaStatus(mapped.status);
  }
  return mapped;
}

/**
 * Persists non-status idea fields. Status changes must use transitionStatus/moveStage.
 */
export const ideasService = {
  list(options = {}) {
    const { sort = DEFAULT_SORT, limit = DEFAULT_LIMIT } = options;
    if (isDevDataBypassEnabled()) {
      return Promise.resolve(devDataStore.listIdeas({ sort, limit }));
    }
    if (isApiBackendEnabled()) {
      return apiClient.get('/ideas').then((ideas) => ideas.map(normalizeIdea));
    }
    return base44.entities.Idea.list(sort, limit);
  },

  get(id) {
    if (isDevDataBypassEnabled()) {
      return Promise.resolve(devDataStore.getIdea(id));
    }
    if (isApiBackendEnabled()) {
      return apiClient.get(`/ideas/${id}`).then(normalizeIdea);
    }
    return base44.entities.Idea.get(id);
  },

  async create(payload) {
    await assertCanPerformAction('idea.create');
    if (isDevDataBypassEnabled()) {
      return devDataStore.createIdea(payload);
    }
    if (isApiBackendEnabled()) {
      const created = await apiClient.post('/ideas', mapIdeaPayloadForApi(payload));
      return normalizeIdea(created);
    }
    return base44.entities.Idea.create(payload);
  },

  async update(id, payload) {
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'status')) {
      throw new WorkflowValidationError(
        'Status changes must use transitionStatus() or moveStage().',
      );
    }
    const idea = isDevDataBypassEnabled()
      ? devDataStore.getIdea(id)
      : isApiBackendEnabled()
        ? normalizeIdea(await apiClient.get(`/ideas/${id}`))
        : await base44.entities.Idea.get(id);
    await assertCanPerformAction('idea.edit', { idea });
    if (isDevDataBypassEnabled()) {
      return devDataStore.updateIdea(id, payload);
    }
    if (isApiBackendEnabled()) {
      const updated = await apiClient.patch(
        `/ideas/${id}`,
        mapIdeaPayloadForApi(payload),
      );
      return normalizeIdea(updated);
    }
    return base44.entities.Idea.update(id, payload);
  },

  /**
   * Workflow-safe status transition with validation and audit history.
   */
  async transitionStatus(id, targetStatus, options = {}) {
    const { metadata = {}, patch = {} } = options;
    const idea = isDevDataBypassEnabled()
      ? devDataStore.getIdea(id)
      : isApiBackendEnabled()
        ? normalizeIdea(await apiClient.get(`/ideas/${id}`))
        : await base44.entities.Idea.get(id);
    const storageStatus = toStorageStatus(targetStatus);

    const previousStatus = idea.status;

    if (previousStatus === 'rejected' && storageStatus === 'ideas') {
      await assertCanPerformAction('idea.reopen_rejected', { idea });
    } else if (storageStatus === 'approved') {
      await assertCanPerformAction('review.approve', { idea });
    } else if (storageStatus === 'rejected') {
      await assertCanPerformAction('review.reject', { idea });
    } else if (
      previousStatus === 'ready_4_demo' &&
      storageStatus === 'in_progress'
    ) {
      await assertCanPerformAction('review.needs_revision', { idea });
    } else {
      await assertCanPerformAction('idea.transition', {
        idea,
        targetStatus: storageStatus,
      });
    }

    const trimmedPatch = trimWorkflowContext(patch);
    const trimmedMetadata = trimWorkflowContext(metadata);
    const context = { ...idea, ...trimmedMetadata, ...trimmedPatch };

    if (normalizeStatus(previousStatus) === normalizeStatus(storageStatus)) {
      throw new WorkflowValidationError('Idea is already in this stage.');
    }

    assertTransition(previousStatus, storageStatus, context);

    const updatePayload = {
      ...stripStatus(trimmedPatch),
      status: storageStatus,
    };

    if (isApiBackendEnabled()) {
      const transitionBody = buildTransitionPayload(storageStatus, context);
      const updated = await apiClient.post(`/ideas/${id}/transition`, transitionBody);
      return normalizeIdea(updated);
    }

    const updated = isDevDataBypassEnabled()
      ? devDataStore.updateIdea(id, updatePayload)
      : await base44.entities.Idea.update(id, updatePayload);

    await ideaStatusHistoryService.recordTransition({
      idea,
      previousStatus,
      newStatus: storageStatus,
      context,
      metadata: { ...trimmedMetadata, ...stripStatus(trimmedPatch) },
    });

    return updated;
  },

  async moveStage(id, status, metadata = {}) {
    return this.transitionStatus(id, status, { metadata });
  },

  async save(id, formData, originalIdea) {
    const nextStatus = formData.status;
    const patch = trimWorkflowContext(stripStatus(formData));

    if (originalIdea?.status != null && nextStatus !== originalIdea.status) {
      return this.transitionStatus(id, nextStatus, { patch });
    }

    return this.update(id, patch);
  },

  async remove(id) {
    const idea = isDevDataBypassEnabled()
      ? devDataStore.getIdea(id)
      : isApiBackendEnabled()
        ? normalizeIdea(await apiClient.get(`/ideas/${id}`))
        : await base44.entities.Idea.get(id);
    await assertCanPerformAction('idea.delete', { idea });
    if (isDevDataBypassEnabled()) {
      devDataStore.deleteIdea(id);
      return;
    }
    if (isApiBackendEnabled()) {
      await apiClient.delete(`/ideas/${id}`);
      return;
    }
    return base44.entities.Idea.delete(id);
  },
};
