import type { NextFunction, Request, Response } from "express";

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ data });
}

export function created<T>(res: Response, data: T) {
  return ok(res, data, 201);
}

export function notFound(res: Response, message = "Resource not found.") {
  return res.status(404).json({ error: "Not Found", message });
}

export function badRequest(res: Response, message: string, details?: unknown) {
  return res.status(400).json({
    error: "Bad Request",
    message,
    ...(details !== undefined ? { details } : {}),
  });
}

export function forbidden(res: Response, message?: string) {
  return res.status(403).json({
    error: "Forbidden",
    message: message ?? "You do not have permission to perform this action.",
  });
}

export function unauthorized(res: Response, message = "Authentication required.") {
  return res.status(401).json({ error: "Unauthorized", message });
}

export function serverError(res: Response, message = "An unexpected error occurred.") {
  return res.status(500).json({ error: "Internal Server Error", message });
}

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
