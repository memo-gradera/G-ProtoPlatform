import { canTransition } from '@/domain/ideaWorkflow';
import { PERMISSIONS } from '@/domain/rbac';

export const KANBAN_COLUMNS = Object.freeze([
  'ideas',
  'in_progress',
  'ready_4_demo',
  'blocked',
  'approved',
  'rejected',
]);

/**
 * Maps a drop target to the RBAC action checked by ideasService.transitionStatus.
 * Keep in sync with ideasService transition permission branches.
 */
export function resolveTransitionAction(idea, targetStorageStatus) {
  if (idea.status === 'rejected' && targetStorageStatus === 'ideas') {
    return 'idea.reopen_rejected';
  }
  if (targetStorageStatus === 'approved') {
    return 'review.approve';
  }
  if (targetStorageStatus === 'rejected') {
    return 'review.reject';
  }
  if (idea.status === 'ready_4_demo' && targetStorageStatus === 'in_progress') {
    return 'review.needs_revision';
  }
  return 'idea.transition';
}

/** Whether workflow + RBAC allow moving an idea to a specific column. */
export function canAuthorizeTransition(idea, targetStorageStatus, canPerformAction) {
  if (!idea || idea.status === targetStorageStatus) return false;
  if (!canTransition(idea.status, targetStorageStatus)) return false;

  const action = resolveTransitionAction(idea, targetStorageStatus);
  if (action === 'idea.transition') {
    return canPerformAction('idea.transition', { idea, targetStatus: targetStorageStatus });
  }
  return canPerformAction(action, { idea });
}

/**
 * Kanban drag enablement: true when the user has at least one authorized target column.
 *
 * We check "any valid target" because @hello-pangea/dnd only exposes a single
 * isDragDisabled flag per card — not per drop zone. The actual destination is unknown
 * until drop, so callers must validate the real target before mutating.
 */
export function hasAnyDraggableTarget(idea, canPerformAction, hasPermission) {
  if (!idea) return false;

  const canDragOnKanban =
    hasPermission(PERMISSIONS.IDEA_TRANSITION) ||
    (idea.status === 'rejected' && hasPermission(PERMISSIONS.IDEA_REOPEN_REJECTED));
  if (!canDragOnKanban) return false;

  return KANBAN_COLUMNS.some(
    (target) =>
      target !== idea.status &&
      canAuthorizeTransition(idea, target, canPerformAction),
  );
}
