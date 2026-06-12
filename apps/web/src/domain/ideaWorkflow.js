/**
 * Idea pipeline workflow — domain rules for status transitions.
 * Maps BASE44/Kanban storage status `ready_4_demo` ↔ workflow `ready_for_demo`.
 */

export const IDEA_STATUSES = Object.freeze([
  'ideas',
  'in_progress',
  'ready_for_demo',
  'blocked',
  'approved',
  'rejected',
]);

/** @type {Record<string, readonly string[]>} */
export const ALLOWED_TRANSITIONS = Object.freeze({
  ideas: ['in_progress', 'blocked', 'rejected'],
  in_progress: ['ready_for_demo', 'blocked', 'rejected'],
  ready_for_demo: ['approved', 'blocked', 'rejected'],
  blocked: ['in_progress'],
  approved: [],
  rejected: ['ideas'],
});

const TERMINAL_STATUSES = new Set(['approved']);

/** BASE44 entity / Kanban column id → workflow status */
const STORAGE_TO_WORKFLOW = Object.freeze({
  ready_4_demo: 'ready_for_demo',
});

/** Workflow status → BASE44 entity / Kanban column id */
const WORKFLOW_TO_STORAGE = Object.freeze({
  ready_for_demo: 'ready_4_demo',
});

const WORKFLOW_FIELD_KEYS = Object.freeze([
  'blocker_reason',
  'rejection_reason',
  'prototype_url',
  'demo_notes',
  'decision_notes',
]);

/**
 * @param {string | null | undefined} value
 */
export function hasTrimmedValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {string} value
 */
export function isValidHttpUrl(value) {
  if (!hasTrimmedValue(value)) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, unknown>} context
 * @returns {Record<string, unknown>}
 */
export function trimWorkflowContext(context = {}) {
  const trimmed = { ...context };
  for (const key of WORKFLOW_FIELD_KEYS) {
    if (typeof trimmed[key] === 'string') {
      trimmed[key] = trimmed[key].trim();
    }
  }
  return trimmed;
}

/** @type {Record<string, (context: Record<string, unknown>) => string | null>} */
const STATUS_REQUIREMENTS = Object.freeze({
  blocked(context) {
    if (!hasTrimmedValue(context.blocker_reason)) {
      return 'Please enter a blocker reason before moving this idea to Blocked.';
    }
    return null;
  },
  rejected(context) {
    if (!hasTrimmedValue(context.rejection_reason)) {
      return 'Please enter a rejection reason before moving this idea to Rejected.';
    }
    return null;
  },
  ready_for_demo(context) {
    if (!hasTrimmedValue(context.prototype_url)) {
      return 'Please enter a prototype URL before moving this idea to Ready for Demo.';
    }
    if (!isValidHttpUrl(context.prototype_url)) {
      return 'Please enter a valid prototype URL (e.g. https://example.com).';
    }
    return null;
  },
  approved(context) {
    const hasNotes =
      hasTrimmedValue(context.demo_notes) || hasTrimmedValue(context.decision_notes);
    if (!hasNotes) {
      return 'Executive decision notes are required before approving this idea.';
    }
    return null;
  },
});

export class WorkflowValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WorkflowValidationError';
  }
}

/**
 * @param {string | null | undefined} status
 * @returns {string}
 */
export function normalizeStatus(status) {
  if (!status) return status;
  return STORAGE_TO_WORKFLOW[status] ?? status;
}

/**
 * @param {string} status — workflow or storage status
 * @returns {string}
 */
export function toStorageStatus(status) {
  const workflow = normalizeStatus(status);
  return WORKFLOW_TO_STORAGE[workflow] ?? workflow;
}

/**
 * @param {string} workflowStatus
 * @param {Record<string, unknown>} [context]
 */
function meetsRequirements(workflowStatus, context = {}) {
  const validate = STATUS_REQUIREMENTS[workflowStatus];
  if (!validate) return null;
  return validate(trimWorkflowContext(context));
}

/**
 * @param {string} fromStatus
 * @param {string} toStatus
 */
export function canTransition(fromStatus, toStatus) {
  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus);

  if (!from || !to || from === to) return false;
  if (TERMINAL_STATUSES.has(from)) return false;

  const allowed = ALLOWED_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * @param {string} status
 * @returns {readonly string[]}
 */
export function getAllowedTransitions(status) {
  const workflow = normalizeStatus(status);
  return ALLOWED_TRANSITIONS[workflow] ?? [];
}

/**
 * @param {string} fromStatus
 * @param {string} toStatus
 * @param {Record<string, unknown>} [context] — idea record and/or metadata overrides
 * @returns {{ valid: true } | { valid: false, message: string }}
 */
export function validateTransition(fromStatus, toStatus, context = {}) {
  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus);

  if (!from || !to) {
    return { valid: false, message: 'Invalid status.' };
  }

  if (from === to) {
    return { valid: false, message: 'Idea is already in this stage.' };
  }

  if (TERMINAL_STATUSES.has(from)) {
    return {
      valid: false,
      message: `Cannot move from ${formatStatusLabel(from)} — this stage is final.`,
    };
  }

  if (!canTransition(from, to)) {
    return {
      valid: false,
      message: `Cannot move from ${formatStatusLabel(from)} to ${formatStatusLabel(to)}.`,
    };
  }

  const requirementError = meetsRequirements(to, context);
  if (requirementError) {
    return { valid: false, message: requirementError };
  }

  return { valid: true };
}

/**
 * Like validateTransition but throws WorkflowValidationError.
 * @param {string} fromStatus
 * @param {string} toStatus
 * @param {Record<string, unknown>} [context]
 */
export function assertTransition(fromStatus, toStatus, context = {}) {
  const result = validateTransition(fromStatus, toStatus, context);
  if (!result.valid) {
    throw new WorkflowValidationError(result.message);
  }
}

/**
 * @param {string} status
 */
function formatStatusLabel(status) {
  const labels = {
    ideas: 'Ideas',
    in_progress: 'In Progress',
    ready_for_demo: 'Ready for Demo',
    blocked: 'Blocked',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return labels[status] ?? status;
}
