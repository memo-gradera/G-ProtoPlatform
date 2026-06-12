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

const DEFAULT_SORT = '-created_date';
const DEFAULT_LIMIT = 500;

export { WorkflowValidationError };

function stripStatus(payload = {}) {
  const { status: _status, ...rest } = payload;
  return rest;
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
    return base44.entities.Idea.list(sort, limit);
  },

  get(id) {
    if (isDevDataBypassEnabled()) {
      return Promise.resolve(devDataStore.getIdea(id));
    }
    return base44.entities.Idea.get(id);
  },

  async create(payload) {
    await assertCanPerformAction('idea.create');
    if (isDevDataBypassEnabled()) {
      return devDataStore.createIdea(payload);
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
      : await base44.entities.Idea.get(id);
    await assertCanPerformAction('idea.edit', { idea });
    if (isDevDataBypassEnabled()) {
      return devDataStore.updateIdea(id, payload);
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
      : await base44.entities.Idea.get(id);
    await assertCanPerformAction('idea.delete', { idea });
    if (isDevDataBypassEnabled()) {
      devDataStore.deleteIdea(id);
      return;
    }
    return base44.entities.Idea.delete(id);
  },
};
