import type { Prisma, ReviewDecision } from "../db/client.js";
import { prisma } from "../db/client.js";

export const reviewsRepository = {
  async list(options?: { ideaId?: string; decision?: ReviewDecision }) {
    return prisma.prototypeReview.findMany({
      where: {
        ideaId: options?.ideaId,
        decision: options?.decision,
      },
      orderBy: { createdAt: "desc" },
      include: {
        reviewer: true,
        idea: true,
        prototype: true,
        catalogRejectionReason: true,
      },
    });
  },

  async create(
    data: {
      prototypeId: string;
      ideaId: string;
      reviewerId: string;
      decision: ReviewDecision;
      decisionNotes?: string;
      rejectionReason?: string;
      rejectionReasonId?: string;
    },
    actorUserId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.prototypeReview.create({
        data,
        include: {
          reviewer: true,
          idea: true,
          prototype: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId,
          action: "review.create",
          entityType: "review",
          entityId: review.id,
          afterJson: review as unknown as Prisma.InputJsonValue,
        },
      });

      return review;
    });
  },
};
