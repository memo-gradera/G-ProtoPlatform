import { Router } from "express";
import { asyncHandler, created, ok } from "../../utils/http.js";
import { requireAuth } from "../../middleware/auth.js";
import { serializePrototype } from "../../lib/serializers.js";
import { prototypesService } from "../../services/prototypesService.js";
import {
  createPrototypeSchema,
  parseBody,
  parseParamsId,
  updatePrototypeSchema,
} from "../../validation/schemas.js";

export const prototypesRouter = Router();

prototypesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const prototypes = await prototypesService.list(req.user!);
    ok(res, prototypes.map((item) => serializePrototype(item)));
  }),
);

prototypesRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const prototype = await prototypesService.getById(parseParamsId(req.params));
    ok(res, serializePrototype(prototype));
  }),
);

prototypesRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = parseBody(createPrototypeSchema, req.body);
    const prototype = await prototypesService.create(req.user!, {
      name: body.name,
      description: body.description,
      category: body.category,
      ownerId: body.owner_id,
      demoUrl: body.demo_url,
      screenshotUrl: body.screenshot_url,
      relatedIdeaId: body.related_idea_id,
    });
    created(res, serializePrototype(prototype));
  }),
);

prototypesRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseParamsId(req.params);
    const body = parseBody(updatePrototypeSchema, req.body);
    const prototype = await prototypesService.update(req.user!, id, body);
    ok(res, serializePrototype(prototype));
  }),
);

prototypesRouter.post(
  "/:id/publish",
  requireAuth,
  asyncHandler(async (req, res) => {
    const prototype = await prototypesService.publish(
      req.user!,
      parseParamsId(req.params),
    );
    ok(res, serializePrototype(prototype));
  }),
);

prototypesRouter.post(
  "/:id/archive",
  requireAuth,
  asyncHandler(async (req, res) => {
    const prototype = await prototypesService.archive(
      req.user!,
      parseParamsId(req.params),
    );
    ok(res, serializePrototype(prototype));
  }),
);
