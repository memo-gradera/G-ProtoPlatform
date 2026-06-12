import { describe, expect, it } from 'vitest';
import { canPerformAction, hasPermission, PERMISSIONS } from './rbac.js';
import {
  canAuthorizeTransition,
  hasAnyDraggableTarget,
  resolveTransitionAction,
} from './kanbanTransitionAuth.js';

function user(role, overrides = {}) {
  return {
    role,
    email: 'dev@example.com',
    full_name: 'Dev User',
    ...overrides,
  };
}

function bindRbac(u) {
  return {
    canPerformAction: (action, resource) => canPerformAction(u, action, resource),
    hasPermission: (permission) => hasPermission(u, permission),
  };
}

const ownedIdeaInIdeas = {
  id: '1',
  status: 'ideas',
  owner: 'dev@example.com',
};

const unownedIdeaInIdeas = {
  id: '2',
  status: 'ideas',
  owner: 'other@example.com',
};

describe('kanbanTransitionAuth', () => {
  describe('resolveTransitionAction', () => {
    it('maps rejected → ideas to reopen permission', () => {
      expect(
        resolveTransitionAction({ status: 'rejected' }, 'ideas'),
      ).toBe('idea.reopen_rejected');
    });

    it('maps drop to approved to review.approve', () => {
      expect(
        resolveTransitionAction({ status: 'ready_4_demo' }, 'approved'),
      ).toBe('review.approve');
    });
  });

  describe('drag enablement', () => {
    it('enables drag when developer has any valid target on owned idea', () => {
      const { canPerformAction: canAct, hasPermission: hasPerm } = bindRbac(
        user('developer'),
      );
      expect(
        hasAnyDraggableTarget(ownedIdeaInIdeas, canAct, hasPerm),
      ).toBe(true);
    });

    it('disables drag for developer on unowned idea', () => {
      const { canPerformAction: canAct, hasPermission: hasPerm } = bindRbac(
        user('developer'),
      );
      expect(
        hasAnyDraggableTarget(unownedIdeaInIdeas, canAct, hasPerm),
      ).toBe(false);
    });

    it('disables drag for viewer', () => {
      const { canPerformAction: canAct, hasPermission: hasPerm } = bindRbac(
        user('viewer'),
      );
      expect(
        hasAnyDraggableTarget(ownedIdeaInIdeas, canAct, hasPerm),
      ).toBe(false);
      expect(hasPerm(PERMISSIONS.IDEA_TRANSITION)).toBe(false);
    });
  });

  describe('drop authorization', () => {
    it('blocks unauthorized target for developer', () => {
      const { canPerformAction: canAct } = bindRbac(user('developer'));
      expect(
        canAuthorizeTransition(ownedIdeaInIdeas, 'approved', canAct),
      ).toBe(false);
      expect(
        canAuthorizeTransition(ownedIdeaInIdeas, 'rejected', canAct),
      ).toBe(false);
    });

    it('allows authorized in_progress target for developer', () => {
      const { canPerformAction: canAct } = bindRbac(user('developer'));
      expect(
        canAuthorizeTransition(ownedIdeaInIdeas, 'in_progress', canAct),
      ).toBe(true);
    });

    it('blocks executive reviewer from kanban pipeline transitions', () => {
      const { canPerformAction: canAct } = bindRbac(user('executive_reviewer'));
      const readyIdea = { id: '3', status: 'ready_4_demo', owner: 'other@example.com' };
      expect(
        canAuthorizeTransition(readyIdea, 'approved', canAct),
      ).toBe(true);
      expect(
        hasAnyDraggableTarget(readyIdea, canAct, (p) => hasPermission(user('executive_reviewer'), p)),
      ).toBe(false);
    });
  });
});
