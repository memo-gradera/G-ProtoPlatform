import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type { Env } from "../config/env.js";

export function createRequestLogger(env: Env) {
  return function requestLogger(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const requestId = randomUUID();
    req.requestId = requestId;
    const started = Date.now();

    res.on("finish", () => {
      const durationMs = Date.now() - started;
      const line = [
        requestId,
        req.method,
        req.originalUrl,
        res.statusCode,
        `${durationMs}ms`,
      ].join(" ");

      if (env.NODE_ENV === "test") return;
      console.log(line);
    });

    next();
  };
}
