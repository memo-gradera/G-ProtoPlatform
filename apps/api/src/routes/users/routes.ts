import { Router } from "express";
import { asyncHandler, ok } from "../../utils/http.js";
import { requireAuth } from "../../middleware/auth.js";
import { serializeUser } from "../../lib/serializers.js";
import { usersService } from "../../services/usersService.js";
import { parseBody, parseParamsId, updateUserRoleSchema } from "../../validation/schemas.js";

export const usersRouter = Router();

usersRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await usersService.getMe(req.user!);
    ok(res, serializeUser(user));
  }),
);

usersRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const users = await usersService.list(req.user!);
    ok(res, users.map(serializeUser));
  }),
);

usersRouter.patch(
  "/:id/role",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = parseParamsId(req.params);
    const body = parseBody(updateUserRoleSchema, req.body);
    const user = await usersService.updateRole(req.user!, userId, body.role);
    ok(res, serializeUser(user));
  }),
);
