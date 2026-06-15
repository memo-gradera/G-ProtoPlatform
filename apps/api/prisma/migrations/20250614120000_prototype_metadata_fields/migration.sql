-- Add In Production prototype status and link metadata columns.

ALTER TYPE "PrototypeStatus" ADD VALUE 'in_production';

ALTER TABLE "prototypes" ADD COLUMN IF NOT EXISTS "github_repo_url" TEXT;
ALTER TABLE "prototypes" ADD COLUMN IF NOT EXISTS "video_urls" JSONB;
