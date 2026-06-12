import { Router } from "express";
import type { Env } from "../config/env.js";

export function createHealthRouter(env: Env) {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "gradera-api",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
