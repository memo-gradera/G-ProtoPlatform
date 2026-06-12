import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";

vi.mock("../src/repositories/usersRepository.js", () => ({
  usersRepository: {
    getByEmail: vi.fn().mockResolvedValue({
      id: "admin-user-id",
      email: "admin@gradera.local",
      fullName: "Local Admin",
      entraObjectId: "local-dev-admin",
      userRoles: [{ role: { name: "admin" } }],
    }),
  },
}));

vi.mock("../src/repositories/ideasRepository.js", () => ({
  ideasRepository: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

describe("GET /health", () => {
  it("returns ok status", async () => {
    const env = loadEnv({
      ...process.env,
      NODE_ENV: "test",
      PORT: "3001",
      DEV_AUTH_BYPASS: "true",
    });
    const app = createApp(env);

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "gradera-api",
      environment: "test",
    });
  });
});

describe("GET /api/ideas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ideas list for authenticated dev user", async () => {
    const env = loadEnv({
      ...process.env,
      NODE_ENV: "test",
      PORT: "3001",
      DEV_AUTH_BYPASS: "true",
    });
    const app = createApp(env);

    const response = await request(app).get("/api/ideas");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });
});
