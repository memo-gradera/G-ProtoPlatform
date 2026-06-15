import { normalizeStatus } from '@/domain/ideaWorkflow';

export const ROLES = Object.freeze([
  'admin',
  'innovation_lead',
  'developer',
  'executive_reviewer',
  'viewer',
]);

export const PERMISSIONS = Object.freeze({
  IDEA_CREATE: 'idea:create',
  IDEA_EDIT: 'idea:edit',
  IDEA_TRANSITION: 'idea:transition',
  IDEA_DELETE: 'idea:delete',
  IDEA_REOPEN_REJECTED: 'idea:reopen_rejected',
  PROTOTYPE_CREATE: 'prototype:create',
  PROTOTYPE_EDIT: 'prototype:edit',
  PROTOTYPE_PUBLISH: 'prototype:publish',
  PROTOTYPE_ARCHIVE: 'prototype:archive',
  PROTOTYPE_DELETE: 'prototype:delete',
  REVIEW_VIEW: 'review:view',
  REVIEW_APPROVE: 'review:approve',
  REVIEW_REJECT: 'review:reject',
  ADMIN_VIEW: 'admin:view',
  ADMIN_MANAGE_USERS: 'admin:manage_users',
  DASHBOARD_VIEW: 'dashboard:view',
});

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS = Object.freeze({
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
  viewer: [
    PERMISSIONS.DASHBOARD_VIEW,
  ],
});

/** Storage-status targets a developer may move an idea into */
const DEVELOPER_TRANSITION_TARGETS = new Set([
  'in_progress',
  'ready_4_demo',
  'blocked',
]);

const ROUTE_ROLES = Object.freeze({
  '/': ['admin', 'innovation_lead', 'developer', 'executive_reviewer', 'viewer'],
  '/kanban': ['admin', 'innovation_lead', 'developer', 'viewer'],
  '/prototypes': ['admin', 'innovation_lead', 'developer', 'executive_reviewer', 'viewer'],
  '/review': ['admin', 'innovation_lead', 'executive_reviewer'],
  '/rejected': ['admin', 'innovation_lead'],
  '/settings': ['admin'],
});

export class RbacError extends Error {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message);
    this.name = 'RbacError';
  }
}

export function getUserRole(user) {
  const role = user?.role;
  return ROLES.includes(role) ? role : 'viewer';
}

