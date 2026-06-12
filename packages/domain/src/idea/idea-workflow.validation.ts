import type { IdeaStatus } from "@proto-platform/contracts";

const ALLOWED_TRANSITIONS: Record<IdeaStatus, readonly IdeaStatus[]> = {
  ideas: ["in_progress", "blocked", "rejected"],
  in_progress: ["ready_for_demo", "blocked", "rejected"],
  ready_for_demo: ["approved", "blocked", "rejected", "in_progress"],
  approved: [],
  blocked: ["in_progress"],
  rejected: ["ideas"],
};

const TERMINAL_STATUSES = new Set<IdeaStatus>(["approved"]);

const WORKFLOW_FIELD_KEYS = [
  "blocker_reason",
  "rejection_reason",
  "prototype_url",
  "demo_notes",
  "decision_notes",
] as const;

export class WorkflowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowValidationError";
  }
}

export function hasTrimmedValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidHttpUrl(value: unknown): boolean {
  if (!hasTrimmedValue(value)) return false;
  try {
    const url = new URL(String(value).trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function trimWorkflowContext(
  context: Record<string, unknown> = {},
): Record<string, unknown> {
  const trimmed = { ...context };
  for (const key of WORKFLOW_FIELD_KEYS) {
    if (typeof trimmed[key] === "string") {
      trimmed[key] = (trimmed[key] as string).trim();
    }
  }
  return trimmed;
}

type RequirementValidator = (context: Record<string, unknown>) => string | null;

const STATUS_REQUIREMENTS: Partial<Record<IdeaStatus, RequirementValidator>> = {
  blocked(context) {
    if (!hasTrimmedValue(context.blocker_reason)) {
      return "Please enter a blocker reason before moving this idea to Blocked.";
    }
    return null;
  },
  rejected(context) {
    if (!hasTrimmedValue(context.rejection_reason)) {
      return "Please enter a rejection reason before moving this idea to Rejected.";
    }
    return null;
  },
  ready_for_demo(context) {
    if (!hasTrimmedValue(context.prototype_url)) {
      return "Please enter a prototype URL before moving this idea to Ready for Demo.";
    }
    if (!isValidHttpUrl(context.prototype_url)) {
      return "Please enter a valid prototype URL (e.g. https://example.com).";
    }
    return null;
  },
  approved(context) {
    const hasNotes =
      hasTrimmedValue(context.demo_notes) ||
      hasTrimmedValue(context.decision_notes);
    if (!hasNotes) {
      return "Executive decision notes are required before approving this idea.";
    }
    return null;
  },
};

export function normalizeIdeaStatus(status: string | null | undefined): IdeaStatus | null {
  if (!status) return null;
  if (status === "ready_4_demo") return "ready_for_demo";
  return status as IdeaStatus;
}

export function canTransitionIdeaWorkflow(
  fromStatus: string,
  toStatus: string,
): boolean {
  const from = normalizeIdeaStatus(fromStatus);
  const to = normalizeIdeaStatus(toStatus);
  if (!from || !to || from === to) return false;
  if (TERMINAL_STATUSES.has(from)) return false;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAllowedIdeaWorkflowTransitions(
  status: string,
): readonly IdeaStatus[] {
  const workflow = normalizeIdeaStatus(status);
  if (!workflow) return [];
  return ALLOWED_TRANSITIONS[workflow] ?? [];
}

export type TransitionValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validateIdeaTransition(
  fromStatus: string,
  toStatus: string,
  context: Record<string, unknown> = {},
): TransitionValidationResult {
  const from = normalizeIdeaStatus(fromStatus);
  const to = normalizeIdeaStatus(toStatus);

  if (!from || !to) {
    return { valid: false, message: "Invalid status." };
  }

  if (from === to) {
    return { valid: false, message: "Idea is already in this stage." };
  }

  if (TERMINAL_STATUSES.has(from)) {
    return {
      valid: false,
      message: `Cannot move from ${formatStatusLabel(from)} — this stage is final.`,
    };
  }

  if (!canTransitionIdeaWorkflow(from, to)) {
    return {
      valid: false,
      message: `Cannot move from ${formatStatusLabel(from)} to ${formatStatusLabel(to)}.`,
    };
  }

  const requirementError = STATUS_REQUIREMENTS[to]?.(trimWorkflowContext(context));
  if (requirementError) {
    return { valid: false, message: requirementError };
  }

  return { valid: true };
}

export function assertIdeaTransition(
  fromStatus: string,
  toStatus: string,
  context: Record<string, unknown> = {},
): void {
  const result = validateIdeaTransition(fromStatus, toStatus, context);
  if (!result.valid) {
    throw new WorkflowValidationError(result.message);
  }
}

function formatStatusLabel(status: IdeaStatus): string {
  const labels: Record<IdeaStatus, string> = {
    ideas: "Ideas",
    in_progress: "In Progress",
    ready_for_demo: "Ready for Demo",
    blocked: "Blocked",
    approved: "Approved",
    rejected: "Rejected",
  };
  return labels[status] ?? status;
}
