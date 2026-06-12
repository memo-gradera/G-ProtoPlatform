import type { AppRole } from "@proto-platform/contracts";
import type { AppRoleName } from "../db/client.js";
import type { AuthenticatedUser } from "../types/express.js";

const ROLE_RANK: Record<AppRole, number> = {
  admin: 5,
  innovation_lead: 4,
  developer: 3,
  executive_reviewer: 2,
  viewer: 1,
};

type DbUserWithRoles = {
  id: string;
  email: string;
  fullName: string;
  entraObjectId: string | null;
  userRoles: Array<{ role: { name: AppRoleName } }>;
};

export function resolvePrimaryRole(
  userRoles: Array<{ role: { name: AppRoleName } }>,
): AppRole {
  if (userRoles.length === 0) return "viewer";

  return userRoles
    .map(({ role }) => role.name as AppRole)
    .sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0];
}

export function mapDbUserToAuth(user: DbUserWithRoles): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    role: resolvePrimaryRole(user.userRoles),
    oid: user.entraObjectId ?? undefined,
  };
}

export function serializeUser(user: DbUserWithRoles) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    role: resolvePrimaryRole(user.userRoles),
    roles: user.userRoles.map(({ role }) => role.name),
  };
}

export function serializeOwnerSummary(owner: unknown) {
  if (!owner || typeof owner !== "object") {
    return undefined;
  }

  const record = owner as {
    id: string;
    email: string;
    fullName?: string;
    full_name?: string;
  };

  return {
    id: record.id,
    email: record.email,
    full_name: record.fullName ?? record.full_name,
  };
}

export function serializeRelatedIdeaSummary(idea: unknown) {
  if (!idea || typeof idea !== "object") {
    return undefined;
  }

  const record = idea as {
    id: string;
    solutionName?: string;
    solution_name?: string;
  };

  return {
    id: record.id,
    solution_name: record.solutionName ?? record.solution_name,
  };
}

export function serializePrototypeTags(prototype: Record<string, unknown>): string[] {
  if (Array.isArray(prototype.tags)) {
    return prototype.tags.filter((tag): tag is string => typeof tag === "string");
  }

  const tagMaps = prototype.tagMaps ?? prototype.tag_maps;
  if (!Array.isArray(tagMaps)) {
    return [];
  }

  return tagMaps
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }

      const tag =
        typeof entry === "object" && entry !== null && "tag" in entry
          ? (entry as { tag?: { name?: string } }).tag
          : entry;

      if (typeof tag === "object" && tag !== null && "name" in tag) {
        return String((tag as { name: string }).name);
      }

      return null;
    })
    .filter((name): name is string => Boolean(name));
}

export function serializeIdea(idea: Record<string, unknown>) {
  return {
    id: idea.id,
    solution_name: idea.solutionName,
    description: idea.description,
    why_it_matters: idea.whyItMatters,
    target_user: idea.targetUser,
    minimum_viable_functionality: idea.minimumViableFunctionality,
    value_hypothesis: idea.valueHypothesis,
    success_criteria: idea.successCriteria,
    acceptance_criteria: idea.acceptanceCriteria,
    owner_id: idea.ownerId,
    status: idea.status,
    priority: idea.priority,
    eta_date: idea.etaDate,
    blocker_reason: idea.blockerReason,
    rejection_reason: idea.rejectionReason,
    prototype_url: idea.prototypeUrl,
    demo_notes: idea.demoNotes,
    decision_notes: idea.decisionNotes,
    created_at: idea.createdAt,
    updated_at: idea.updatedAt,
    owner: serializeOwnerSummary(idea.owner),
  };
}

export function serializePrototype(prototype: Record<string, unknown>) {
  return {
    id: prototype.id,
    name: prototype.name,
    description: prototype.description,
    category: prototype.category,
    status: prototype.status,
    owner_id: prototype.ownerId ?? prototype.owner_id,
    owner: serializeOwnerSummary(prototype.owner),
    demo_url: prototype.demoUrl ?? prototype.demo_url,
    screenshot_url: prototype.screenshotUrl ?? prototype.screenshot_url,
    related_idea_id: prototype.relatedIdeaId ?? prototype.related_idea_id,
    related_idea: serializeRelatedIdeaSummary(
      prototype.relatedIdea ?? prototype.related_idea,
    ),
    tags: serializePrototypeTags(prototype),
    created_at: prototype.createdAt ?? prototype.created_at,
    updated_at: prototype.updatedAt ?? prototype.updated_at,
  };
}

export function serializeReview(review: Record<string, unknown>) {
  return {
    id: review.id,
    prototype_id: review.prototypeId,
    idea_id: review.ideaId,
    reviewer_id: review.reviewerId,
    decision: review.decision,
    decision_notes: review.decisionNotes,
    rejection_reason: review.rejectionReason,
    created_at: review.createdAt,
  };
}
