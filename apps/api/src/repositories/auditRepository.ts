import type { AuditEntityType, Prisma } from "../db/client.js";
import { prisma } from "../db/client.js";

export const auditRepository = {
  async list(options?: {
    entityType?: AuditEntityType;
    entityId?: string;
    limit?: number;
  }) {
    return prisma.auditEvent.findMany({
      where: {
        entityType: options?.entityType,
        entityId: options?.entityId,
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 100,
      include: { actor: true },
    });
  },

  async create(data: {
    action: string;
    entityType: AuditEntityType;
    actorUserId?: string;
    entityId?: string;
    beforeJson?: Prisma.InputJsonValue;
    afterJson?: Prisma.InputJsonValue;
    metadataJson?: Prisma.InputJsonValue;
  }) {
    return prisma.auditEvent.create({ data });
  },
};
