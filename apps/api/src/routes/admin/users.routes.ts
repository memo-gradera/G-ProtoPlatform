import { Router } from "express";
import { asyncHandler, ok } from "../../utils/http.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { PERMISSIONS } from "@proto-platform/domain";
import { serializeUser } from "../../lib/serializers.js";
import { usersService } from "../../services/usersService.js";
import {
  createAdminUserSchema,
  listAdminUsersQuerySchema,
  parseBody,
  parseParamsId,
  parseQuery,
  updateAdminUserSchema,
  updateAdminUserStatusSchema,
} from "../../validation/schemas.js";

export const adminUsersRouter = Router();

const requireAdminManageUsers = requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS);

adminUsersRouter.get(
  "/",
  requireAuth,
  requireAdminManageUsers,
  asyncHandler(async (req, res) => {
    const query = parseQuery(listAdminUsersQuerySchema, req.query);
    const users = await usersService.listAdmin(req.user!, query);
    ok(res, users.map(serializeUser));
  }),
);

adminUsersRouter.post(
  "/",
  requireAuth,
  requireAdminManageUsers,
  asyncHandler(async (req, res) => {
    const body = parseBody(createAdminUserSchema, req.body);
    const user = await usersService.createAdmin(req.user!, body);
    ok(res, serializeUser(user), 201);
  }),
);

adminUsersRouter.patch(
  "/:id",
  requireAuth,
  requireAdminManageUsers,
  asyncHandler(async (req, res) => {
    const userId = parseParamsId(req.params);
    const body = parseBody(updateAdminUserSchema, req.body);
    const user = await usersService.updateAdmin(req.user!, userId, body);
    ok(res, serializeUser(user));
  }),
);

adminUsersRouter.patch(
  "/:id/status",
  requireAuth,
  requireAdminManageUsers,
  asyncHandler(async (req, res) => {
    const userId = parseParamsId(req.params);
    const body = parseBody(updateAdminUserStatusSchema, req.body);
    const user = await usersService.updateAdminStatus(req.user!, userId, body.status);
    ok(res, serializeUser(user));
  }),
);
