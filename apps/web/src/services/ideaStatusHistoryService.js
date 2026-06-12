import { getBase44Client } from '@/api/base44Client';
import { normalizeStatus } from '@/domain/ideaWorkflow';
import { devDataStore, isDevDataBypassEnabled } from '@/lib/devDataStore';
import { createDevUser, isDevAuthBypassEnabled } from '@/lib/devUser';
import { isMsalAuthMode } from '@/lib/authMode';
import { getSessionUser } from '@/auth/sessionUser';
import { isApiBackendEnabled } from '@/services/backendMode';
import { apiClient } from '@/services/apiClient';
import { normalizeHistoryEntry } from '@/services/apiMappers';

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

  if (isMsalAuthMode()) {
    const user = getSessionUser();
    return user?.email || user?.id || user?.full_name || 'unknown';
  }

  const client = getBase44Client();
  if (!client) {
    return 'unknown';
  }

  try {
    const user = await client.auth.me();
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
    if (isApiBackendEnabled()) {
      return Promise.resolve([]);
    }
    const client = getBase44Client();
    if (!client) {
      return Promise.resolve([]);
    }
    return client.entities.IdeaStatusHistory.list(sort, limit);
  },

  async listByIdea(ideaId, options = {}) {
    if (isDevDataBypassEnabled()) {
      return devDataStore.listHistoryByIdea(ideaId, options);
    }
    if (isApiBackendEnabled()) {
      const entries = await apiClient.get(`/ideas/${ideaId}/status-history`);
      return entries.map(normalizeHistoryEntry);
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
    if (isApiBackendEnabled()) {
      return null;
    }

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

    const client = getBase44Client();
    if (!client) {
      return null;
    }

    return client.entities.IdeaStatusHistory.create(payload);
  },

  isReadyForDemoStatus(status) {
    return READY_FOR_DEMO_STATUSES.has(status);
  },
};
