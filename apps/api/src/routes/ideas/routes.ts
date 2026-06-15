import { Router } from "express";
import { asyncHandler, created, ok } from "../../utils/http.js";
import { requireAuth } from "../../middleware/auth.js";
import { serializeIdea } from "../../lib/serializers.js";
import { ideasService } from "../../services/ideasService.js";
import {
  createIdeaSchema,
  parseBody,
  parseParamsId,
  transitionIdeaSchema,
  updateIdeaSchema,
} from "../../validation/schemas.js";

export const ideasRouter = Router();

ideasRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const ideas = await ideasService.list(req.user!);
    ok(res, ideas.map((idea) => serializeIdea(idea)));
  }),
);

ideasRouter.get(
  "/:id/status-history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const ideaId = parseParamsId(req.params);
    const history = await ideasService.listStatusHistory(ideaId);
    ok(
      res,
      history.map((entry) => ({
        id: entry.id,
        idea_id: entry.ideaId,
        previous_status: entry.previousStatus,
        new_status: entry.newStatus,
        changed_by_user_id: entry.changedByUserId,
        changed_at: entry.changedAt,
        reason: entry.reason,
        metadata_json: entry.metadataJson,
        changed_by: entry.changedBy,
      })),
    );
  }),
);

ideasRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const idea = await ideasService.getById(parseParamsId(req.params));
    ok(res, serializeIdea(idea));
  }),
);

ideasRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = parseBody(createIdeaSchema, req.body);
    const idea = await ideasService.create(req.user!, {
      solutionName: body.solution_name,
      ownerId: body.owner_id,
      description: body.description,
      priority: body.priority,
      etaDate: body.eta_date,
      whyItMatters: body.why_it_matters,
      targetUser: body.target_user,
      minimumViableFunctionality: body.minimum_viable_functionality,
      valueHypothesis: body.value_hypothesis,
      successCriteria: body.success_criteria,
      acceptanceCriteria: body.acceptance_criteria,
    });
    created(res, serializeIdea(idea));
  }),
);

ideasRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseParamsId(req.params);
    const body = parseBody(updateIdeaSchema, req.body);
    const idea = await ideasService.update(req.user!, id, body);
    ok(res, serializeIdea(idea));
  }),
);

ideasRouter.post(
  "/:id/transition",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseParamsId(req.params);
    const body = parseBody(transitionIdeaSchema, req.body);
    const idea = await ideasService.transition(req.user!, id, body);
    ok(res, serializeIdea(idea));
  }),
);

ideasRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseParamsId(req.params);
    await ideasService.delete(req.user!, id);
    ok(res, { success: true, id });
  }),
);
