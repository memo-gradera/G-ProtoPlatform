import { Router } from "express";
import { asyncHandler, created, ok } from "../../utils/http.js";
import { requireAuth } from "../../middleware/auth.js";
import { serializeReview } from "../../lib/serializers.js";
import { reviewsService } from "../../services/reviewsService.js";
import { createReviewSchema, parseBody } from "../../validation/schemas.js";

export const reviewsRouter = Router();

reviewsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const ideaId =
      typeof req.query.idea_id === "string" ? req.query.idea_id : undefined;
    const reviews = await reviewsService.list(req.user!, ideaId);
    ok(res, reviews.map((review) => serializeReview(review)));
  }),
);

reviewsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = parseBody(createReviewSchema, req.body);
    const review = await reviewsService.create(req.user!, {
      prototypeId: body.prototype_id,
      ideaId: body.idea_id,
      decision: body.decision,
      decisionNotes: body.decision_notes,
      rejectionReason: body.rejection_reason,
      rejectionReasonId: body.rejection_reason_id,
    });
    created(res, serializeReview(review));
  }),
);
