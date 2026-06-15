import type { Request } from "express";
import type { Env } from "../config/env.js";
import {
  MAX_PROTOTYPE_SCREENSHOTS,
  buildPrototypeScreenshotPublicUrl,
  resolvePublicBaseUrl,
} from "../config/upload.js";
import { BadRequestError } from "../errors.js";

type UploadedFile = NonNullable<Request["file"]>;

export function validateUploadedScreenshotFiles(
  files: UploadedFile[] | undefined,
): UploadedFile[] {
  const uploaded = files ?? [];
  if (uploaded.length === 0) {
    throw new BadRequestError("No screenshot files were uploaded.");
  }
  if (uploaded.length > MAX_PROTOTYPE_SCREENSHOTS) {
    throw new BadRequestError(
      `Maximum ${MAX_PROTOTYPE_SCREENSHOTS} screenshots allowed per upload.`,
    );
  }
  return uploaded;
}

export function buildScreenshotUploadResponse(
  req: Request,
  env: Env,
  files: UploadedFile[],
) {
  const baseUrl = resolvePublicBaseUrl(req, env);
  const urls = files.map((file) =>
    buildPrototypeScreenshotPublicUrl(baseUrl, file.filename),
  );

  return {
    urls,
    screenshot_url: urls[0] ?? null,
  };
}
