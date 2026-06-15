import { Router } from "express";
import type { Env } from "../config/env.js";
import { getBuildInfo } from "../lib/buildInfo.js";

export function createHealthRouter(env: Env) {
  const router = Router();
  const buildInfo = getBuildInfo();

  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "gradera-api",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      app_version: buildInfo.appVersion,
      commit_sha: buildInfo.commitSha,
    });
  });

  return router;
}
