import { canPerformAction } from "@proto-platform/domain";
import type { AppRoleName, UserStatus } from "../db/client.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors.js";
import { usersRepository } from "../repositories/usersRepository.js";
import type { AuthenticatedUser } from "../types/express.js";

type ListAdminUsersInput = {
  search?: string;
  role?: AppRoleName;
  status?: UserStatus;
};

function assertAdminManageUsers(actor: AuthenticatedUser) {
  if (!canPerformAction(actor, "admin.manage_users")) {
    throw new ForbiddenError();
  }
}

export const usersService = {
  async listAdmin(actor: AuthenticatedUser, filters: ListAdminUsersInput = {}) {
    assertAdminManageUsers(actor);
    return usersRepository.list(filters);
  },

  async createAdmin(
    actor: AuthenticatedUser,
    input: {
      email: string;
      full_name: string;
      role: AppRoleName;
      status?: UserStatus;
    },
  ) {
    assertAdminManageUsers(actor);

    const existing = await usersRepository.getByEmail(input.email);
    if (existing) {
      throw new BadRequestError("A user with this email already exists.");
    }

    return usersRepository.createAdminUser(
      {
        email: input.email,
        fullName: input.full_name,
        role: input.role,
        status: input.status ?? "pending",
      },
      actor.id,
    );
  },

  async updateAdmin(
    actor: AuthenticatedUser,
    userId: string,
    input: {
      full_name?: string;
      role?: AppRoleName;
    },
  ) {
    assertAdminManageUsers(actor);

    const existing = await usersRepository.getById(userId);
    if (!existing) throw new NotFoundError("User not found.");

    if (userId === actor.id && input.role && input.role !== "admin") {
      throw new BadRequestError("You cannot remove your own admin role.");
    }

    let user = existing;

    if (input.full_name !== undefined) {
      user = await usersRepository.updateUserProfile(
        userId,
        { fullName: input.full_name },
        actor.id,
      );
    }

    if (input.role !== undefined) {
      user = await usersRepository.setUserRole(userId, input.role, actor.id);
    }

    return user;
  },

  async updateAdminStatus(
    actor: AuthenticatedUser,
    userId: string,
    status: UserStatus,
  ) {
    assertAdminManageUsers(actor);

    if (userId === actor.id && status !== "active") {
      throw new BadRequestError("You cannot deactivate your own account.");
    }

    const existing = await usersRepository.getById(userId);
    if (!existing) throw new NotFoundError("User not found.");

    return usersRepository.updateUserStatus(userId, status, actor.id);
  },

  async list(user: AuthenticatedUser) {
    return this.listAdmin(user);
  },

  async getMe(user: AuthenticatedUser) {
    const record = await usersRepository.getById(user.id);
    if (!record) throw new NotFoundError("Authenticated user not found in database.");
    return record;
  },

  async updateRole(
    actor: AuthenticatedUser,
    userId: string,
    role: AppRoleName,
  ) {
    return this.updateAdmin(actor, userId, { role });
  },
};
