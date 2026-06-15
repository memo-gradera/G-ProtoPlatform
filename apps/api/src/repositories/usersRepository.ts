import type { AppRoleName, Prisma, UserStatus } from "../db/client.js";
import { prisma } from "../db/client.js";

type ListUsersFilters = {
  search?: string;
  role?: AppRoleName;
  status?: UserStatus;
};

export const usersRepository = {
  async list(filters: ListUsersFilters = {}) {
    const where: Prisma.UserWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { fullName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.role) {
      where.userRoles = {
        some: {
          role: { name: filters.role },
        },
      };
    }

    return prisma.user.findMany({
      where,
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

  async createAdminUser(
    input: {
      email: string;
      fullName: string;
      role: AppRoleName;
      status: UserStatus;
    },
    actorUserId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.findUniqueOrThrow({
        where: { name: input.role },
      });

      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          fullName: input.fullName,
          status: input.status,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      const created = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          userRoles: { include: { role: true } },
        },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId,
          action: "user.create",
          entityType: "user",
          entityId: user.id,
          afterJson: created as unknown as Prisma.InputJsonValue,
          metadataJson: { role: input.role, status: input.status },
        },
      });

      return created;
    });
  },

  async updateUserProfile(
    userId: string,
    input: { fullName?: string },
    actorUserId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id: userId },
        include: { userRoles: { include: { role: true } } },
      });

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        },
        include: {
          userRoles: { include: { role: true } },
        },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId,
          action: "user.update",
          entityType: "user",
          entityId: userId,
          beforeJson: before as unknown as Prisma.InputJsonValue,
          afterJson: user as unknown as Prisma.InputJsonValue,
        },
      });

      return user;
    });
  },

  async updateUserStatus(
    userId: string,
    status: UserStatus,
    actorUserId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id: userId },
        include: { userRoles: { include: { role: true } } },
      });

      const user = await tx.user.update({
        where: { id: userId },
        data: { status },
        include: {
          userRoles: { include: { role: true } },
        },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId,
          action: "user.status.update",
          entityType: "user",
          entityId: userId,
          beforeJson: before as unknown as Prisma.InputJsonValue,
          afterJson: user as unknown as Prisma.InputJsonValue,
          metadataJson: { status },
        },
      });

      return user;
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
