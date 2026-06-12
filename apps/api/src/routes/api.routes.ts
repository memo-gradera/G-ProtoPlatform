import { Router } from "express";
import { authRouter } from "./auth/routes.js";
import { dashboardRouter } from "./dashboard/routes.js";
import { filesRouter } from "./files/routes.js";
import { ideasRouter } from "./ideas/routes.js";
import { prototypesRouter } from "./prototypes/routes.js";
import { reviewsRouter } from "./reviews/routes.js";
import { usersRouter } from "./users/routes.js";

export function createApiRouter() {
  const router = Router();

  router.use("/auth", authRouter);
  router.use("/users", usersRouter);
  router.use("/ideas", ideasRouter);
  router.use("/prototypes", prototypesRouter);
  router.use("/reviews", reviewsRouter);
  router.use("/files", filesRouter);
  router.use("/dashboard", dashboardRouter);

  return router;
}
