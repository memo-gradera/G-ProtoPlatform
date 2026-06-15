import fs from "node:fs";
import path from "node:path";
import type { Request } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import type { Env } from "./env.js";

/** Max screenshots per prototype upload request (MVP UI limit). */
export const MAX_PROTOTYPE_SCREENSHOTS = 5;

/** 5 MB per image — adjust when moving to Blob Storage quotas. */
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export const ALLOWED_SCREENSHOT_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export const ALLOWED_SCREENSHOT_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]);

/**
 * Local disk storage for prototype screenshots (dev / non-production MVP).
 *
 * WARNING: Current screenshot storage uses local disk for dev/MVP.
 * Production should move to Azure Blob Storage.
 *
 * Azure App Service local filesystem is not durable across instances or restarts.
 * See docs/azure/architecture.md and apps/api/README.md.
 */
export function getUploadRoot(env: Env): string {
  return env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");
}

export function getPrototypeUploadDir(env: Env): string {
  return path.join(getUploadRoot(env), "prototypes");
}

export function ensurePrototypeUploadDir(env: Env): void {
  fs.mkdirSync(getPrototypeUploadDir(env), { recursive: true });
}

export function resolvePublicBaseUrl(req: Request, env: Env): string {
  if (env.API_PUBLIC_URL) {
    return env.API_PUBLIC_URL.replace(/\/$/, "");
  }

  const proto = req.get("x-forwarded-proto") ?? req.protocol;
  const host =
    req.get("x-forwarded-host") ?? req.get("host") ?? `localhost:${env.PORT}`;
  return `${proto}://${host}`;
}

export function buildPrototypeScreenshotPublicUrl(
  baseUrl: string,
  filename: string,
): string {
  return `${baseUrl.replace(/\/$/, "")}/uploads/prototypes/${filename}`;
}

function normalizeExtension(originalName: string, mimeType: string): string {
  const fromName = path.extname(originalName).toLowerCase();
  if (ALLOWED_SCREENSHOT_EXTENSIONS.has(fromName)) {
    return fromName;
  }

  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".jpg";
  }
}

export function createPrototypeScreenshotUpload(env: Env) {
  ensurePrototypeUploadDir(env);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, getPrototypeUploadDir(env));
    },
    filename: (_req, file, cb) => {
      const ext = normalizeExtension(file.originalname, file.mimetype);
      cb(null, `${randomUUID()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: {
      files: MAX_PROTOTYPE_SCREENSHOTS,
      fileSize: MAX_SCREENSHOT_BYTES,
    },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_SCREENSHOT_MIMES.has(file.mimetype)) {
        cb(new Error("Only PNG, JPG, JPEG, and WebP images are allowed."));
        return;
      }

      const ext = path.extname(file.originalname).toLowerCase();
      if (ext && !ALLOWED_SCREENSHOT_EXTENSIONS.has(ext)) {
        cb(new Error("Only PNG, JPG, JPEG, and WebP images are allowed."));
        return;
      }

      cb(null, true);
    },
  });
}
