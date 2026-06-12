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

export function normalizeIdea(idea) {
  if (!idea) return idea;
  return {
    ...idea,
    status: fromApiIdeaStatus(idea.status),
    created_date: idea.created_date ?? idea.created_at,
    updated_date: idea.updated_date ?? idea.updated_at,
  };
}

export function normalizePrototype(prototype) {
  if (!prototype) return prototype;
  return {
    ...prototype,
    status: fromApiPrototypeStatus(prototype.status),
    created_date: prototype.created_date ?? prototype.created_at,
    updated_date: prototype.updated_date ?? prototype.updated_at,
  };
}

export function normalizeHistoryEntry(entry) {
  if (!entry) return entry;
  return {
    ...entry,
    previous_status: fromApiIdeaStatus(entry.previous_status),
    new_status: fromApiIdeaStatus(entry.new_status),
    metadata: entry.metadata ?? entry.metadata_json,
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
    if (context[field] != null && String(context[field]).trim() !== '') {
      payload[field] = String(context[field]).trim();
    }
  }

  return payload;
}

export function normalizeReview(review) {
  if (!review) return review;
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
  };
}
