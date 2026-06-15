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
    user: u,
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
      const { user: u, canPerformAction: canAct, hasPermission: hasPerm } = bindRbac(
        user('developer'),
      );
      expect(
        hasAnyDraggableTarget(ownedIdeaInIdeas, canAct, hasPerm, u),
      ).toBe(true);
    });

    it('disables drag for developer on unowned idea', () => {
      const { user: u, canPerformAction: canAct, hasPermission: hasPerm } = bindRbac(
        user('developer'),
      );
      expect(
        hasAnyDraggableTarget(unownedIdeaInIdeas, canAct, hasPerm, u),
      ).toBe(false);
    });

    it('disables drag for viewer', () => {
      const { user: u, canPerformAction: canAct, hasPermission: hasPerm } = bindRbac(
        user('viewer'),
      );
      expect(
        hasAnyDraggableTarget(ownedIdeaInIdeas, canAct, hasPerm, u),
      ).toBe(false);
      expect(hasPerm(PERMISSIONS.IDEA_TRANSITION)).toBe(false);
    });

    it('enables drag for innovation_lead on any workflow-valid target', () => {
      const { user: u, canPerformAction: canAct, hasPermission: hasPerm } = bindRbac(
        user('innovation_lead'),
      );
      expect(
        hasAnyDraggableTarget(unownedIdeaInIdeas, canAct, hasPerm, u),
      ).toBe(true);
    });

    it('enables drag for admin on unowned ideas', () => {
      const { user: u, canPerformAction: canAct, hasPermission: hasPerm } = bindRbac(
        user('admin'),
      );
      expect(
        hasAnyDraggableTarget(unownedIdeaInIdeas, canAct, hasPerm, u),
      ).toBe(true);
    });
  });

  describe('drop authorization', () => {
    it('blocks unauthorized target for developer', () => {
      const { user: u, canPerformAction: canAct } = bindRbac(user('developer'));
      expect(
        canAuthorizeTransition(ownedIdeaInIdeas, 'approved', canAct, u),
      ).toBe(false);
      expect(
        canAuthorizeTransition(ownedIdeaInIdeas, 'rejected', canAct, u),
      ).toBe(false);
    });

    it('allows authorized in_progress target for developer', () => {
      const { user: u, canPerformAction: canAct } = bindRbac(user('developer'));
      expect(
        canAuthorizeTransition(ownedIdeaInIdeas, 'in_progress', canAct, u),
      ).toBe(true);
    });

    it('allows innovation_lead to authorize rejected from ideas', () => {
      const { user: u, canPerformAction: canAct } = bindRbac(user('innovation_lead'));
      expect(
        canAuthorizeTransition(unownedIdeaInIdeas, 'rejected', canAct, u),
      ).toBe(true);
    });

    it('allows admin to move in_progress → ideas', () => {
      const { user: u, canPerformAction: canAct } = bindRbac(user('admin'));
      const inProgressIdea = { id: '5', status: 'in_progress', owner: 'other@example.com' };
      expect(
        canAuthorizeTransition(inProgressIdea, 'ideas', canAct, u),
      ).toBe(true);
    });

    it('allows innovation_lead to move in_progress → ideas', () => {
      const { user: u, canPerformAction: canAct } = bindRbac(user('innovation_lead'));
      const inProgressIdea = { id: '6', status: 'in_progress', owner: 'other@example.com' };
      expect(
        canAuthorizeTransition(inProgressIdea, 'ideas', canAct, u),
      ).toBe(true);
    });

    it('blocks viewer from in_progress → ideas', () => {
      const { user: u, canPerformAction: canAct } = bindRbac(user('viewer'));
      const inProgressIdea = { id: '7', status: 'in_progress', owner: 'dev@example.com' };
      expect(
        canAuthorizeTransition(inProgressIdea, 'ideas', canAct, u),
      ).toBe(false);
    });

    it('blocks developer from in_progress → ideas', () => {
      const { user: u, canPerformAction: canAct } = bindRbac(user('developer'));
      const inProgressIdea = { id: '8', status: 'in_progress', owner: 'dev@example.com' };
      expect(
        canAuthorizeTransition(inProgressIdea, 'ideas', canAct, u),
      ).toBe(false);
    });

    it('allows admin to authorize any workflow-valid column', () => {
      const { user: u, canPerformAction: canAct } = bindRbac(user('admin'));
      const readyIdea = { id: '3', status: 'ready_4_demo', owner: 'other@example.com' };
      expect(
        canAuthorizeTransition(readyIdea, 'approved', canAct, u),
      ).toBe(true);
      expect(
        canAuthorizeTransition(readyIdea, 'in_progress', canAct, u),
      ).toBe(true);
    });

    it('blocks executive reviewer from kanban pipeline transitions', () => {
      const { user: u, canPerformAction: canAct } = bindRbac(user('executive_reviewer'));
      const readyIdea = { id: '3', status: 'ready_4_demo', owner: 'other@example.com' };
      expect(
        canAuthorizeTransition(readyIdea, 'approved', canAct, u),
      ).toBe(true);
      expect(
        hasAnyDraggableTarget(readyIdea, canAct, (p) => hasPermission(user('executive_reviewer'), p), u),
      ).toBe(false);
    });
  });
});