export function hasPermission(user, permission) {
  if (!user) return false;
  const role = getUserRole(user);
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessRoute(user, route) {
  const allowedRoles = ROUTE_ROLES[route];
  if (!allowedRoles) return true;
  return allowedRoles.includes(getUserRole(user));
}

import { getIdeaOwnerLabel } from '@/services/apiMappers';

function matchesOwner(user, idea) {
  if (!user || !idea) return false;

  const email = user.email?.toLowerCase()?.trim();
  const name = user.full_name?.toLowerCase()?.trim();
  const ownerId = idea.owner_id;
  const ownerEmail = idea.owner_email?.toLowerCase()?.trim();
  const ownerName = idea.owner_name?.toLowerCase()?.trim();
  const ownerDisplay = getIdeaOwnerLabel(idea).toLowerCase().trim();

  if (ownerId && user.id && ownerId === user.id) {
    return true;
  }

  return (
    ownerDisplay === email ||
    ownerDisplay === name ||
    ownerEmail === email ||
    ownerName === name
  );
}

function matchesPrototypeOwner(user, prototype) {
  if (!user || !prototype) return false;

  const email = user.email?.toLowerCase()?.trim();
  const name = user.full_name?.toLowerCase()?.trim();
  const ownerId = prototype.owner_id;
  const ownerEmail = prototype.owner_email?.toLowerCase()?.trim();
  const ownerName = prototype.owner_name?.toLowerCase()?.trim();
  const ownerDisplay = getIdeaOwnerLabel(prototype).toLowerCase().trim();

  if (ownerId && user.id && ownerId === user.id) {
    return true;
  }

  return (
    ownerDisplay === email ||
    ownerDisplay === name ||
    ownerEmail === email ||
    ownerName === name
  );
}

function canDeletePrototype(user, prototype) {
  if (!hasPermission(user, PERMISSIONS.PROTOTYPE_DELETE)) return false;
  if (getUserRole(user) === 'developer') {
    return matchesPrototypeOwner(user, prototype);
  }
  return true;
}

function canEditIdea(user, idea) {
  if (!hasPermission(user, PERMISSIONS.IDEA_EDIT)) return false;
  if (getUserRole(user) === 'developer') {
    return matchesOwner(user, idea);
  }
  return true;
}

function canTransitionIdea(user, { idea, targetStatus } = {}) {
  if (!hasPermission(user, PERMISSIONS.IDEA_TRANSITION)) return false;
  if (!idea || !targetStatus) return hasPermission(user, PERMISSIONS.IDEA_TRANSITION);

  const role = getUserRole(user);
  if (role === 'developer') {
    if (!matchesOwner(user, idea)) return false;
    const storageTarget = normalizeStatus(targetStatus) === 'ready_for_demo'
      ? 'ready_4_demo'
      : targetStatus;
    return DEVELOPER_TRANSITION_TARGETS.has(storageTarget);
  }

  return true;
}

function canReviewDecision(user, idea) {
  return idea?.status === 'ready_4_demo';
}

export function hasUnrestrictedIdeaTransitions(user) {
  const role = getUserRole(user);
  return role === 'admin' || role === 'innovation_lead';
}

/**
 * @param {object|null|undefined} user
 * @param {string} action
 * @param {object} [resource]
 */
export function canPerformAction(user, action, resource = {}) {
  if (!user) return false;

  switch (action) {
    case 'idea.create':
      return hasPermission(user, PERMISSIONS.IDEA_CREATE);

    case 'idea.edit':
      return canEditIdea(user, resource.idea);

    case 'idea.transition':
      return canTransitionIdea(user, resource);

    case 'idea.delete':
      return hasPermission(user, PERMISSIONS.IDEA_DELETE);

    case 'idea.reopen_rejected':
      if (hasUnrestrictedIdeaTransitions(user)) {
        return hasPermission(user, PERMISSIONS.IDEA_TRANSITION);
      }
      return (
        hasPermission(user, PERMISSIONS.IDEA_REOPEN_REJECTED) &&
        resource.idea?.status === 'rejected'
      );

    case 'review.approve':
      if (hasUnrestrictedIdeaTransitions(user)) {
        return hasPermission(user, PERMISSIONS.IDEA_TRANSITION);
      }
      return (
        hasPermission(user, PERMISSIONS.REVIEW_APPROVE) &&
        canReviewDecision(user, resource.idea)
      );

    case 'review.reject':
      if (hasUnrestrictedIdeaTransitions(user)) {
        return hasPermission(user, PERMISSIONS.IDEA_TRANSITION);
      }
      return (
        hasPermission(user, PERMISSIONS.REVIEW_REJECT) &&
        canReviewDecision(user, resource.idea)
      );

    case 'review.needs_revision':
      if (hasUnrestrictedIdeaTransitions(user)) {
        return hasPermission(user, PERMISSIONS.IDEA_TRANSITION);
      }
      return (
        hasPermission(user, PERMISSIONS.IDEA_TRANSITION) &&
        canReviewDecision(user, resource.idea)
      );

    case 'prototype.create':
      return hasPermission(user, PERMISSIONS.PROTOTYPE_CREATE);

    case 'prototype.edit':
      return hasPermission(user, PERMISSIONS.PROTOTYPE_EDIT);

    case 'prototype.publish':
      return hasPermission(user, PERMISSIONS.PROTOTYPE_PUBLISH);

    case 'prototype.archive':
      return hasPermission(user, PERMISSIONS.PROTOTYPE_ARCHIVE);

    case 'prototype.delete':
      return canDeletePrototype(user, resource.prototype);

    case 'admin.manage_users':
      return hasPermission(user, PERMISSIONS.ADMIN_MANAGE_USERS);

    case 'prototype.save': {
      const { prototype, previousStatus, nextStatus } = resource;
      if (!prototype?.id) {
        return hasPermission(user, PERMISSIONS.PROTOTYPE_CREATE);
      }
      if (!hasPermission(user, PERMISSIONS.PROTOTYPE_EDIT)) {
        return false;
      }
      if (nextStatus === 'demo_ready' && previousStatus !== 'demo_ready') {
        return hasPermission(user, PERMISSIONS.PROTOTYPE_PUBLISH);
      }
      if (nextStatus === 'archived' && previousStatus !== 'archived') {
        return hasPermission(user, PERMISSIONS.PROTOTYPE_ARCHIVE);
      }
      return hasPermission(user, PERMISSIONS.PROTOTYPE_EDIT);
    }

    default:
      return false;
  }
}

export function getAccessDeniedMessage(routeOrAction) {
  return `You do not have access to ${routeOrAction}. Contact an administrator if you need elevated permissions.`;
}
