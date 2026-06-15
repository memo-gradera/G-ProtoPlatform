export function toApiIdeaStatus(status) {
  if (status === 'ready_4_demo') return 'ready_for_demo';
  return status;
}

export function fromApiIdeaStatus(status) {
  if (status === 'ready_for_demo') return 'ready_4_demo';
  return status;
}

export function toApiPrototypeStatus(status) {
  if (status === 'demo_ready') return 'published';
  return status;
}

export function fromApiPrototypeStatus(status) {
  if (status === 'published') return 'demo_ready';
  return status;
}

/**
 * @param {string | { full_name?: string, fullName?: string, email?: string } | null | undefined} owner
 */
export function formatIdeaOwnerDisplay(owner) {
  if (owner == null || owner === '') {
    return 'Unassigned';
  }

  if (typeof owner === 'string') {
    return owner;
  }

  if (typeof owner === 'object') {
    return owner.full_name || owner.fullName || owner.email || 'Unassigned';
  }

  return String(owner);
}

/** Alias for idea/prototype/review owner display. */
export const formatOwnerDisplay = formatIdeaOwnerDisplay;

export function normalizeOwnerFields(entity) {
  const ownerObject =
    typeof entity.owner === 'object' && entity.owner !== null ? entity.owner : null;

  const ownerId = ownerObject?.id ?? entity.owner_id ?? null;
  const ownerEmail = ownerObject?.email ?? entity.owner_email ?? null;
  const ownerName =
    ownerObject?.full_name ??
    ownerObject?.fullName ??
    entity.owner_name ??
    null;

  const owner =
    typeof entity.owner === 'string'
      ? entity.owner
      : formatOwnerDisplay(ownerObject);

  return {
    owner_id: ownerId,
    owner_email: ownerEmail,
    owner_name: ownerName,
    owner,
  };
}

export function normalizeIdeaOwnerFields(idea) {
  return normalizeOwnerFields(idea);
}

export function normalizePrototypeOwnerFields(prototype) {
  return normalizeOwnerFields(prototype);
}

export function normalizeRelatedIdeaFields(entity) {
  const relatedObject =
    typeof entity.related_idea === 'object' && entity.related_idea !== null
      ? entity.related_idea
      : null;

  const relatedIdeaId = relatedObject?.id ?? entity.related_idea_id ?? null;
  const relatedIdeaName =
    relatedObject?.solution_name ??
    relatedObject?.solutionName ??
    entity.related_idea_name ??
    entity.related_idea_solution_name ??
    null;

  const relatedIdea =
    typeof entity.related_idea === 'string'
      ? entity.related_idea
      : relatedIdeaName;

  return {
    related_idea_id: relatedIdeaId,
    related_idea_name: relatedIdeaName,
    related_idea_solution_name: relatedIdeaName,
    related_idea: relatedIdea,
  };
}

export function getIdeaOwnerLabel(idea) {
  if (!idea) return 'Unassigned';
  return formatOwnerDisplay(idea.owner ?? idea.owner_name ?? idea.owner_email);
}

export function getPrototypeOwnerLabel(prototype) {
  if (!prototype) return 'Unassigned';
  return formatOwnerDisplay(
    prototype.owner ?? prototype.owner_name ?? prototype.owner_email,
  );
}

export function getPrototypeRelatedIdeaLabel(prototype) {
  if (!prototype) return '';
  if (typeof prototype.related_idea === 'string') {
    return prototype.related_idea;
  }
  return (
    prototype.related_idea_name ??
    prototype.related_idea_solution_name ??
    prototype.related_idea?.solution_name ??
    prototype.related_idea?.solutionName ??
    ''
  );
}

export function mergePrototypeForm(prototype, emptyPrototype = {}) {
  if (!prototype) return { ...emptyPrototype };

  return {
    ...emptyPrototype,
    ...prototype,
    ...normalizeOwnerFields(prototype),
    ...normalizeRelatedIdeaFields(prototype),
    tags: prototype.tags || [],
  };
}

const API_PROTOTYPE_URL_FIELDS = new Set(['demo_url', 'screenshot_url']);

const API_PROTOTYPE_CREATE_FIELDS = new Set([
  'name',
  'description',
  'category',
  'owner_id',
  'demo_url',
  'screenshot_url',
  'related_idea_id',
]);

const API_PROTOTYPE_UPDATE_FIELDS = new Set([
  ...API_PROTOTYPE_CREATE_FIELDS,
  'status',
]);

/**
 * Normalizes user-entered URLs for API zod .url() validation.
 * @param {unknown} value
 * @param {{ allowEmpty?: boolean }} [options]
 * @returns {string | null | undefined}
 */
export function normalizeUrlForApi(value, { allowEmpty = false } = {}) {
  if (value == null) return undefined;

  const trimmed = String(value).trim();
  if (trimmed === '') {
    return allowEmpty ? null : undefined;
  }

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }
    return candidate;
  } catch {
    return undefined;
  }
}

