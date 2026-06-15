import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";
import { ideasRepository } from "../src/repositories/ideasRepository.js";
import { prototypesRepository } from "../src/repositories/prototypesRepository.js";
import { usersRepository } from "../src/repositories/usersRepository.js";

const ideaId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const prototypeId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function dbUser(role: "admin" | "viewer" | "executive_reviewer" | "innovation_lead") {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "admin@gradera.local",
    fullName: "Test User",
    entraObjectId: "local-dev-admin",
    status: "active" as const,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    userRoles: [{ role: { name: role } }],
  };
}

const baseIdea = {
  id: ideaId,
  ownerId: "11111111-1111-1111-1111-111111111111",
  status: "ideas" as const,
  solutionName: "Test Idea",
};

const basePrototype = {
  id: prototypeId,
  ownerId: "11111111-1111-1111-1111-111111111111",
  status: "draft" as const,
  name: "Test Prototype",
};

vi.mock("../src/repositories/usersRepository.js", () => ({
  usersRepository: {
    getByEmail: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock("../src/repositories/ideasRepository.js", () => ({
  ideasRepository: {
    getById: vi.fn(),
    delete: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../src/repositories/prototypesRepository.js", () => ({
  prototypesRepository: {
    getById: vi.fn(),
    delete: vi.fn(),
    countByRelatedIdeaId: vi.fn(),
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

describe("DELETE /api/ideas/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(dbUser("admin") as never);
    vi.mocked(ideasRepository.getById).mockResolvedValue(baseIdea as never);
    vi.mocked(prototypesRepository.countByRelatedIdeaId).mockResolvedValue(0);
    vi.mocked(ideasRepository.delete).mockResolvedValue(undefined as never);
  });

  it("requires authentication when dev bypass is disabled", async () => {
    const app = createApp(
      loadEnv({
        ...process.env,
        NODE_ENV: "test",
        PORT: "8080",
        DEV_AUTH_BYPASS: "false",
      }),
    );

    const response = await request(app).delete(`/api/ideas/${ideaId}`);

    expect(response.status).toBe(401);
    expect(ideasRepository.delete).not.toHaveBeenCalled();
  });

  it("allows admin to delete an idea", async () => {
    const app = createTestApp();
    const response = await request(app).delete(`/api/ideas/${ideaId}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ success: true, id: ideaId });
    expect(ideasRepository.delete).toHaveBeenCalledOnce();
  });

  it("denies viewer delete", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(dbUser("viewer") as never);
    const app = createTestApp();

    const response = await request(app).delete(`/api/ideas/${ideaId}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("FORBIDDEN");
    expect(ideasRepository.delete).not.toHaveBeenCalled();
  });

  it("denies executive_reviewer delete", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(
      dbUser("executive_reviewer") as never,
    );
    const app = createTestApp();

    const response = await request(app).delete(`/api/ideas/${ideaId}`);

    expect(response.status).toBe(403);
    expect(ideasRepository.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when idea is missing", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue(null);
    const app = createTestApp();

    const response = await request(app).delete(`/api/ideas/${ideaId}`);

    expect(response.status).toBe(404);
    expect(ideasRepository.delete).not.toHaveBeenCalled();
  });

  it("blocks delete when linked prototypes exist", async () => {
    vi.mocked(prototypesRepository.countByRelatedIdeaId).mockResolvedValue(1);
    const app = createTestApp();

    const response = await request(app).delete(`/api/ideas/${ideaId}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Cannot delete idea with linked prototypes. Delete or archive prototypes first.",
    );
    expect(ideasRepository.delete).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/prototypes/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(dbUser("admin") as never);
    vi.mocked(prototypesRepository.getById).mockResolvedValue(basePrototype as never);
    vi.mocked(prototypesRepository.delete).mockResolvedValue(undefined as never);
  });

  it("requires authentication when dev bypass is disabled", async () => {
    const app = createApp(
      loadEnv({
        ...process.env,
        NODE_ENV: "test",
        PORT: "8080",
        DEV_AUTH_BYPASS: "false",
      }),
    );

    const response = await request(app).delete(`/api/prototypes/${prototypeId}`);

    expect(response.status).toBe(401);
    expect(prototypesRepository.delete).not.toHaveBeenCalled();
  });

  it("allows admin to delete a prototype", async () => {
    const app = createTestApp();
    const response = await request(app).delete(`/api/prototypes/${prototypeId}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ success: true, id: prototypeId });
    expect(prototypesRepository.delete).toHaveBeenCalledOnce();
  });

  it("denies viewer delete", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(dbUser("viewer") as never);
    const app = createTestApp();

    const response = await request(app).delete(`/api/prototypes/${prototypeId}`);

    expect(response.status).toBe(403);
    expect(prototypesRepository.delete).not.toHaveBeenCalled();
  });

  it("denies executive_reviewer delete", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(
      dbUser("executive_reviewer") as never,
    );
    const app = createTestApp();

    const response = await request(app).delete(`/api/prototypes/${prototypeId}`);

    expect(response.status).toBe(403);
    expect(prototypesRepository.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when prototype is missing", async () => {
    vi.mocked(prototypesRepository.getById).mockResolvedValue(null);
    const app = createTestApp();

    const response = await request(app).delete(`/api/prototypes/${prototypeId}`);

    expect(response.status).toBe(404);
    expect(prototypesRepository.delete).not.toHaveBeenCalled();
  });
});
