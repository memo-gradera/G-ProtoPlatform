import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { loadEnv } from "../src/config/env.js";
import { createAuthMiddleware } from "../src/middleware/auth.js";
import { validateEntraAccessToken } from "../src/auth/entraJwt.js";
import { resolveProvisionedUser } from "../src/auth/userProvisioning.js";
import { usersRepository } from "../src/repositories/usersRepository.js";
import { ForbiddenError, UnauthorizedError } from "../src/errors.js";

vi.mock("../src/auth/entraJwt.js", () => ({
  validateEntraAccessToken: vi.fn(),
}));

vi.mock("../src/repositories/usersRepository.js", () => ({
  usersRepository: {
    getByEmail: vi.fn(),
    getByEntraObjectId: vi.fn(),
    linkEntraObjectId: vi.fn(),
    createProvisionedViewer: vi.fn(),
  },
}));

const adminDbUser = {
  id: "admin-user-id",
  email: "admin@gradera.local",
  fullName: "Local Admin",
  entraObjectId: "local-dev-admin",
  userRoles: [{ role: { name: "admin" } }],
};

const entraDbUser = {
  id: "entra-user-id",
  email: "user@gradera.ai",
  fullName: "Entra User",
  entraObjectId: "oid-123",
  userRoles: [{ role: { name: "viewer" } }],
};

function createMockReq(authHeader?: string): Request {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as Request;
}

async function runMiddleware(
  env: ReturnType<typeof loadEnv>,
  req: Request,
) {
  const middleware = createAuthMiddleware(env);
  let capturedError: unknown;
  let nextCalled = false;

  await middleware(req, {} as Response, ((error?: unknown) => {
    if (error) capturedError = error;
    else nextCalled = true;
  }) as NextFunction);

  return { error: capturedError, nextCalled, user: req.user };
}

describe("createAuthMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses dev bypass for seeded admin when DEV_AUTH_BYPASS=true and no bearer", async () => {
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(adminDbUser as never);

    const env = loadEnv({
      NODE_ENV: "development",
      DEV_AUTH_BYPASS: "true",
    });
    const req = createMockReq();
    const result = await runMiddleware(env, req);

    expect(result.error).toBeUndefined();
    expect(result.user).toMatchObject({
      email: "admin@gradera.local",
      role: "admin",
    });
    expect(validateEntraAccessToken).not.toHaveBeenCalled();
  });

  it("returns 401 when dev bypass is off and bearer is missing", async () => {
    const env = loadEnv({
      NODE_ENV: "test",
      DEV_AUTH_BYPASS: "false",
    });
    const result = await runMiddleware(env, createMockReq());

    expect(result.error).toBeInstanceOf(UnauthorizedError);
  });

  it("maps a valid bearer token to an existing user", async () => {
    vi.mocked(validateEntraAccessToken).mockResolvedValue({
      entraObjectId: "oid-123",
      email: "user@gradera.ai",
      fullName: "Entra User",
      tenantId: "tenant-1",
    });
    vi.mocked(usersRepository.getByEntraObjectId).mockResolvedValue(
      entraDbUser as never,
    );

    const env = loadEnv({
      NODE_ENV: "development",
      DEV_AUTH_BYPASS: "false",
      AZURE_TENANT_ID: "tenant-1",
      JWT_AUDIENCE: "api://gradera",
    });

    const result = await runMiddleware(
      env,
      createMockReq("Bearer valid-token"),
    );

    expect(validateEntraAccessToken).toHaveBeenCalledWith(
      "valid-token",
      env,
    );
    expect(result.user).toMatchObject({
      id: "entra-user-id",
      email: "user@gradera.ai",
      role: "viewer",
      oid: "oid-123",
    });
  });

  it("ignores DEV_AUTH_BYPASS in production", async () => {
    const env = loadEnv({
      NODE_ENV: "production",
      DEV_AUTH_BYPASS: "true",
    });

    expect(env.DEV_AUTH_BYPASS).toBe(false);

    const result = await runMiddleware(env, createMockReq());
    expect(result.error).toBeInstanceOf(UnauthorizedError);
    expect(usersRepository.getByEmail).not.toHaveBeenCalled();
  });
});

describe("resolveProvisionedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("backfills entra_object_id when user is found by email", async () => {
    vi.mocked(usersRepository.getByEntraObjectId).mockResolvedValue(null);
    vi.mocked(usersRepository.getByEmail).mockResolvedValue({
      ...entraDbUser,
      entraObjectId: null,
    } as never);
    vi.mocked(usersRepository.linkEntraObjectId).mockResolvedValue(
      entraDbUser as never,
    );

    const user = await resolveProvisionedUser(
      {
        entraObjectId: "oid-123",
        email: "user@gradera.ai",
        fullName: "Entra User",
        tenantId: "tenant-1",
      },
      loadEnv({ NODE_ENV: "development", AUTO_PROVISION_DEV_USERS: "false" }),
    );

    expect(usersRepository.linkEntraObjectId).toHaveBeenCalledWith(
      "entra-user-id",
      "oid-123",
    );
    expect(user.entraObjectId).toBe("oid-123");
  });

  it("returns 403 for unprovisioned users in production", async () => {
    vi.mocked(usersRepository.getByEntraObjectId).mockResolvedValue(null);
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(null);

    await expect(
      resolveProvisionedUser(
        {
          entraObjectId: "oid-new",
          email: "new@gradera.ai",
          fullName: "New User",
          tenantId: "tenant-1",
        },
        loadEnv({
          NODE_ENV: "production",
          AUTO_PROVISION_DEV_USERS: "false",
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("auto-provisions viewer in development when enabled", async () => {
    vi.mocked(usersRepository.getByEntraObjectId).mockResolvedValue(null);
    vi.mocked(usersRepository.getByEmail).mockResolvedValue(null);
    vi.mocked(usersRepository.createProvisionedViewer).mockResolvedValue(
      entraDbUser as never,
    );

    const user = await resolveProvisionedUser(
      {
        entraObjectId: "oid-123",
        email: "user@gradera.ai",
        fullName: "Entra User",
        tenantId: "tenant-1",
      },
      loadEnv({
        NODE_ENV: "development",
        AUTO_PROVISION_DEV_USERS: "true",
      }),
    );

    expect(usersRepository.createProvisionedViewer).toHaveBeenCalled();
    expect(user.id).toBe("entra-user-id");
  });
});
