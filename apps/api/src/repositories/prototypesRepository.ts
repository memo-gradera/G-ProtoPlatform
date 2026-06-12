import type { Prisma, PrototypeStatus } from "../db/client.js";
import { prisma } from "../db/client.js";

export const prototypesRepository = {
  async list(options?: { status?: PrototypeStatus; limit?: number }) {
    return prisma.prototype.findMany({
      where: options?.status ? { status: options.status } : undefined,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 500,
      include: {
        owner: true,
        relatedIdea: true,
        tagMaps: { include: { tag: true } },
      },
    });
  },

  async getById(id: string) {
    return prisma.prototype.findUnique({
      where: { id },
      include: {
        owner: true,
        relatedIdea: true,
        tagMaps: { include: { tag: true } },
        reviews: true,
      },
    });
  },

  async create(
    data: {
      name: string;
      ownerId: string;
      description?: string;
      category?: string;
      demoUrl?: string;
      screenshotUrl?: string;
      relatedIdeaId?: string;
    },
    actorUserId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const prototype = await tx.prototype.create({
        data,
        include: { owner: true, relatedIdea: true },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId,
          action: "prototype.create",
          entityType: "prototype",
          entityId: prototype.id,
          afterJson: prototype as unknown as Prisma.InputJsonValue,
        },
      });

      return prototype;
    });
  },

  async update(
    id: string,
    data: Prisma.PrototypeUpdateInput,
    actorUserId: string,
    before: Record<string, unknown>,
    action = "prototype.update",
  ) {
    return prisma.$transaction(async (tx) => {
      const prototype = await tx.prototype.update({
        where: { id },
        data,
        include: { owner: true, relatedIdea: true },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId,
          action,
          entityType: "prototype",
          entityId: id,
          beforeJson: before as Prisma.InputJsonValue,
          afterJson: prototype as unknown as Prisma.InputJsonValue,
        },
      });

      return prototype;
    });
  },
};