function mapPrototypeFormToApiPayload(form, allowedFields, { allowNullUrls = false } = {}) {
  const payload = {};

  for (const key of allowedFields) {
    if (!Object.prototype.hasOwnProperty.call(form, key)) continue;

    const value = form[key];
    if (value === undefined) continue;

    if (API_PROTOTYPE_URL_FIELDS.has(key)) {
      const normalized = normalizeUrlForApi(value, { allowEmpty: allowNullUrls });
      if (normalized !== undefined) {
        payload[key] = normalized;
      }
      continue;
    }

    if (key === 'related_idea_id') {
      const trimmed = value == null ? '' : String(value).trim();
      if (trimmed === '') {
        if (allowNullUrls) payload[key] = null;
        continue;
      }
      payload[key] = trimmed;
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        if (allowNullUrls) payload[key] = null;
        continue;
      }
      payload[key] = trimmed;
      continue;
    }

    payload[key] = value;
  }

  return payload;
}

/** Maps prototype form data to API create payload. */
export function mapPrototypeFormToApiCreatePayload(form = {}) {
  return mapPrototypeFormToApiPayload(form, API_PROTOTYPE_CREATE_FIELDS);
}

/** Maps prototype form data to API PATCH payload. */
export function mapPrototypeFormToApiUpdatePayload(form = {}) {
  return mapPrototypeFormToApiPayload(form, API_PROTOTYPE_UPDATE_FIELDS, {
    allowNullUrls: true,
  });
}

const API_IDEA_CREATE_FIELDS = new Set([
  'solution_name',
  'description',
  'why_it_matters',
  'target_user',
  'minimum_viable_functionality',
  'value_hypothesis',
  'success_criteria',
  'acceptance_criteria',
  'owner_id',
  'priority',
  'eta_date',
]);

const API_IDEA_UPDATE_FIELDS = new Set([
  ...[...API_IDEA_CREATE_FIELDS].filter((field) => field !== 'owner_id'),
  'prototype_url',
  'demo_notes',
  'decision_notes',
]);

const FRONTEND_TO_API_IDEA_FIELDS = {
  short_description: 'description',
  eta: 'eta_date',
  minimum_viability: 'minimum_viable_functionality',
  what_makes_it_unique: 'value_hypothesis',
};

export function mapPriorityForApi(priority) {
  if (priority === 'critical') return 'urgent';
  return priority;
}

export function normalizeEtaDateForApi(value) {
  if (value == null || String(value).trim() === '') {
    return undefined;
  }

  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
}

function buildMappedIdeaSource(form = {}) {
  const source = { ...form };

  if (source.short_description != null && source.description == null) {
    source.description = source.short_description;
  }
  if (source.eta != null && source.eta_date == null) {
    source.eta_date = normalizeEtaDateForApi(source.eta);
  }
  if (source.minimum_viability && !source.minimum_viable_functionality) {
    source.minimum_viable_functionality = source.minimum_viability;
  }
  if (source.what_makes_it_unique && !source.value_hypothesis) {
    source.value_hypothesis = source.what_makes_it_unique;
  }

  return source;
}

/**
 * Maps frontend idea form data to API create payload (strict schema safe).
 * @param {Record<string, unknown>} form
 */
export function mapIdeaFormToApiCreatePayload(form = {}) {
  return mapIdeaFormToApiPayload(form, API_IDEA_CREATE_FIELDS, { omitEmpty: true });
}

/**
 * Maps frontend idea form data to API PATCH payload (strict schema safe).
 * @param {Record<string, unknown>} form
 */
export function mapIdeaFormToApiUpdatePayload(form = {}) {
  return mapIdeaFormToApiPayload(form, API_IDEA_UPDATE_FIELDS, { omitEmpty: false });
}

function mapIdeaFormToApiPayload(form, allowedFields, { omitEmpty }) {
  const source = buildMappedIdeaSource(form);
  const payload = {};

  for (const [key, value] of Object.entries(source)) {
    if (key === 'status') continue;

    const apiKey = FRONTEND_TO_API_IDEA_FIELDS[key] ?? key;
    if (!allowedFields.has(apiKey)) continue;
    if (value === undefined) continue;

    if (apiKey === 'priority') {
      if (value === '' && omitEmpty) continue;
      payload.priority = mapPriorityForApi(String(value));
      continue;
    }

    if (apiKey === 'eta_date') {
      const normalizedDate = normalizeEtaDateForApi(value);
      if (!normalizedDate) {
        if (!omitEmpty && value === '') {
          payload.eta_date = null;
        }
        continue;
      }
      payload.eta_date = normalizedDate;
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' && omitEmpty) continue;
      payload[apiKey] = trimmed === '' ? null : trimmed;
      continue;
    }

    payload[apiKey] = value;
  }

  delete payload.status;
  return payload;
}

