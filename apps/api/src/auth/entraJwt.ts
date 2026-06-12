import {
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  type JWTPayload,
} from "jose";
import type { Env } from "../config/env.js";
import { assertEntraConfig } from "../config/env.js";
import { UnauthorizedError } from "../errors.js";

export interface EntraTokenIdentity {
  entraObjectId: string;
  email: string;
  fullName: string;
  tenantId: string;
}

export type JwtValidationReason =
  | "audience_mismatch"
  | "issuer_mismatch"
  | "tenant_mismatch"
  | "expired"
  | "signature_validation_failed"
  | "unknown_validation_error";

export interface JwtTokenDiagnostics {
  aud?: string | string[];
  iss?: string;
  tid?: string;
  scp?: string;
}

export interface JwtValidationExpectations {
  issuers: string[];
  audience: string;
  tenantId: string;
}

const GENERIC_INVALID_TOKEN_MESSAGE = "Invalid or expired access token.";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(tenantId: string) {
  const cached = jwksCache.get(tenantId);
  if (cached) return cached;

  const jwks = createRemoteJWKSet(
    new URL(
      `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    ),
  );
  jwksCache.set(tenantId, jwks);
  return jwks;
}

function readStringClaim(payload: JWTPayload, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function decodeTokenDiagnostics(token: string): JwtTokenDiagnostics | null {
  try {
    const payload = decodeJwt(token);
    return {
      aud: payload.aud,
      iss: typeof payload.iss === "string" ? payload.iss : undefined,
      tid: readStringClaim(payload, "tid"),
      scp: readStringClaim(payload, "scp"),
    };
  } catch {
    return null;
  }
}

export function classifyEntraValidationError(
  error: unknown,
  expected: JwtValidationExpectations,
  decoded: JwtTokenDiagnostics | null,
): JwtValidationReason {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code)
      : undefined;

  if (code === "ERR_JWT_EXPIRED") {
    return "expired";
  }

  if (code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
    const claim =
      typeof error === "object" && error !== null && "claim" in error
        ? String((error as { claim?: string }).claim)
        : undefined;
    if (claim === "aud") return "audience_mismatch";
    if (claim === "iss") return "issuer_mismatch";
    if (claim === "exp") return "expired";
  }

  if (code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
    return "signature_validation_failed";
  }

  if (error instanceof UnauthorizedError) {
    if (error.message.toLowerCase().includes("tenant")) {
      return "tenant_mismatch";
    }
  }

  if (decoded?.tid && decoded.tid !== expected.tenantId) {
    return "tenant_mismatch";
  }

  if (decoded?.aud) {
    const audiences = Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud];
    if (!audiences.includes(expected.audience)) {
      return "audience_mismatch";
    }
  }

  if (decoded?.iss && !expected.issuers.includes(decoded.iss)) {
    return "issuer_mismatch";
  }

  return "unknown_validation_error";
}

export function buildUnauthorizedErrorForValidationFailure(
  nodeEnv: Env["NODE_ENV"],
  reason: JwtValidationReason,
): UnauthorizedError {
  if (nodeEnv === "production") {
    return new UnauthorizedError(GENERIC_INVALID_TOKEN_MESSAGE);
  }

  return new UnauthorizedError(GENERIC_INVALID_TOKEN_MESSAGE, reason);
}

export function logJwtValidationFailure(
  expected: JwtValidationExpectations,
  decoded: JwtTokenDiagnostics | null,
  reason: JwtValidationReason,
  error: unknown,
) {
  console.warn("[GRADERA JWT validation]", {
    reason,
    expected: {
      issuers: expected.issuers,
      audience: expected.audience,
      tenant: expected.tenantId,
    },
    decoded: decoded
      ? {
          aud: decoded.aud,
          iss: decoded.iss,
          tid: decoded.tid,
          scp: decoded.scp,
        }
      : null,
    errorName: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error),
  });
}

export function extractEntraIdentity(payload: JWTPayload): EntraTokenIdentity {
  const entraObjectId = readStringClaim(payload, "oid");
  const tenantId = readStringClaim(payload, "tid");
  const email =
    readStringClaim(payload, "preferred_username") ??
    readStringClaim(payload, "upn") ??
    readStringClaim(payload, "email");

  if (!entraObjectId || !tenantId || !email) {
    throw new UnauthorizedError("Access token is missing required identity claims.");
  }

  const fullName = readStringClaim(payload, "name") ?? email;

  return {
    entraObjectId,
    email: email.toLowerCase(),
    fullName,
    tenantId,
  };
}

export async function validateEntraAccessToken(
  token: string,
  env: Env,
): Promise<EntraTokenIdentity> {
  const { tenantId, audience, issuers } = assertEntraConfig(env);
  const expected: JwtValidationExpectations = { tenantId, audience, issuers };
  const decoded = decodeTokenDiagnostics(token);

  try {
    const { payload } = await jwtVerify(token, getJwks(tenantId), {
      issuer: issuers,
      audience,
      algorithms: ["RS256"],
      clockTolerance: 30,
    });

    const tokenType =
      readStringClaim(payload, "typ") ??
      (typeof payload.token_use === "string" ? payload.token_use : undefined);

    if (tokenType && !["access_token", "at+jwt", "JWT"].includes(tokenType)) {
      throw new UnauthorizedError("Unsupported token type.");
    }

    const identity = extractEntraIdentity(payload);

    if (identity.tenantId !== tenantId) {
      const tenantError = new UnauthorizedError(
        "Token tenant does not match configuration.",
      );
      if (env.NODE_ENV !== "production") {
        logJwtValidationFailure(
          expected,
          decoded,
          "tenant_mismatch",
          tenantError,
        );
        throw buildUnauthorizedErrorForValidationFailure(
          env.NODE_ENV,
          "tenant_mismatch",
        );
      }
      throw tenantError;
    }

    return identity;
  } catch (error) {
    if (error instanceof UnauthorizedError && error.validationReason) {
      throw error;
    }

    if (
      error instanceof UnauthorizedError &&
      (error.message === "Access token is missing required identity claims." ||
        error.message === "Unsupported token type.")
    ) {
      throw error;
    }

    const reason = classifyEntraValidationError(error, expected, decoded);

    if (env.NODE_ENV !== "production") {
      logJwtValidationFailure(expected, decoded, reason, error);
      throw buildUnauthorizedErrorForValidationFailure(env.NODE_ENV, reason);
    }

    if (error instanceof UnauthorizedError) {
      throw error;
    }

    throw new UnauthorizedError(GENERIC_INVALID_TOKEN_MESSAGE);
  }
}

/** Test helper to reset JWKS cache between tests. */
export function resetEntraJwksCacheForTests() {
  jwksCache.clear();
}
