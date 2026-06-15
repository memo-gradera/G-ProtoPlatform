import { z } from "zod";

const ideaPriority = z.enum(["low", "medium", "high", "urgent"]);
const ideaStatus = z.enum([
  "ideas",
  "in_progress",
  "ready_for_demo",
  "approved",
  "blocked",
  "rejected",
]);
const appRole = z.enum([
  "admin",
  "innovation_lead",
  "developer",
  "executive_reviewer",
  "viewer",
]);
const prototypeStatus = z.enum([
  "draft",
  "attached",
  "published",
  "archived",
  "in_production",
]);

const videoUrlsSchema = z.array(z.string().url()).max(5);
const reviewDecision = z.enum(["pending", "approved", "rejected"]);

export const createIdeaSchema = z.object({
  solution_name: z.string().trim().min(1).max(255),
  description: z.string().trim().optional(),
  why_it_matters: z.string().trim().optional(),
  target_user: z.string().trim().optional(),
  minimum_viable_functionality: z.string().trim().optional(),
  value_hypothesis: z.string().trim().optional(),
  success_criteria: z.string().trim().optional(),
  acceptance_criteria: z.string().trim().optional(),
  owner_id: z.string().uuid().optional(),
  priority: ideaPriority.optional(),
  eta_date: z.string().date().optional(),
});

export const updateIdeaSchema = z
  .object({
    solution_name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().nullable().optional(),
    why_it_matters: z.string().trim().nullable().optional(),
    target_user: z.string().trim().nullable().optional(),
    minimum_viable_functionality: z.string().trim().nullable().optional(),
    value_hypothesis: z.string().trim().nullable().optional(),
    success_criteria: z.string().trim().nullable().optional(),
    acceptance_criteria: z.string().trim().nullable().optional(),
    priority: ideaPriority.optional(),
  eta_date: z.string().date().nullable().optional(),
  prototype_url: z.string().trim().nullable().optional(),
  demo_notes: z.string().trim().nullable().optional(),
  decision_notes: z.string().trim().nullable().optional(),
}).strict();

export const transitionIdeaSchema = z.object({
  status: ideaStatus,
  blocker_reason: z.string().trim().optional(),
  rejection_reason: z.string().trim().optional(),
  prototype_url: z.string().trim().optional(),
  demo_notes: z.string().trim().optional(),
  decision_notes: z.string().trim().optional(),
  reason: z.string().trim().optional(),
});

export const createPrototypeSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().optional(),
  category: z.string().trim().max(128).optional(),
  owner_id: z.string().uuid().optional(),
  demo_url: z.string().url().optional(),
  screenshot_url: z.string().url().optional(),
  github_repo_url: z.string().url().optional(),
  video_urls: videoUrlsSchema.optional(),
  related_idea_id: z.string().uuid().optional(),
});

export const updatePrototypeSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().nullable().optional(),
  category: z.string().trim().nullable().optional(),
  demo_url: z.string().url().nullable().optional(),
  screenshot_url: z.string().url().nullable().optional(),
  github_repo_url: z.string().url().nullable().optional(),
  video_urls: videoUrlsSchema.nullable().optional(),
  related_idea_id: z.string().uuid().nullable().optional(),
  status: prototypeStatus.optional(),
});

export const createReviewSchema = z.object({
  prototype_id: z.string().uuid(),
  idea_id: z.string().uuid(),
  decision: reviewDecision,
  decision_notes: z.string().trim().optional(),
  rejection_reason: z.string().trim().optional(),
  rejection_reason_id: z.string().uuid().optional(),
});

export const updateUserRoleSchema = z.object({
  role: appRole,
});

const userStatus = z.enum(["active", "inactive", "pending", "suspended"]);

export const createAdminUserSchema = z.object({
  email: z.string().trim().email().max(320),
  full_name: z.string().trim().min(1).max(255),
  role: appRole,
  status: userStatus.optional().default("pending"),
});

export const updateAdminUserSchema = z
  .object({
    full_name: z.string().trim().min(1).max(255).optional(),
    role: appRole.optional(),
  })
  .refine((data) => data.full_name !== undefined || data.role !== undefined, {
    message: "At least one of full_name or role is required.",
  });

export const updateAdminUserStatusSchema = z.object({
  status: userStatus,
});

export const listAdminUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: appRole.optional(),
  status: userStatus.optional(),
});

export function parseQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  return schema.parse(query);
}

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}

export function parseParamsId(params: { id?: string }): string {
  return z.string().uuid().parse(params.id);
}
