import type { IdeaPriority, IdeaStatus, Prisma } from "../db/client.js";
import { prisma } from "../db/client.js";

export const ideasRepository = {
  async list(options?: { status?: IdeaStatus; limit?: number }) {
    return prisma.idea.findMany({
      where: options?.status ? { status: options.status } : undefined,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 500,
      include: { owner: true },
    });
  },

  async getById(id: string) {
    return prisma.idea.findUnique({
      where: { id },
      include: {
        owner: true,
        statusHistory: {
          orderBy: { changedAt: "desc" },
          take: 50,
        },
      },
    });
  },

  async createWithInitialHistory(
    data: {
      solutionName: string;
      ownerId: string;
      description?: string;
      priority?: IdeaPriority;
      etaDate?: Date | null;
      whyItMatters?: string;
      targetUser?: string;
      minimumViableFunctionality?: string;
      valueHypothesis?: string;
      successCriteria?: string;
      acceptanceCriteria?: string;
    },
    actorUserId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const idea = await tx.idea.create({
        data: { ...data, status: "ideas" },
        include: { owner: true },
      });

      await tx.ideaStatusHistory.create({
        data: {
          ideaId: idea.id,
          previousStatus: null,
          newStatus: "ideas",
          changedByUserId: actorUserId,
          reason: "Idea created",
        },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId,
          action: "idea.create",
          entityType: "idea",
          entityId: idea.id,
          afterJson: idea as unknown as Prisma.InputJsonValue,
        },
      });

      return idea;
    });
  },

  async update(
    id: string,
    data: Prisma.IdeaUpdateInput,
    actorUserId: string,
    before: Record<string, unknown>,
  ) {
    return prisma.$transaction(async (tx) => {
      const idea = await tx.idea.update({
        where: { id },
        data,
        include: { owner: true },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId,
          action: "idea.update",
          entityType: "idea",
          entityId: id,
          beforeJson: before as Prisma.InputJsonValue,
          afterJson: idea as unknown as Prisma.InputJsonValue,
        },
      });

      return idea;
    });
  },

  async transition(
    id: string,
    payload: {
      newStatus: IdeaStatus;
      changedByUserId: string;
      previousStatus: IdeaStatus;
      reason?: string;
      metadata?: Prisma.InputJsonValue;
      ideaUpdate: Prisma.IdeaUpdateInput;
      before: Record<string, unknown>;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const idea = await tx.idea.update({
        where: { id },
        data: payload.ideaUpdate,
        include: { owner: true },
      });

      await tx.ideaStatusHistory.create({
        data: {
          ideaId: id,
          previousStatus: payload.previousStatus,
          newStatus: payload.newStatus,
          changedByUserId: payload.changedByUserId,
          reason: payload.reason,
          metadataJson: payload.metadata,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: payload.changedByUserId,
          action: "idea.transition",
          entityType: "idea",
          entityId: id,
          beforeJson: payload.before as Prisma.InputJsonValue,
          afterJson: idea as unknown as Prisma.InputJsonValue,
          metadataJson: payload.metadata,
        },
      });

      return idea;
    });
  },

  async delete(id: string, actorUserId: string, before: Record<string, unknown>) {
    return prisma.$transaction(async (tx) => {
      await tx.auditEvent.create({
        data: {
          actorUserId,
          action: "idea.delete",
          entityType: "idea",
          entityId: id,
          beforeJson: before as Prisma.InputJsonValue,
        },
      });

      await tx.idea.delete({ where: { id } });
    });
  },

  async listStatusHistory(ideaId: string) {
    return prisma.ideaStatusHistory.findMany({
      where: { ideaId },
      orderBy: { changedAt: "desc" },
      include: {
        changedBy: {
          select: { id: true, email: true, fullName: true },
        },
      },
    });
  },
};
