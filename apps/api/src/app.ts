import cors from "cors";
import express from "express";
import type { Env } from "./config/env.js";
import { getUploadRoot } from "./config/upload.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createRequestLogger } from "./middleware/logging.js";
import { createApiRouter } from "./routes/api.routes.js";
import { createHealthRouter } from "./routes/health.routes.js";

export function createApp(env: Env) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((value) => value.trim()),
      credentials: true,
    }),
  );
  app.use(createRequestLogger(env));

  // Public static files for locally stored prototype screenshots (dev MVP).
  // Production should serve from Azure Blob Storage instead.
  app.use("/uploads", express.static(getUploadRoot(env)));

  app.use(createHealthRouter(env));

  app.use("/api", createAuthMiddleware(env));
  app.use("/api", createApiRouter(env));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
