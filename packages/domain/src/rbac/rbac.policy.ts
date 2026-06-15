import type { AppRole } from "@proto-platform/contracts";

export const ROLES: readonly AppRole[] = [
  "admin",
  "innovation_lead",
  "developer",
  "executive_reviewer",
  "viewer",
];

export const PERMISSIONS = {
  IDEA_CREATE: "idea:create",
  IDEA_EDIT: "idea:edit",
  IDEA_TRANSITION: "idea:transition",
  IDEA_DELETE: "idea:delete",
  IDEA_REOPEN_REJECTED: "idea:reopen_rejected",
  PROTOTYPE_CREATE: "prototype:create",
  PROTOTYPE_EDIT: "prototype:edit",
  PROTOTYPE_PUBLISH: "prototype:publish",
  PROTOTYPE_ARCHIVE: "prototype:archive",
  PROTOTYPE_DELETE: "prototype:delete",
  REVIEW_VIEW: "review:view",
  REVIEW_APPROVE: "review:approve",
  REVIEW_REJECT: "review:reject",
  ADMIN_VIEW: "admin:view",
  ADMIN_MANAGE_USERS: "admin:manage_users",
  DASHBOARD_VIEW: "dashboard:view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  admin: ALL_PERMISSIONS,
  innovation_lead: [
    PERMISSIONS.IDEA_CREATE,
    PERMISSIONS.IDEA_EDIT,
    PERMISSIONS.IDEA_TRANSITION,
    PERMISSIONS.IDEA_DELETE,
    PERMISSIONS.IDEA_REOPEN_REJECTED,
    PERMISSIONS.PROTOTYPE_CREATE,
    PERMISSIONS.PROTOTYPE_EDIT,
    PERMISSIONS.PROTOTYPE_PUBLISH,
    PERMISSIONS.PROTOTYPE_ARCHIVE,
    PERMISSIONS.PROTOTYPE_DELETE,
    PERMISSIONS.REVIEW_VIEW,
    PERMISSIONS.REVIEW_APPROVE,
    PERMISSIONS.REVIEW_REJECT,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  developer: [
    PERMISSIONS.IDEA_EDIT,
    PERMISSIONS.IDEA_TRANSITION,
    PERMISSIONS.PROTOTYPE_CREATE,
    PERMISSIONS.PROTOTYPE_EDIT,
    PERMISSIONS.PROTOTYPE_PUBLISH,
    PERMISSIONS.PROTOTYPE_DELETE,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  executive_reviewer: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.REVIEW_VIEW,
    PERMISSIONS.REVIEW_APPROVE,
    PERMISSIONS.REVIEW_REJECT,
  ],
  viewer: [PERMISSIONS.DASHBOARD_VIEW],
};

export interface RbacUser {
  id?: string;
  email?: string;
  role?: string;
}

export function getUserRole(user: RbacUser | null | undefined): AppRole {
  const role = user?.role;
  return ROLES.includes(role as AppRole) ? (role as AppRole) : "viewer";
}

export function hasPermission(
  user: RbacUser | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false;
  const role = getUserRole(user);
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export class RbacError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "RbacError";
  }
}

const DEVELOPER_TRANSITION_TARGETS = new Set([
  "in_progress",
  "ready_for_demo",
  "ready_4_demo",
  "blocked",
]);

export interface IdeaResource {
  ownerId?: string;
  status?: string;
}

export interface TransitionResource {
  idea?: IdeaResource;
  targetStatus?: string;
}

export interface PrototypeSaveResource {
  prototype?: { id?: string; ownerId?: string };
  previousStatus?: string;
  nextStatus?: string;
}

export interface PrototypeResource {
  ownerId?: string;
}

export type RbacAction =
  | "idea.create"
  | "idea.edit"
  | "idea.transition"
  | "idea.delete"
  | "idea.reopen_rejected"
  | "review.approve"
  | "review.reject"
  | "review.needs_revision"
  | "prototype.create"
  | "prototype.edit"
  | "prototype.publish"
  | "prototype.archive"
  | "prototype.delete"
  | "prototype.save"
  | "admin.manage_users";

function matchesOwner(user: RbacUser, idea?: IdeaResource): boolean {
  if (!user?.id || !idea?.ownerId) return false;
  return idea.ownerId === user.id;
}

