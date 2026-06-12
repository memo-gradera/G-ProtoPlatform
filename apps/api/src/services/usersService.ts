import { canPerformAction, hasPermission, PERMISSIONS } from "@proto-platform/domain";
import type { AppRoleName } from "../db/client.js";
import { ForbiddenError, NotFoundError } from "../errors.js";
import { usersRepository } from "../repositories/usersRepository.js";
import type { AuthenticatedUser } from "../types/express.js";

export const usersService = {
  async list(user: AuthenticatedUser) {
    const allowed =
      hasPermission(user, PERMISSIONS.ADMIN_MANAGE_USERS) ||
      user.role === "innovation_lead";
    if (!allowed) throw new ForbiddenError();
    return usersRepository.list();
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
    if (!canPerformAction(actor, "admin.manage_users")) {
      throw new ForbiddenError();
    }

    const existing = await usersRepository.getById(userId);
    if (!existing) throw new NotFoundError("User not found.");

    return usersRepository.setUserRole(userId, role, actor.id);
  },
};
