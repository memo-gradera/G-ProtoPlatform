-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppRoleName" AS ENUM ('admin', 'innovation_lead', 'developer', 'executive_reviewer', 'viewer');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'pending', 'suspended');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('ideas', 'in_progress', 'ready_for_demo', 'approved', 'blocked', 'rejected');

-- CreateEnum
CREATE TYPE "IdeaPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "PrototypeStatus" AS ENUM ('draft', 'attached', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AttachmentEntityType" AS ENUM ('idea', 'prototype', 'review', 'user');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('user', 'idea', 'prototype', 'review', 'attachment', 'role');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "entra_object_id" VARCHAR(128),
    "email" VARCHAR(320) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" "AppRoleName" NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "ideas" (
    "id" UUID NOT NULL,
    "solution_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "why_it_matters" TEXT,
    "target_user" TEXT,
    "minimum_viable_functionality" TEXT,
    "value_hypothesis" TEXT,
    "success_criteria" TEXT,
    "acceptance_criteria" TEXT,
    "owner_id" UUID NOT NULL,
    "status" "IdeaStatus" NOT NULL DEFAULT 'ideas',
    "priority" "IdeaPriority" NOT NULL DEFAULT 'medium',
    "eta_date" DATE,
    "blocker_reason" TEXT,
    "rejection_reason" TEXT,
    "prototype_url" TEXT,
    "demo_notes" TEXT,
    "decision_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_status_history" (
    "id" UUID NOT NULL,
    "idea_id" UUID NOT NULL,
    "previous_status" "IdeaStatus",
    "new_status" "IdeaStatus" NOT NULL,
    "changed_by_user_id" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "metadata_json" JSONB,

    CONSTRAINT "idea_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prototypes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(128),
    "status" "PrototypeStatus" NOT NULL DEFAULT 'draft',
    "owner_id" UUID NOT NULL,
    "demo_url" TEXT,
    "screenshot_url" TEXT,
    "related_idea_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "prototypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prototype_tags" (
    "id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,

    CONSTRAINT "prototype_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prototype_tag_map" (
    "prototype_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "prototype_tag_map_pkey" PRIMARY KEY ("prototype_id","tag_id")
);

-- CreateTable
CREATE TABLE "rejection_reasons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rejection_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prototype_reviews" (
    "id" UUID NOT NULL,
    "prototype_id" UUID NOT NULL,
    "idea_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL DEFAULT 'pending',
    "decision_notes" TEXT,
    "rejection_reason_id" UUID,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prototype_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "entity_type" "AttachmentEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "file_name" VARCHAR(512) NOT NULL,
    "file_url" TEXT NOT NULL,
    "content_type" VARCHAR(255),
    "uploaded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(128) NOT NULL,
    "entity_type" "AuditEntityType" NOT NULL,
    "entity_id" UUID,
    "before_json" JSONB,
    "after_json" JSONB,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_entra_object_id_key" ON "users"("entra_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "ideas_status_idx" ON "ideas"("status");

-- CreateIndex
CREATE INDEX "ideas_owner_id_idx" ON "ideas"("owner_id");

-- CreateIndex
CREATE INDEX "idea_status_history_idea_id_changed_at_idx" ON "idea_status_history"("idea_id", "changed_at");

-- CreateIndex
CREATE INDEX "prototypes_status_idx" ON "prototypes"("status");

-- CreateIndex
CREATE INDEX "prototypes_owner_id_idx" ON "prototypes"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "prototype_tags_name_key" ON "prototype_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rejection_reasons_code_key" ON "rejection_reasons"("code");

-- CreateIndex
CREATE INDEX "prototype_reviews_idea_id_idx" ON "prototype_reviews"("idea_id");

-- CreateIndex
CREATE INDEX "prototype_reviews_prototype_id_idx" ON "prototype_reviews"("prototype_id");

-- CreateIndex
CREATE INDEX "attachments_entity_type_entity_id_idx" ON "attachments"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_status_history" ADD CONSTRAINT "idea_status_history_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_status_history" ADD CONSTRAINT "idea_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prototypes" ADD CONSTRAINT "prototypes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prototypes" ADD CONSTRAINT "prototypes_related_idea_id_fkey" FOREIGN KEY ("related_idea_id") REFERENCES "ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prototype_tag_map" ADD CONSTRAINT "prototype_tag_map_prototype_id_fkey" FOREIGN KEY ("prototype_id") REFERENCES "prototypes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prototype_tag_map" ADD CONSTRAINT "prototype_tag_map_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "prototype_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prototype_reviews" ADD CONSTRAINT "prototype_reviews_prototype_id_fkey" FOREIGN KEY ("prototype_id") REFERENCES "prototypes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prototype_reviews" ADD CONSTRAINT "prototype_reviews_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prototype_reviews" ADD CONSTRAINT "prototype_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prototype_reviews" ADD CONSTRAINT "prototype_reviews_rejection_reason_id_fkey" FOREIGN KEY ("rejection_reason_id") REFERENCES "rejection_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
