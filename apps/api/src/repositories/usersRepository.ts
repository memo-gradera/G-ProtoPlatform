import type { AppRoleName, Prisma } from "../db/client.js";
import { prisma } from "../db/client.js";

export const usersRepository = {
  async list() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        userRoles: { include: { role: true } },
      },
    });
  },

  async getById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: true } },
      },
    });
  },

  async getByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        userRoles: { include: { role: true } },
      },
    });
  },

  async getByEntraObjectId(entraObjectId: string) {
    return prisma.user.findUnique({
      where: { entraObjectId },
      include: {
        userRoles: { include: { role: true } },
      },
    });
  },

  async linkEntraObjectId(userId: string, entraObjectId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { entraObjectId },
      include: {
        userRoles: { include: { role: true } },
      },
    });
  },

  async createProvisionedViewer(input: {
    email: string;
    fullName: string;
    entraObjectId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const viewerRole = await tx.role.findUniqueOrThrow({
        where: { name: "viewer" },
      });

      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          fullName: input.fullName,
          entraObjectId: input.entraObjectId,
          status: "active",
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: viewerRole.id,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          userRoles: { include: { role: true } },
        },
      });
    });
  },

  async setUserRole(userId: string, roleName: AppRoleName, actorUserId: string) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.findUniqueOrThrow({ where: { name: roleName } });
      const before = await tx.user.findUnique({
        where: { id: userId },
        include: { userRoles: { include: { role: true } } },
      });

      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.create({
        data: { userId, roleId: role.id },
      });

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { userRoles: { include: { role: true } } },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId,
          action: "user.role.update",
          entityType: "user",
          entityId: userId,
          beforeJson: before as unknown as Prisma.InputJsonValue,
          afterJson: user as unknown as Prisma.InputJsonValue,
          metadataJson: { role: roleName },
        },
      });

      return user;
    });
  },
};
