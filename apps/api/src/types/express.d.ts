import type { AppRole } from "@proto-platform/contracts";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AppRole;
  /** Entra object ID once MSAL integration is wired */
  oid?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

export {};
