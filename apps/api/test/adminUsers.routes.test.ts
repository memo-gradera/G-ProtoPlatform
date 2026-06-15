import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";
import { usersRepository } from "../src/repositories/usersRepository.js";

const adminDbUser = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "admin@gradera.local",
  fullName: "Local Admin",
  entraObjectId: "local-dev-admin",
  status: "active" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  userRoles: [{ role: { name: "admin" as const } }],
};

const viewerDbUser = {
  ...adminDbUser,
  id: "22222222-2222-2222-2222-222222222222",
  fullName: "Viewer User",
  userRoles: [{ role: { name: "viewer" as const } }],
};

const listedUser = {
  id: "33333333-3333-3333-3333-333333333333",
  email: "user@gradera.ai",
  fullName: "Target User",
  entraObjectId: null,
  status: "active" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  userRoles: [{ role: { name: "viewer" as const } }],
};

vi.mock("../src/repositories/usersRepository.js", () => ({
  usersRepository: {
    getByEmail: vi.fn(),
    getById: vi.fn(),
    list: vi.fn(),
    createAdminUser: vi.fn(),
    updateUserProfile: vi.fn(),
    updateUserStatus: vi.fn(),
    setUserRole: vi.fn(),
  },
}));

vi.mock("../src/repositories/ideasRepository.js", () => ({
  ideasRepository: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

function createTestApp() {
  return createApp(
    loadEnv({
      ...process.env,
      NODE_ENV: "test",
      PORT: "8080",
      DEV_AUTH_BYPASS: "true",
    }),
  );
}

describe("admin users routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(adminDbUser as never);
    vi.mocked(usersRepository.getById).mockImplementation(async (id: string) => {
      if (id === adminDbUser.id) return adminDbUser as never;
      if (id === listedUser.id) return listedUser as never;
      return null;
    });
    vi.mocked(usersRepository.list).mockResolvedValue([listedUser] as never);
    vi.mocked(usersRepository.createAdminUser).mockResolvedValue(listedUser as never);
    vi.mocked(usersRepository.setUserRole).mockResolvedValue({
      ...listedUser,
      userRoles: [{ role: { name: "developer" } }],
    } as never);
    vi.mocked(usersRepository.updateUserStatus).mockResolvedValue({
      ...listedUser,
      status: "inactive",
    } as never);
  });

  it("allows admins to list users", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/admin/users");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: listedUser.id,
      email: listedUser.email,
      full_name: listedUser.fullName,
      role: "viewer",
      status: "active",
    });
    expect(response.body.data[0]).not.toHaveProperty("entraObjectId");
    expect(response.body.data[0]).not.toHaveProperty("entra_object_id");
  });

  it("denies non-admin access to GET /api/admin/users", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(viewerDbUser as never);
    const app = createTestApp();

    const response = await request(app).get("/api/admin/users");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("FORBIDDEN");
  });

  it("denies non-admin access to POST /api/admin/users", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(viewerDbUser as never);
    const app = createTestApp();

    const response = await request(app)
      .post("/api/admin/users")
      .send({
        email: "new.user@gradera.ai",
        full_name: "New User",
        role: "viewer",
      });

    expect(response.status).toBe(403);
    expect(usersRepository.createAdminUser).not.toHaveBeenCalled();
  });

  it("denies non-admin access to PATCH /api/admin/users/:id", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(viewerDbUser as never);
    const app = createTestApp();

    const response = await request(app)
      .patch(`/api/admin/users/${listedUser.id}`)
      .send({ role: "developer" });

    expect(response.status).toBe(403);
    expect(usersRepository.setUserRole).not.toHaveBeenCalled();
  });

  it("denies non-admin access to PATCH /api/admin/users/:id/status", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(viewerDbUser as never);
    const app = createTestApp();

    const response = await request(app)
      .patch(`/api/admin/users/${listedUser.id}/status`)
      .send({ status: "inactive" });

    expect(response.status).toBe(403);
    expect(usersRepository.updateUserStatus).not.toHaveBeenCalled();
  });

  it("rejects invalid create payloads with 400", async () => {
    const app = createTestApp();

    const response = await request(app)
      .post("/api/admin/users")
      .send({
        email: "not-an-email",
        full_name: "New User",
        role: "viewer",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("BAD_REQUEST");
    expect(usersRepository.createAdminUser).not.toHaveBeenCalled();
  });

  it("prevents admin self-demotion via PATCH /api/admin/users/:id", async () => {
    const app = createTestApp();

    const response = await request(app)
      .patch(`/api/admin/users/${adminDbUser.id}`)
      .send({ role: "viewer" });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("cannot remove your own admin role");
    expect(usersRepository.setUserRole).not.toHaveBeenCalled();
  });

  it("prevents admin self-deactivation via PATCH /api/admin/users/:id/status", async () => {
    const app = createTestApp();

    const response = await request(app)
      .patch(`/api/admin/users/${adminDbUser.id}/status`)
      .send({ status: "inactive" });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("cannot deactivate your own account");
    expect(usersRepository.updateUserStatus).not.toHaveBeenCalled();
  });
});

describe("GET /api/users/me regression", () => {
  beforeEach(() => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(adminDbUser as never);
    vi.mocked(usersRepository.getById).mockResolvedValue(adminDbUser as never);
  });

  it("still returns the authenticated profile for dev bypass users", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/users/me");

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: adminDbUser.id,
      email: adminDbUser.email,
      full_name: adminDbUser.fullName,
      role: "admin",
    });
    expect(response.body.data).not.toHaveProperty("entraObjectId");
    expect(response.body.data).not.toHaveProperty("entra_object_id");
  });
});
