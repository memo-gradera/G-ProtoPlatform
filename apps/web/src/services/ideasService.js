import { base44 } from '@/api/base44Client';
import {
  assertTransition,
  normalizeStatus,
  toStorageStatus,
  trimWorkflowContext,
  WorkflowValidationError,
} from '@/domain/ideaWorkflow';
import { devDataStore, isDevDataBypassEnabled } from '@/lib/devDataStore';
import { assertCanPerformAction, getCurrentUser } from '@/lib/permissionGuard';
import { ideaStatusHistoryService } from '@/services/ideaStatusHistoryService';
import { isApiBackendEnabled } from '@/services/backendMode';
import { apiClient } from '@/services/apiClient';
import {
  buildTransitionPayload,
  mapIdeaFormToApiCreatePayload,
  mapIdeaFormToApiUpdatePayload,
  normalizeIdea,
} from '@/services/apiMappers';
import { hasUnrestrictedIdeaTransitions } from '@/domain/rbac';

const DEFAULT_SORT = '-created_date';
const DEFAULT_LIMIT = 500;

export { WorkflowValidationError };

function stripStatus(payload = {}) {
  const { status: _status, ...rest } = payload;
  return rest;
}

const WORKFLOW_PATCH_KEYS = new Set([
  'blocker_reason',
  'rejection_reason',
  'prototype_url',
  'demo_notes',
  'decision_notes',
  'reason',
]);

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
      const created = await apiClient.post(
        '/ideas',
        mapIdeaFormToApiCreatePayload(payload),
      );
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
        mapIdeaFormToApiUpdatePayload(payload),
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
    const user = await getCurrentUser();

    if (hasUnrestrictedIdeaTransitions(user)) {
      await assertCanPerformAction('idea.transition', {
        idea,
        targetStatus: storageStatus,
      });
    } else if (previousStatus === 'rejected' && storageStatus === 'ideas') {
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
      const transitioned = await this.transitionStatus(id, nextStatus, { patch });

      if (!isApiBackendEnabled()) {
        return transitioned;
      }

      const fieldUpdates = mapIdeaFormToApiUpdatePayload(patch);
      const nonWorkflowUpdates = Object.fromEntries(
        Object.entries(fieldUpdates).filter(([key]) => !WORKFLOW_PATCH_KEYS.has(key)),
      );

      if (Object.keys(nonWorkflowUpdates).length === 0) {
        return transitioned;
      }

      return this.update(id, patch);
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
