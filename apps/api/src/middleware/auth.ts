import type { NextFunction, Request, Response } from "express";
import { validateEntraAccessToken } from "../auth/entraJwt.js";
import { resolveProvisionedUser } from "../auth/userProvisioning.js";
import type { Env } from "../config/env.js";
import { isDevAuthBypassEnabled } from "../config/env.js";
import { ServiceUnavailableError, UnauthorizedError } from "../errors.js";
import { mapDbUserToAuth } from "../lib/serializers.js";
import { usersRepository } from "../repositories/usersRepository.js";

const DEV_USER_EMAIL = "admin@gradera.local";

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

async function authenticateDevBypassUser() {
  const dbUser = await usersRepository.getByEmail(DEV_USER_EMAIL);
  if (!dbUser) {
    throw new ServiceUnavailableError(
      "Development user not found. Run: pnpm --filter gradera-api db:seed",
    );
  }
  return mapDbUserToAuth(dbUser);
}

async function authenticateBearerToken(token: string, env: Env) {
  const identity = await validateEntraAccessToken(token, env);
  const dbUser = await resolveProvisionedUser(identity, env);
  return mapDbUserToAuth(dbUser);
}

/**
 * Microsoft Entra ID JWT authentication.
 * App roles are loaded from PostgreSQL — not Azure AD groups.
 */
export function createAuthMiddleware(env: Env) {
  return async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ) {
    try {
      const bearerToken = extractBearerToken(req.headers.authorization);

      if (bearerToken) {
        req.user = await authenticateBearerToken(bearerToken, env);
        next();
        return;
      }

      if (isDevAuthBypassEnabled(env)) {
        req.user = await authenticateDevBypassUser();
        next();
        return;
      }

      next(new UnauthorizedError());
    } catch (error) {
      next(error);
    }
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Authentication required.",
    });
    return;
  }
  next();
}
