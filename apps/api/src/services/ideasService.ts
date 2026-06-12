import {
  canPerformAction,
  validateIdeaTransition,
  WorkflowValidationError,
} from "@proto-platform/domain";
import type { IdeaStatus } from "@proto-platform/contracts";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors.js";
import type { AuthenticatedUser } from "../types/express.js";
import { ideasRepository } from "../repositories/ideasRepository.js";

function assertIdeaAccess(
  user: AuthenticatedUser,
  action: "idea.create" | "idea.edit" | "idea.transition" | "idea.delete",
  idea?: { ownerId: string; status: string },
  targetStatus?: string,
) {
  const allowed = canPerformAction(user, action, {
    idea: idea ? { ownerId: idea.ownerId, status: idea.status } : undefined,
    targetStatus,
  });
  if (!allowed) {
    throw new ForbiddenError();
  }
}

export const ideasService = {
  async list(_user: AuthenticatedUser) {
    return ideasRepository.list();
  },

  async getById(id: string) {
    const idea = await ideasRepository.getById(id);
    if (!idea) throw new NotFoundError("Idea not found.");
    return idea;
  },

  async create(
    user: AuthenticatedUser,
    input: {
      solutionName: string;
      ownerId?: string;
      description?: string;
      priority?: "low" | "medium" | "high" | "urgent";
      etaDate?: string;
      whyItMatters?: string;
      targetUser?: string;
      minimumViableFunctionality?: string;
      valueHypothesis?: string;
      successCriteria?: string;
      acceptanceCriteria?: string;
    },
  ) {
    assertIdeaAccess(user, "idea.create");

    return ideasRepository.createWithInitialHistory(
      {
        solutionName: input.solutionName,
        ownerId: input.ownerId ?? user.id,
        description: input.description,
        priority: input.priority,
        etaDate: input.etaDate ? new Date(input.etaDate) : undefined,
        whyItMatters: input.whyItMatters,
        targetUser: input.targetUser,
        minimumViableFunctionality: input.minimumViableFunctionality,
        valueHypothesis: input.valueHypothesis,
        successCriteria: input.successCriteria,
        acceptanceCriteria: input.acceptanceCriteria,
      },
      user.id,
    );
  },

  async update(
    user: AuthenticatedUser,
    id: string,
    input: Record<string, unknown>,
  ) {
    if ("status" in input) {
      throw new BadRequestError(
        "Status cannot be changed via PATCH. Use POST /api/ideas/:id/transition.",
      );
    }

    const existing = await ideasRepository.getById(id);
    if (!existing) throw new NotFoundError("Idea not found.");

    assertIdeaAccess(user, "idea.edit", existing);

    const data = {
      solutionName: input.solution_name as string | undefined,
      description: input.description as string | null | undefined,
      whyItMatters: input.why_it_matters as string | null | undefined,
      targetUser: input.target_user as string | null | undefined,
      minimumViableFunctionality: input.minimum_viable_functionality as
        | string
        | null
        | undefined,
      valueHypothesis: input.value_hypothesis as string | null | undefined,
      successCriteria: input.success_criteria as string | null | undefined,
      acceptanceCriteria: input.acceptance_criteria as string | null | undefined,
      priority: input.priority as "low" | "medium" | "high" | "urgent" | undefined,
      etaDate:
        input.eta_date === null
          ? null
          : input.eta_date
            ? new Date(String(input.eta_date))
            : undefined,
      prototypeUrl: input.prototype_url as string | null | undefined,
      demoNotes: input.demo_notes as string | null | undefined,
      decisionNotes: input.decision_notes as string | null | undefined,
    };

    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );

    return ideasRepository.update(id, cleaned, user.id, existing);
  },

  async transition(
    user: AuthenticatedUser,
    id: string,
    input: {
      status: IdeaStatus;
      blocker_reason?: string;
      rejection_reason?: string;
      prototype_url?: string;
      demo_notes?: string;
      decision_notes?: string;
      reason?: string;
    },
  ) {
    const existing = await ideasRepository.getById(id);
    if (!existing) throw new NotFoundError("Idea not found.");

    assertIdeaAccess(user, "idea.transition", existing, input.status);

    const context = {
      blocker_reason: input.blocker_reason ?? existing.blockerReason,
      rejection_reason: input.rejection_reason ?? existing.rejectionReason,
      prototype_url: input.prototype_url ?? existing.prototypeUrl,
      demo_notes: input.demo_notes ?? existing.demoNotes,
      decision_notes: input.decision_notes ?? existing.decisionNotes,
    };

    const validation = validateIdeaTransition(
      existing.status,
      input.status,
      context,
    );
    if (!validation.valid) {
      throw new WorkflowValidationError(validation.message);
    }

    const ideaUpdate = {
      status: input.status,
      blockerReason:
        input.status === "blocked"
          ? input.blocker_reason?.trim() ?? existing.blockerReason
          : input.blocker_reason ?? existing.blockerReason,
      rejectionReason:
        input.status === "rejected"
          ? input.rejection_reason?.trim() ?? existing.rejectionReason
          : input.rejection_reason ?? existing.rejectionReason,
      prototypeUrl:
        input.prototype_url?.trim() ?? existing.prototypeUrl,
      demoNotes: input.demo_notes?.trim() ?? existing.demoNotes,
      decisionNotes: input.decision_notes?.trim() ?? existing.decisionNotes,
    };

    return ideasRepository.transition(id, {
      newStatus: input.status,
      previousStatus: existing.status,
      changedByUserId: user.id,
      reason: input.reason,
      metadata: context,
      ideaUpdate,
      before: existing,
    });
  },

  async delete(user: AuthenticatedUser, id: string) {
    const existing = await ideasRepository.getById(id);
    if (!existing) throw new NotFoundError("Idea not found.");

    assertIdeaAccess(user, "idea.delete", existing);

    // Hard delete — schema has no deleted_at column (see docs/database/schema.md).
    await ideasRepository.delete(id, user.id, existing);
  },

  async listStatusHistory(ideaId: string) {
    const existing = await ideasRepository.getById(ideaId);
    if (!existing) throw new NotFoundError("Idea not found.");
    return ideasRepository.listStatusHistory(ideaId);
  },
};