function matchesPrototypeOwner(user: RbacUser, prototype?: PrototypeResource): boolean {
  if (!user?.id || !prototype?.ownerId) return false;
  return prototype.ownerId === user.id;
}

function canDeletePrototype(user: RbacUser, prototype?: PrototypeResource): boolean {
  if (!hasPermission(user, PERMISSIONS.PROTOTYPE_DELETE)) return false;
  if (getUserRole(user) === "developer") {
    return matchesPrototypeOwner(user, prototype);
  }
  return true;
}

function canEditIdea(user: RbacUser, idea?: IdeaResource): boolean {
  if (!hasPermission(user, PERMISSIONS.IDEA_EDIT)) return false;
  if (getUserRole(user) === "developer") {
    return matchesOwner(user, idea);
  }
  return true;
}

function canTransitionIdea(user: RbacUser, resource: TransitionResource = {}): boolean {
  if (!hasPermission(user, PERMISSIONS.IDEA_TRANSITION)) return false;
  const { idea, targetStatus } = resource;
  if (!idea || !targetStatus) return hasPermission(user, PERMISSIONS.IDEA_TRANSITION);

  if (getUserRole(user) === "developer") {
    if (!matchesOwner(user, idea)) return false;
    const normalized =
      targetStatus === "ready_4_demo" ? "ready_for_demo" : targetStatus;
    return DEVELOPER_TRANSITION_TARGETS.has(normalized);
  }

  return true;
}

function canReviewDecision(idea?: IdeaResource): boolean {
  return idea?.status === "ready_for_demo" || idea?.status === "ready_4_demo";
}

export function canPerformAction(
  user: RbacUser | null | undefined,
  action: RbacAction,
  resource: {
    idea?: IdeaResource;
    targetStatus?: string;
    prototype?: { id?: string; ownerId?: string };
    previousStatus?: string;
    nextStatus?: string;
  } = {},
): boolean {
  if (!user) return false;

  switch (action) {
    case "idea.create":
      return hasPermission(user, PERMISSIONS.IDEA_CREATE);
    case "idea.edit":
      return canEditIdea(user, resource.idea);
    case "idea.transition":
      return canTransitionIdea(user, resource);
    case "idea.delete":
      return hasPermission(user, PERMISSIONS.IDEA_DELETE);
    case "idea.reopen_rejected":
      return (
        hasPermission(user, PERMISSIONS.IDEA_REOPEN_REJECTED) &&
        (resource.idea?.status === "rejected")
      );
    case "review.approve":
      return (
        hasPermission(user, PERMISSIONS.REVIEW_APPROVE) &&
        canReviewDecision(resource.idea)
      );
    case "review.reject":
      return (
        hasPermission(user, PERMISSIONS.REVIEW_REJECT) &&
        canReviewDecision(resource.idea)
      );
    case "review.needs_revision":
      return (
        hasPermission(user, PERMISSIONS.IDEA_TRANSITION) &&
        canReviewDecision(resource.idea)
      );
    case "prototype.create":
      return hasPermission(user, PERMISSIONS.PROTOTYPE_CREATE);
    case "prototype.edit":
      return hasPermission(user, PERMISSIONS.PROTOTYPE_EDIT);
    case "prototype.publish":
      return hasPermission(user, PERMISSIONS.PROTOTYPE_PUBLISH);
    case "prototype.archive":
      return hasPermission(user, PERMISSIONS.PROTOTYPE_ARCHIVE);
    case "prototype.delete":
      return canDeletePrototype(user, resource.prototype);
    case "prototype.save": {
      const { prototype, previousStatus, nextStatus } = resource;
      if (!prototype?.id) {
        return hasPermission(user, PERMISSIONS.PROTOTYPE_CREATE);
      }
      if (!hasPermission(user, PERMISSIONS.PROTOTYPE_EDIT)) return false;
      if (nextStatus === "published" && previousStatus !== "published") {
        return hasPermission(user, PERMISSIONS.PROTOTYPE_PUBLISH);
      }
      if (nextStatus === "archived" && previousStatus !== "archived") {
        return hasPermission(user, PERMISSIONS.PROTOTYPE_ARCHIVE);
      }
      return hasPermission(user, PERMISSIONS.PROTOTYPE_EDIT);
    }
    case "admin.manage_users":
      return hasPermission(user, PERMISSIONS.ADMIN_MANAGE_USERS);
    default:
      return false;
  }
}
