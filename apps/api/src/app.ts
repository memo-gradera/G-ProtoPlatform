import cors from "cors";
import express from "express";
import type { Env } from "./config/env.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createRequestLogger } from "./middleware/logging.js";
import { createApiRouter } from "./routes/api.routes.js";
import { createHealthRouter } from "./routes/health.routes.js";

export function createApp(env: Env) {
  const app = express();

  app.disable("x-powered-by");
  app.use(createRequestLogger(env));
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((value) => value.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(createAuthMiddleware(env));

  app.use(createHealthRouter(env));
  app.use("/api", createApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
