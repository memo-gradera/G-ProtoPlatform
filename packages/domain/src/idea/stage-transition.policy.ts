import type { IdeaStatus } from "@proto-platform/contracts";

const TRANSITIONS: Record<IdeaStatus, readonly IdeaStatus[]> = {
  ideas: ["in_progress", "blocked", "rejected"],
  in_progress: ["ready_for_demo", "ideas", "blocked", "rejected"],
  ready_for_demo: ["approved", "blocked", "rejected", "in_progress"],
  approved: [],
  blocked: ["in_progress"],
  rejected: [],
};

const TERMINAL_STATUSES: readonly IdeaStatus[] = ["approved", "rejected"];

export function getAllowedIdeaTransitions(from: IdeaStatus): readonly IdeaStatus[] {
  return TRANSITIONS[from];
}

export function canTransitionIdeaStage(
  from: IdeaStatus,
  to: IdeaStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminalIdeaStatus(status: IdeaStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
