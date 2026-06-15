import { Router } from "express";
import multer from "multer";
import type { Env } from "../../config/env.js";
import { createPrototypeScreenshotUpload } from "../../config/upload.js";
import { asyncHandler, created, ok } from "../../utils/http.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePrototypeWrite } from "../../middleware/requirePrototypeWrite.js";
import { serializePrototype } from "../../lib/serializers.js";
import { prototypesService } from "../../services/prototypesService.js";
import {
  buildScreenshotUploadResponse,
  validateUploadedScreenshotFiles,
} from "../../services/screenshotUploadService.js";
import {
  createPrototypeSchema,
  parseBody,
  parseParamsId,
  updatePrototypeSchema,
} from "../../validation/schemas.js";
import { BadRequestError } from "../../errors.js";

export function createPrototypesRouter(env: Env) {
  const router = Router();
  const screenshotUpload = createPrototypeScreenshotUpload(env);

  router.post(
    "/screenshots",
    requireAuth,
    requirePrototypeWrite,
    (req, res, next) => {
      screenshotUpload.array("files", 5)(req, res, (error: unknown) => {
        if (!error) {
          next();
          return;
        }
        if (error instanceof multer.MulterError) {
          if (error.code === "LIMIT_FILE_COUNT") {
            next(
              new BadRequestError("Maximum 5 screenshots allowed per upload."),
            );
            return;
          }
          if (error.code === "LIMIT_FILE_SIZE") {
            next(new BadRequestError("Each screenshot must be 5 MB or smaller."));
            return;
          }
        }
        next(
          error instanceof Error
            ? new BadRequestError(error.message)
            : error,
        );
      });
    },
    asyncHandler(async (req, res) => {
      const files = validateUploadedScreenshotFiles(
        req.files as Express.Multer.File[],
      );
      const payload = buildScreenshotUploadResponse(req, env, files);
      created(res, payload);
    }),
  );

  router.get(
    "/",
    requireAuth,
    asyncHandler(async (req, res) => {
      const prototypes = await prototypesService.list(req.user!);
      ok(res, prototypes.map((item) => serializePrototype(item)));
    }),
  );

  router.get(
    "/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const prototype = await prototypesService.getById(parseParamsId(req.params));
      ok(res, serializePrototype(prototype));
    }),
  );

  router.post(
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

  router.patch(
    "/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const id = parseParamsId(req.params);
      const body = parseBody(updatePrototypeSchema, req.body);
      const prototype = await prototypesService.update(req.user!, id, body);
      ok(res, serializePrototype(prototype));
    }),
  );

  router.post(
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

  router.post(
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

  router.delete(
    "/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const id = parseParamsId(req.params);
      await prototypesService.delete(req.user!, id);
      ok(res, { success: true, id });
    }),
  );

  return router;
}
