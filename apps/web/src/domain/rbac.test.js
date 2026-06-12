import { describe, expect, it } from 'vitest';
import {
  PERMISSIONS,
  hasPermission,
  canPerformAction,
} from './rbac.js';

function user(role, overrides = {}) {
  return {
    role,
    email: 'user@example.com',
    full_name: 'Test User',
    ...overrides,
  };
}

const ownedIdea = {
  id: '1',
  status: 'ideas',
  owner: 'user@example.com',
};

const unownedIdea = {
  id: '2',
  status: 'ideas',
  owner: 'other@example.com',
};

const readyForDemoIdea = {
  id: '3',
  status: 'ready_4_demo',
  owner: 'user@example.com',
};

const rejectedIdea = {
  id: '4',
  status: 'rejected',
  owner: 'user@example.com',
};

describe('rbac', () => {
  describe('admin', () => {
    const admin = user('admin');

    it('has all permissions', () => {
      for (const permission of Object.values(PERMISSIONS)) {
        expect(hasPermission(admin, permission)).toBe(true);
      }
    });
  });

  describe('viewer', () => {
    const viewer = user('viewer');

    it('cannot mutate ideas or prototypes', () => {
      expect(canPerformAction(viewer, 'idea.create')).toBe(false);
      expect(canPerformAction(viewer, 'idea.edit', { idea: ownedIdea })).toBe(false);
      expect(
        canPerformAction(viewer, 'idea.transition', {
          idea: ownedIdea,
          targetStatus: 'in_progress',
        }),
      ).toBe(false);
      expect(canPerformAction(viewer, 'idea.delete', { idea: ownedIdea })).toBe(false);
      expect(canPerformAction(viewer, 'prototype.create')).toBe(false);
    });
  });

  describe('executive reviewer', () => {
    const executive = user('executive_reviewer');

    it('can approve and reject ready_4_demo ideas', () => {
      expect(canPerformAction(executive, 'review.approve', { idea: readyForDemoIdea })).toBe(
        true,
      );
      expect(canPerformAction(executive, 'review.reject', { idea: readyForDemoIdea })).toBe(
        true,
      );
    });

    it('cannot review ideas that are not ready_4_demo', () => {
      expect(canPerformAction(executive, 'review.approve', { idea: ownedIdea })).toBe(
        false,
      );
    });
  });

  describe('developer', () => {
    const developer = user('developer');

    it('can edit and transition owned ideas only', () => {
      expect(canPerformAction(developer, 'idea.edit', { idea: ownedIdea })).toBe(true);
      expect(canPerformAction(developer, 'idea.edit', { idea: unownedIdea })).toBe(false);

      expect(
        canPerformAction(developer, 'idea.transition', {
          idea: ownedIdea,
          targetStatus: 'in_progress',
        }),
      ).toBe(true);
      expect(
        canPerformAction(developer, 'idea.transition', {
          idea: unownedIdea,
          targetStatus: 'in_progress',
        }),
      ).toBe(false);
    });

    it('cannot approve or reject', () => {
      expect(
        canPerformAction(developer, 'review.approve', { idea: readyForDemoIdea }),
      ).toBe(false);
      expect(
        canPerformAction(developer, 'review.reject', { idea: readyForDemoIdea }),
      ).toBe(false);
    });

    it('cannot reopen rejected ideas', () => {
      expect(
        canPerformAction(developer, 'idea.reopen_rejected', { idea: rejectedIdea }),
      ).toBe(false);
    });

    it('cannot transition owned ideas to disallowed targets', () => {
      expect(
        canPerformAction(developer, 'idea.transition', {
          idea: ownedIdea,
          targetStatus: 'approved',
        }),
      ).toBe(false);
      expect(
        canPerformAction(developer, 'idea.transition', {
          idea: ownedIdea,
          targetStatus: 'rejected',
        }),
      ).toBe(false);
    });
  });
});
