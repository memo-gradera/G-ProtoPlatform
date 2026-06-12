import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { RbacError, WorkflowValidationError } from "@proto-platform/domain";
import { AppError } from "../errors.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const requestId = req.requestId ?? "unknown";

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      requestId,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "BAD_REQUEST",
      message: "Validation failed.",
      details: err.flatten(),
      requestId,
    });
    return;
  }

  if (err instanceof WorkflowValidationError) {
    res.status(400).json({
      error: "WORKFLOW_VALIDATION",
      message: err.message,
      requestId,
    });
    return;
  }

  if (err instanceof RbacError) {
    const status = err.message === "Authentication required." ? 401 : 403;
    res.status(status).json({
      error: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      message: err.message,
      requestId,
    });
    return;
  }

  if (err instanceof Error) {
    console.error(`[${requestId}]`, err);
    res.status(500).json({
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred."
          : err.message,
      requestId,
    });
    return;
  }

  res.status(500).json({
    error: "Internal Server Error",
    message: "An unexpected error occurred.",
    requestId,
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} does not exist.`,
    requestId: req.requestId,
  });
}
