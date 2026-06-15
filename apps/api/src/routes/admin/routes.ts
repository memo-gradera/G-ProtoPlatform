import { Router } from "express";
import { adminUsersRouter } from "./users.routes.js";

export const adminRouter = Router();

adminRouter.use("/users", adminUsersRouter);
