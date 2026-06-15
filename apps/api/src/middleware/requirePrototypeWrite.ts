import type { NextFunction, Request, Response } from "express";
import { PERMISSIONS, hasPermission, RbacError } from "@proto-platform/domain";

/** Prototype create or edit permission — required for screenshot uploads. */
export function requirePrototypeWrite(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    next(new RbacError("Authentication required."));
    return;
  }

  const allowed =
    hasPermission(req.user, PERMISSIONS.PROTOTYPE_CREATE) ||
    hasPermission(req.user, PERMISSIONS.PROTOTYPE_EDIT);

  if (!allowed) {
    next(new RbacError());
    return;
  }

  next();
}
