import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
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
  userRoles: [{ role: { name: "viewer" as const } }],
};

vi.mock("../src/repositories/usersRepository.js", () => ({
  usersRepository: {
    getByEmail: vi.fn(),
  },
}));

let uploadDir = "";

function createTestApp() {
  return createApp(
    loadEnv({
      ...process.env,
      NODE_ENV: "test",
      PORT: "8080",
      DEV_AUTH_BYPASS: "true",
      UPLOAD_DIR: uploadDir,
      API_PUBLIC_URL: "http://localhost:8080",
    }),
  );
}

describe("POST /api/prototypes/screenshots", () => {
  beforeEach(() => {
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "gradera-upload-"));
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(adminDbUser as never);
  });

  afterEach(() => {
    if (uploadDir && fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
  });

  it("returns public URLs for valid image uploads", async () => {
    const app = createTestApp();

    const response = await request(app)
      .post("/api/prototypes/screenshots")
      .attach("files", Buffer.from("fake-png"), {
        filename: "cover.png",
        contentType: "image/png",
      })
      .attach("files", Buffer.from("fake-jpg"), {
        filename: "detail.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.urls).toHaveLength(2);
    expect(response.body.data.screenshot_url).toBe(response.body.data.urls[0]);
    expect(response.body.data.urls[0]).toMatch(
      /^http:\/\/localhost:8080\/uploads\/prototypes\/.+\.png$/,
    );
  });

  it("rejects non-image uploads", async () => {
    const app = createTestApp();

    const response = await request(app)
      .post("/api/prototypes/screenshots")
      .attach("files", Buffer.from("not-an-image"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/PNG, JPG, JPEG, and WebP/i);
  });

  it("rejects more than 5 files", async () => {
    const app = createTestApp();
    let req = request(app).post("/api/prototypes/screenshots");

    for (let index = 0; index < 6; index += 1) {
      req = req.attach("files", Buffer.from(`img-${index}`), {
        filename: `shot-${index}.png`,
        contentType: "image/png",
      });
    }

    const response = await req;

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Maximum 5 screenshots/i);
  });

  it("denies viewers without prototype write permission", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(viewerDbUser as never);
    const app = createTestApp();

    const response = await request(app)
      .post("/api/prototypes/screenshots")
      .attach("files", Buffer.from("fake-png"), {
        filename: "cover.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(403);
  });
});
