import { canPerformAction, hasPermission, PERMISSIONS } from "@proto-platform/domain";
import type { IdeaStatus } from "@proto-platform/contracts";
import { ForbiddenError, NotFoundError } from "../errors.js";
import { reviewsRepository } from "../repositories/reviewsRepository.js";
import { ideasRepository } from "../repositories/ideasRepository.js";
import { ideasService } from "./ideasService.js";
import type { AuthenticatedUser } from "../types/express.js";

export const reviewsService = {
  async list(user: AuthenticatedUser, ideaId?: string) {
    if (!hasPermission(user, PERMISSIONS.REVIEW_VIEW)) {
      throw new ForbiddenError();
    }
    return reviewsRepository.list({ ideaId });
  },

  async create(
    user: AuthenticatedUser,
    input: {
      prototypeId: string;
      ideaId: string;
      decision: "pending" | "approved" | "rejected";
      decisionNotes?: string;
      rejectionReason?: string;
      rejectionReasonId?: string;
    },
  ) {
    const idea = await ideasRepository.getById(input.ideaId);
    if (!idea) throw new NotFoundError("Idea not found.");

    if (input.decision === "approved") {
      if (!canPerformAction(user, "review.approve", { idea: idea })) {
        throw new ForbiddenError();
      }

      await ideasService.transition(user, input.ideaId, {
        status: "approved" as IdeaStatus,
        decision_notes: input.decisionNotes,
        reason: "Executive review approved",
      });
    } else if (input.decision === "rejected") {
      if (!canPerformAction(user, "review.reject", { idea: idea })) {
        throw new ForbiddenError();
      }

      await ideasService.transition(user, input.ideaId, {
        status: "rejected" as IdeaStatus,
        rejection_reason: input.rejectionReason,
        decision_notes: input.decisionNotes,
        reason: "Executive review rejected",
      });
    }

    return reviewsRepository.create(
      {
        prototypeId: input.prototypeId,
        ideaId: input.ideaId,
        reviewerId: user.id,
        decision: input.decision,
        decisionNotes: input.decisionNotes,
        rejectionReason: input.rejectionReason,
        rejectionReasonId: input.rejectionReasonId,
      },
      user.id,
    );
  },
};
