import { describe, expect, it, vi, beforeEach } from "vitest";
import { ForbiddenError, BadRequestError, NotFoundError } from "../src/errors.js";
import { usersRepository } from "../src/repositories/usersRepository.js";
import { usersService } from "../src/services/usersService.js";

vi.mock("../src/repositories/usersRepository.js", () => ({
  usersRepository: {
    list: vi.fn(),
    getById: vi.fn(),
    getByEmail: vi.fn(),
    createAdminUser: vi.fn(),
    updateUserProfile: vi.fn(),
    updateUserStatus: vi.fn(),
    setUserRole: vi.fn(),
  },
}));

const adminUser = {
  id: "admin-user-id",
  email: "admin@gradera.local",
  role: "admin" as const,
};

const viewerUser = {
  id: "viewer-user-id",
  email: "viewer@gradera.local",
  role: "viewer" as const,
};

const dbUser = {
  id: "target-user-id",
  email: "new.user@gradera.ai",
  fullName: "New User",
  entraObjectId: null,
  status: "pending" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  userRoles: [{ role: { name: "viewer" as const } }],
};

describe("usersService admin access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admins to list users", async () => {
    vi.mocked(usersRepository.list).mockResolvedValue([dbUser] as never);

    const users = await usersService.listAdmin(adminUser);

    expect(users).toHaveLength(1);
    expect(usersRepository.list).toHaveBeenCalledOnce();
  });

  it("rejects non-admin list access", async () => {
    await expect(usersService.listAdmin(viewerUser)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("creates a user with validated input", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(null);
    vi.mocked(usersRepository.createAdminUser).mockResolvedValue(dbUser as never);

    const created = await usersService.createAdmin(adminUser, {
      email: "new.user@gradera.ai",
      full_name: "New User",
      role: "viewer",
      status: "pending",
    });

    expect(created.email).toBe("new.user@gradera.ai");
    expect(usersRepository.createAdminUser).toHaveBeenCalledWith(
      {
        email: "new.user@gradera.ai",
        fullName: "New User",
        role: "viewer",
        status: "pending",
      },
      adminUser.id,
    );
  });

  it("rejects duplicate email on create", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(dbUser as never);

    await expect(
      usersService.createAdmin(adminUser, {
        email: "new.user@gradera.ai",
        full_name: "New User",
        role: "viewer",
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects non-admin create access", async () => {
    await expect(
      usersService.createAdmin(viewerUser, {
        email: "new.user@gradera.ai",
        full_name: "New User",
        role: "viewer",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects non-admin update access", async () => {
    await expect(
      usersService.updateAdmin(viewerUser, dbUser.id, { role: "developer" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects non-admin status update access", async () => {
    await expect(
      usersService.updateAdminStatus(viewerUser, dbUser.id, "inactive"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("updates user role for admins", async () => {
    vi.mocked(usersRepository.getById).mockResolvedValue(dbUser as never);
    vi.mocked(usersRepository.setUserRole).mockResolvedValue({
      ...dbUser,
      userRoles: [{ role: { name: "developer" } }],
    } as never);

    const updated = await usersService.updateAdmin(adminUser, dbUser.id, {
      role: "developer",
    });

    expect(updated.userRoles[0].role.name).toBe("developer");
  });

  it("prevents admin from removing own admin role", async () => {
    vi.mocked(usersRepository.getById).mockResolvedValue({
      ...dbUser,
      id: adminUser.id,
      userRoles: [{ role: { name: "admin" } }],
    } as never);

    await expect(
      usersService.updateAdmin(adminUser, adminUser.id, { role: "viewer" }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("updates user status for admins", async () => {
    vi.mocked(usersRepository.getById).mockResolvedValue(dbUser as never);
    vi.mocked(usersRepository.updateUserStatus).mockResolvedValue({
      ...dbUser,
      status: "inactive",
    } as never);

    const updated = await usersService.updateAdminStatus(
      adminUser,
      dbUser.id,
      "inactive",
    );

    expect(updated.status).toBe("inactive");
  });

  it("prevents admin from deactivating own account", async () => {
    await expect(
      usersService.updateAdminStatus(adminUser, adminUser.id, "inactive"),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("returns not found for missing user updates", async () => {
    vi.mocked(usersRepository.getById).mockResolvedValue(null);

    await expect(
      usersService.updateAdminStatus(adminUser, "missing-id", "inactive"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
