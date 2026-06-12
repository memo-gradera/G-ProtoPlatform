import type { NextFunction, Request, Response } from "express";
import { hasPermission, RbacError } from "@proto-platform/domain";
import type { Permission } from "@proto-platform/domain";

/**
 * RBAC enforcement placeholder — uses shared domain permission matrix.
 * Replace with resource-aware checks (ownership, workflow state) as repositories land.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new RbacError("Authentication required."));
      return;
    }

    if (!hasPermission(req.user, permission)) {
      next(new RbacError());
      return;
    }

    next();
  };
}

export function attachUserRole(req: Request, _res: Response, next: NextFunction) {
  if (req.user) {
    // Future: hydrate role from PostgreSQL app-managed roles table.
  }
  next();
}
