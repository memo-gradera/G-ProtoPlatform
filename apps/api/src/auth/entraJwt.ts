import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Env } from "../config/env.js";
import { assertEntraConfig } from "../config/env.js";
import { UnauthorizedError } from "../errors.js";

export interface EntraTokenIdentity {
  entraObjectId: string;
  email: string;
  fullName: string;
  tenantId: string;
}

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
  const { tenantId, audience, issuer } = assertEntraConfig(env);

  try {
    const { payload } = await jwtVerify(token, getJwks(tenantId), {
      issuer,
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
      throw new UnauthorizedError("Token tenant does not match configuration.");
    }

    return identity;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    throw new UnauthorizedError("Invalid or expired access token.");
  }
}

/** Test helper to reset JWKS cache between tests. */
export function resetEntraJwksCacheForTests() {
  jwksCache.clear();
}
