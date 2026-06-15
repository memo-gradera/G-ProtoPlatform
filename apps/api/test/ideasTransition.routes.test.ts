import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";
import { ideasRepository } from "../src/repositories/ideasRepository.js";
import { usersRepository } from "../src/repositories/usersRepository.js";

const ideaId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function dbUser(role: "admin" | "viewer" | "innovation_lead") {
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
  ownerId: "22222222-2222-2222-2222-222222222222",
  status: "ideas" as const,
  blockerReason: null,
  rejectionReason: null,
  prototypeUrl: null,
  demoNotes: null,
  decisionNotes: null,
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
    transition: vi.fn(),
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

describe("POST /api/ideas/:id/transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(dbUser("admin") as never);
    vi.mocked(ideasRepository.getById).mockResolvedValue(baseIdea as never);
    vi.mocked(ideasRepository.transition).mockResolvedValue({
      ...baseIdea,
      status: "in_progress",
    } as never);
  });

  it("denies viewer transition with 403", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(dbUser("viewer") as never);
    const app = createTestApp();

    const response = await request(app)
      .post(`/api/ideas/${ideaId}/transition`)
      .send({ status: "in_progress" });

    expect(response.status).toBe(403);
    expect(ideasRepository.transition).not.toHaveBeenCalled();
  });

  it("allows innovation_lead to transition any idea", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(
      dbUser("innovation_lead") as never,
    );
    const app = createTestApp();

    const response = await request(app)
      .post(`/api/ideas/${ideaId}/transition`)
      .send({ status: "in_progress" });

    expect(response.status).toBe(200);
    expect(ideasRepository.transition).toHaveBeenCalledOnce();
  });

  it("allows admin to transition in_progress → ideas", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue({
      ...baseIdea,
      status: "in_progress",
    } as never);
    vi.mocked(ideasRepository.transition).mockResolvedValue({
      ...baseIdea,
      status: "ideas",
    } as never);
    const app = createTestApp();

    const response = await request(app)
      .post(`/api/ideas/${ideaId}/transition`)
      .send({ status: "ideas" });

    expect(response.status).toBe(200);
    expect(ideasRepository.transition).toHaveBeenCalledOnce();
  });

  it("allows innovation_lead to transition in_progress → ideas", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(
      dbUser("innovation_lead") as never,
    );
    vi.mocked(ideasRepository.getById).mockResolvedValue({
      ...baseIdea,
      status: "in_progress",
    } as never);
    vi.mocked(ideasRepository.transition).mockResolvedValue({
      ...baseIdea,
      status: "ideas",
    } as never);
    const app = createTestApp();

    const response = await request(app)
      .post(`/api/ideas/${ideaId}/transition`)
      .send({ status: "ideas" });

    expect(response.status).toBe(200);
    expect(ideasRepository.transition).toHaveBeenCalledOnce();
  });

  it("denies viewer in_progress → ideas with 403", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(dbUser("viewer") as never);
    vi.mocked(ideasRepository.getById).mockResolvedValue({
      ...baseIdea,
      status: "in_progress",
    } as never);
    const app = createTestApp();

    const response = await request(app)
      .post(`/api/ideas/${ideaId}/transition`)
      .send({ status: "ideas" });

    expect(response.status).toBe(403);
    expect(ideasRepository.transition).not.toHaveBeenCalled();
  });
});
