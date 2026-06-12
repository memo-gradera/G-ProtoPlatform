import { Router } from "express";
import { PERMISSIONS } from "@proto-platform/domain";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";

export const filesRouter = Router();

filesRouter.get("/", requireAuth, requirePermission(PERMISSIONS.PROTOTYPE_EDIT), (_req, res) => {
  res.json({
    resource: "files",
    status: "not_implemented",
  });
});