export function formatHistoryChangedBy(changedBy) {
  if (changedBy == null || changedBy === '') {
    return 'System';
  }

  if (typeof changedBy === 'string') {
    return changedBy;
  }

  if (typeof changedBy === 'object') {
    return (
      changedBy.full_name ||
      changedBy.fullName ||
      changedBy.email ||
      'System'
    );
  }

  return String(changedBy);
}

export function normalizeIdea(idea) {
  if (!idea) return idea;
  return {
    ...idea,
    ...normalizeIdeaOwnerFields(idea),
    status: fromApiIdeaStatus(idea.status),
    created_date: idea.created_date ?? idea.created_at,
    updated_date: idea.updated_date ?? idea.updated_at,
    short_description: idea.short_description ?? idea.description ?? '',
    eta: idea.eta ?? idea.eta_date ?? '',
  };
}

export function normalizePrototype(prototype) {
  if (!prototype) return prototype;
  return {
    ...prototype,
    ...normalizePrototypeOwnerFields(prototype),
    ...normalizeRelatedIdeaFields(prototype),
    status: fromApiPrototypeStatus(prototype.status),
    created_date: prototype.created_date ?? prototype.created_at,
    updated_date: prototype.updated_date ?? prototype.updated_at,
    tags:
      prototype.tags ??
      prototype.tag_maps?.map((entry) => entry.tag?.name).filter(Boolean) ??
      [],
  };
}

export function normalizeHistoryEntry(entry) {
  if (!entry) return entry;
  return {
    ...entry,
    previous_status: fromApiIdeaStatus(entry.previous_status),
    new_status: fromApiIdeaStatus(entry.new_status),
    metadata: entry.metadata ?? entry.metadata_json,
    changed_by: formatHistoryChangedBy(entry.changed_by),
  };
}

export function normalizeApiUser(user) {
  if (!user) return user;
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    roles: user.roles,
    status: user.status ?? 'active',
    created_at: user.created_at ?? user.created_date ?? null,
    updated_at: user.updated_at ?? user.updated_date ?? null,
    last_login_at: user.last_login_at ?? null,
  };
}

export function normalizeDashboardKpis(data) {
  const approvalRate =
    data.approval_rate != null
      ? `${Math.round(Number(data.approval_rate) * 100)}%`
      : data.approvalRate ?? '—';

  const avgCycleTime =
    data.average_cycle_time_days != null
      ? `${Math.round(Number(data.average_cycle_time_days))} days`
      : data.avgCycleTime ?? '—';

  return {
    totalIdeas: data.total_ideas ?? data.totalIdeas ?? 0,
    inProgress: data.in_progress_count ?? data.inProgress ?? 0,
    readyForDemo: data.ready_for_demo_count ?? data.readyForDemo ?? 0,
    approved: data.approved_count ?? data.approved ?? 0,
    rejected: data.rejected_count ?? data.rejected ?? 0,
    blocked: data.blocked_count ?? data.blocked ?? 0,
    prototypeCount: data.prototype_count ?? data.prototypeCount ?? 0,
    approvalRate,
    avgCycleTime,
  };
}

export function buildTransitionPayload(targetStatus, context = {}) {
  const payload = {
    status: toApiIdeaStatus(targetStatus),
  };

  const fields = [
    'blocker_reason',
    'rejection_reason',
    'prototype_url',
    'demo_notes',
    'decision_notes',
    'reason',
  ];

  for (const field of fields) {
    if (context[field] == null || String(context[field]).trim() === '') {
      continue;
    }

    if (field === 'prototype_url') {
      const normalized = normalizeUrlForApi(context[field]);
      if (normalized !== undefined) {
        payload[field] = normalized;
      }
      continue;
    }

    payload[field] = String(context[field]).trim();
  }

  return payload;
}

export function normalizeReview(review) {
  if (!review) return review;

  const reviewerFields =
    review.reviewer && typeof review.reviewer === 'object'
      ? normalizeOwnerFields({
          owner: review.reviewer,
          owner_id: review.reviewer_id,
        })
      : null;

  const ideaFields =
    review.idea && typeof review.idea === 'object'
      ? normalizeRelatedIdeaFields({
          related_idea: review.idea,
          related_idea_id: review.idea_id,
        })
      : null;

  const prototypeName =
    typeof review.prototype === 'string'
      ? review.prototype
      : review.prototype?.name ?? review.prototype_name ?? null;

  return {
    id: review.id,
    prototype_id: review.prototype_id,
    idea_id: review.idea_id,
    reviewer_id: review.reviewer_id,
    decision: review.decision,
    decision_notes: review.decision_notes,
    rejection_reason: review.rejection_reason,
    created_at: review.created_at,
    created_date: review.created_date ?? review.created_at,
    reviewer_name: reviewerFields?.owner_name ?? null,
    reviewer_email: reviewerFields?.owner_email ?? null,
    reviewer: reviewerFields?.owner ?? review.reviewer ?? null,
    idea_name: ideaFields?.related_idea_name ?? null,
    idea: ideaFields?.related_idea ?? review.idea ?? null,
    prototype_name: prototypeName,
    prototype: prototypeName,
  };
}
