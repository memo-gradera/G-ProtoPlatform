import { Router } from "express";
import { PERMISSIONS } from "@proto-platform/domain";
import { asyncHandler, ok } from "../../utils/http.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { dashboardService } from "../../services/dashboardService.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/kpis",
  requireAuth,
  requirePermission(PERMISSIONS.DASHBOARD_VIEW),
  asyncHandler(async (_req, res) => {
    const kpis = await dashboardService.getKpis();
    ok(res, kpis);
  }),
);
