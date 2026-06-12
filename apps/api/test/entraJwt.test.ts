import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadEnv } from "../src/config/env.js";
import {
  buildUnauthorizedErrorForValidationFailure,
  classifyEntraValidationError,
  decodeTokenDiagnostics,
  resetEntraJwksCacheForTests,
  validateEntraAccessToken,
} from "../src/auth/entraJwt.js";
import { UnauthorizedError } from "../src/errors.js";

const jwtVerify = vi.fn();
const decodeJwt = vi.fn();
const createRemoteJWKSet = vi.fn(() => "mock-jwks");

vi.mock("jose", () => ({
  createRemoteJWKSet: (...args: unknown[]) => createRemoteJWKSet(...args),
  decodeJwt: (...args: unknown[]) => decodeJwt(...args),
  jwtVerify: (...args: unknown[]) => jwtVerify(...args),
}));

function buildToken(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

const tenantId = "0eb9175d-eefe-46c6-ac0b-29d37fe52dbe";
const audience = "api://2a55204d-7c68-4b06-985e-01c226f23b79";
const v2Issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
const stsIssuer = `https://sts.windows.net/${tenantId}/`;

const expected = {
  issuers: [v2Issuer, stsIssuer],
  audience,
  tenantId,
};

const baseEnv = loadEnv({
  NODE_ENV: "development",
  DEV_AUTH_BYPASS: "false",
  AZURE_TENANT_ID: tenantId,
  JWT_AUDIENCE: audience,
});

function identityPayload(issuer: string, overrides: Record<string, unknown> = {}) {
  return {
    oid: "oid-123",
    tid: tenantId,
    preferred_username: "user@gradera.ai",
    name: "Entra User",
    iss: issuer,
    aud: audience,
    ...overrides,
  };
}

describe("entraJwt diagnostics", () => {
  beforeEach(() => {
    decodeJwt.mockImplementation((token: string) => {
      const [, body] = token.split(".");
      return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    });
  });

  it("decodes aud, iss, tid, and scp without verifying signature", () => {
    const token = buildToken({
      aud: audience,
      iss: v2Issuer,
      tid: tenantId,
      scp: "access_as_user",
    });

    expect(decodeTokenDiagnostics(token)).toEqual({
      aud: audience,
      iss: v2Issuer,
      tid: tenantId,
      scp: "access_as_user",
    });
  });

  it("classifies audience mismatch from JWTClaimValidationFailed", () => {
    const error = {
      code: "ERR_JWT_CLAIM_VALIDATION_FAILED",
      claim: "aud",
      name: "JWTClaimValidationFailed",
      message: 'unexpected "aud" claim value',
    };

    expect(
      classifyEntraValidationError(error, expected, {
        aud: "api://wrong",
        iss: v2Issuer,
        tid: tenantId,
      }),
    ).toBe("audience_mismatch");
  });

  it("classifies issuer mismatch when iss is not in allowed list", () => {
    expect(
      classifyEntraValidationError(
        { code: "ERR_JWT_CLAIM_VALIDATION_FAILED", claim: "iss" },
        expected,
        {
          aud: audience,
          iss: `https://sts.windows.net/other-tenant/`,
          tid: tenantId,
        },
      ),
    ).toBe("issuer_mismatch");
  });

  it("classifies expired tokens", () => {
    const error = {
      code: "ERR_JWT_EXPIRED",
      name: "JWTExpired",
      message: "token expired",
    };

    expect(classifyEntraValidationError(error, expected, null)).toBe("expired");
  });

  it("returns generic message in production", () => {
    const error = buildUnauthorizedErrorForValidationFailure(
      "production",
      "audience_mismatch",
    );

    expect(error.message).toBe("Invalid or expired access token.");
    expect(error.validationReason).toBeUndefined();
  });

  it("includes validation reason in development errors", () => {
    const error = buildUnauthorizedErrorForValidationFailure(
      "development",
      "issuer_mismatch",
    );

    expect(error.message).toBe("Invalid or expired access token.");
    expect(error.validationReason).toBe("issuer_mismatch");
  });
});

describe("validateEntraAccessToken issuer and claim checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEntraJwksCacheForTests();
    decodeJwt.mockImplementation((token: string) => {
      const [, body] = token.split(".");
      return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    });
  });

  it("accepts v2 login.microsoftonline.com issuer", async () => {
    jwtVerify.mockResolvedValue({
      payload: identityPayload(v2Issuer),
    });

    const identity = await validateEntraAccessToken("token-v2", baseEnv);

    expect(jwtVerify).toHaveBeenCalledWith(
      "token-v2",
      "mock-jwks",
      expect.objectContaining({
        issuer: expected.issuers,
        audience,
      }),
    );
    expect(identity).toMatchObject({
      entraObjectId: "oid-123",
      email: "user@gradera.ai",
      tenantId,
    });
  });

  it("accepts sts.windows.net issuer", async () => {
    jwtVerify.mockResolvedValue({
      payload: identityPayload(stsIssuer),
    });

    const identity = await validateEntraAccessToken("token-sts", baseEnv);

    expect(jwtVerify).toHaveBeenCalledWith(
      "token-sts",
      "mock-jwks",
      expect.objectContaining({
        issuer: expected.issuers,
        audience,
      }),
    );
    expect(identity.tenantId).toBe(tenantId);
  });

  it("rejects wrong tenant issuer", async () => {
    const wrongIssuer = `https://sts.windows.net/wrong-tenant-id/`;
    jwtVerify.mockRejectedValue({
      code: "ERR_JWT_CLAIM_VALIDATION_FAILED",
      claim: "iss",
      name: "JWTClaimValidationFailed",
      message: 'unexpected "iss" claim value',
    });

    await expect(
      validateEntraAccessToken(
        buildToken({
          aud: audience,
          iss: wrongIssuer,
          tid: tenantId,
        }),
        baseEnv,
      ),
    ).rejects.toMatchObject({
      message: "Invalid or expired access token.",
      validationReason: "issuer_mismatch",
    });
  });

  it("rejects wrong tid after signature validation", async () => {
    jwtVerify.mockResolvedValue({
      payload: identityPayload(v2Issuer, { tid: "wrong-tenant-id" }),
    });

    await expect(
      validateEntraAccessToken("token-wrong-tid", baseEnv),
    ).rejects.toMatchObject({
      message: "Invalid or expired access token.",
      validationReason: "tenant_mismatch",
    });
  });

  it("rejects wrong audience", async () => {
    jwtVerify.mockRejectedValue({
      code: "ERR_JWT_CLAIM_VALIDATION_FAILED",
      claim: "aud",
      name: "JWTClaimValidationFailed",
      message: 'unexpected "aud" claim value',
    });

    await expect(
      validateEntraAccessToken(
        buildToken({
          aud: "api://wrong-audience",
          iss: stsIssuer,
          tid: tenantId,
        }),
        baseEnv,
      ),
    ).rejects.toMatchObject({
      message: "Invalid or expired access token.",
      validationReason: "audience_mismatch",
    });
  });

  it("returns generic unauthorized error in production", async () => {
    jwtVerify.mockRejectedValue({
      code: "ERR_JWT_CLAIM_VALIDATION_FAILED",
      claim: "iss",
      name: "JWTClaimValidationFailed",
      message: 'unexpected "iss" claim value',
    });

    const prodEnv = loadEnv({
      NODE_ENV: "production",
      DEV_AUTH_BYPASS: "false",
      AZURE_TENANT_ID: tenantId,
      JWT_AUDIENCE: audience,
    });

    await expect(
      validateEntraAccessToken("token-bad-issuer", prodEnv),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect((error as UnauthorizedError).message).toBe(
        "Invalid or expired access token.",
      );
      expect((error as UnauthorizedError).validationReason).toBeUndefined();
      return true;
    });
  });
});
