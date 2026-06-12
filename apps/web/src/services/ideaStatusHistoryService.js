import { base44 } from '@/api/base44Client';
import { normalizeStatus } from '@/domain/ideaWorkflow';
import { devDataStore, isDevDataBypassEnabled } from '@/lib/devDataStore';
import { createDevUser, isDevAuthBypassEnabled } from '@/lib/devUser';

const DEFAULT_SORT = '-changed_at';
const DEFAULT_LIMIT = 1000;

const READY_FOR_DEMO_STATUSES = new Set(['ready_4_demo', 'ready_for_demo']);

/**
 * @param {string} newStatus
 * @param {Record<string, unknown>} context
 */
function extractReason(newStatus, context) {
  const workflowStatus = normalizeStatus(newStatus);

  if (workflowStatus === 'blocked') {
    return context.blocker_reason;
  }
  if (workflowStatus === 'rejected') {
    return context.rejection_reason;
  }
  if (workflowStatus === 'approved') {
    return context.demo_notes || context.decision_notes;
  }

  return context.reason;
}

/**
 * @param {Record<string, unknown>} metadata
 */
function buildMetadataString(metadata) {
  const payload = { ...metadata };
  delete payload.changed_by;

  if (Object.keys(payload).length === 0) {
    return null;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return null;
  }
}

async function resolveChangedBy(metadata = {}) {
  if (metadata.changed_by) {
    return String(metadata.changed_by);
  }

  if (isDevAuthBypassEnabled()) {
    const user = createDevUser();
    return user?.email || user?.id || user?.full_name || 'unknown';
  }

  try {
    const user = await base44.auth.me();
    return user?.email || user?.id || user?.full_name || 'unknown';
  } catch {
    return 'unknown';
  }
}

export const ideaStatusHistoryService = {
  list(options = {}) {
    const { sort = DEFAULT_SORT, limit = DEFAULT_LIMIT } = options;
    if (isDevDataBypassEnabled()) {
      return Promise.resolve(devDataStore.listHistory({ sort, limit }));
    }
    return base44.entities.IdeaStatusHistory.list(sort, limit);
  },

  async listByIdea(ideaId, options = {}) {
    if (isDevDataBypassEnabled()) {
      return devDataStore.listHistoryByIdea(ideaId, options);
    }
    const entries = await this.list(options);
    return entries.filter((entry) => entry.idea_id === ideaId);
  },

  async recordTransition({
    idea,
    previousStatus,
    newStatus,
    context = {},
    metadata = {},
  }) {
    const mergedContext = { ...idea, ...context, ...metadata };
    const reason = extractReason(newStatus, mergedContext);
    const changedBy = await resolveChangedBy(metadata);
    const changedAt = new Date().toISOString();

    const workflowStatus = normalizeStatus(newStatus);
    const historyMetadata = buildMetadataString({
      ...metadata,
      ...(mergedContext.prototype_url && workflowStatus === 'ready_for_demo'
        ? { prototype_url: String(mergedContext.prototype_url).trim() }
        : {}),
      ...(workflowStatus === 'approved' && mergedContext.decision_notes
        ? { decision_notes: String(mergedContext.decision_notes).trim() }
        : {}),
    });

    const payload = {
      idea_id: idea.id,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: changedBy,
      changed_at: changedAt,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
      ...(historyMetadata ? { metadata: historyMetadata } : {}),
    };

    if (isDevDataBypassEnabled()) {
      return devDataStore.createHistoryEntry(payload);
    }

    return base44.entities.IdeaStatusHistory.create(payload);
  },

  isReadyForDemoStatus(status) {
    return READY_FOR_DEMO_STATUSES.has(status);
  },
};
