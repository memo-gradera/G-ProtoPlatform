import { describe, expect, it } from 'vitest';
import {
  canTransition,
  getAllowedTransitions,
  validateTransition,
  assertTransition,
  WorkflowValidationError,
} from './ideaWorkflow.js';

describe('ideaWorkflow', () => {
  describe('valid transitions', () => {
    it('allows ideas → in_progress', () => {
      expect(canTransition('ideas', 'in_progress')).toBe(true);
      expect(validateTransition('ideas', 'in_progress', {})).toEqual({ valid: true });
    });

    it('allows in_progress → ready_4_demo with valid prototype_url', () => {
      const context = { prototype_url: 'https://demo.example.com' };
      expect(canTransition('in_progress', 'ready_4_demo')).toBe(true);
      expect(validateTransition('in_progress', 'ready_4_demo', context)).toEqual({
        valid: true,
      });
    });

    it('normalizes ready_4_demo storage status', () => {
      expect(getAllowedTransitions('ready_4_demo')).toContain('approved');
    });
  });

  describe('invalid transitions', () => {
    it('blocks ideas → approved', () => {
      expect(canTransition('ideas', 'approved')).toBe(false);
      expect(validateTransition('ideas', 'approved', { demo_notes: 'ok' }).valid).toBe(
        false,
      );
    });

    it('blocks same-status moves', () => {
      expect(validateTransition('in_progress', 'in_progress', {}).valid).toBe(false);
    });
  });

  describe('approved is terminal', () => {
    it('allows no transitions out of approved', () => {
      expect(getAllowedTransitions('approved')).toEqual([]);
      expect(canTransition('approved', 'in_progress')).toBe(false);
    });

    it('returns a final-stage message', () => {
      const result = validateTransition('approved', 'in_progress', {});
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/final/i);
    });

    it('assertTransition throws WorkflowValidationError', () => {
      expect(() => assertTransition('approved', 'rejected', {})).toThrow(
        WorkflowValidationError,
      );
    });
  });

  describe('rejected can reopen to ideas', () => {
    it('allows rejected → ideas', () => {
      expect(canTransition('rejected', 'ideas')).toBe(true);
      expect(validateTransition('rejected', 'ideas', {})).toEqual({ valid: true });
    });
  });

  describe('required fields', () => {
    it('blocked requires blocker_reason', () => {
      const missing = validateTransition('ideas', 'blocked', {});
      expect(missing.valid).toBe(false);
      expect(missing.message).toMatch(/blocker reason/i);

      const whitespace = validateTransition('ideas', 'blocked', {
        blocker_reason: '   ',
      });
      expect(whitespace.valid).toBe(false);

      const ok = validateTransition('ideas', 'blocked', {
        blocker_reason: 'Waiting on vendor',
      });
      expect(ok).toEqual({ valid: true });
    });

    it('rejected requires rejection_reason', () => {
      const missing = validateTransition('ideas', 'rejected', {});
      expect(missing.valid).toBe(false);
      expect(missing.message).toMatch(/rejection reason/i);

      const ok = validateTransition('ideas', 'rejected', {
        rejection_reason: 'Out of scope',
      });
      expect(ok).toEqual({ valid: true });
    });

    it('ready_4_demo requires valid prototype_url', () => {
      const missing = validateTransition('in_progress', 'ready_4_demo', {});
      expect(missing.valid).toBe(false);
      expect(missing.message).toMatch(/prototype URL/i);

      const invalid = validateTransition('in_progress', 'ready_4_demo', {
        prototype_url: 'not-a-url',
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.message).toMatch(/valid prototype URL/i);

      const ok = validateTransition('in_progress', 'ready_4_demo', {
        prototype_url: 'https://prototype.example.com',
      });
      expect(ok).toEqual({ valid: true });
    });

    it('approved requires demo_notes or decision_notes', () => {
      const missing = validateTransition('ready_4_demo', 'approved', {});
      expect(missing.valid).toBe(false);
      expect(missing.message).toMatch(/decision notes/i);

      expect(
        validateTransition('ready_4_demo', 'approved', { demo_notes: 'Ship it' }),
      ).toEqual({ valid: true });

      expect(
        validateTransition('ready_4_demo', 'approved', {
          decision_notes: 'Approved in exec review',
        }),
      ).toEqual({ valid: true });
    });
  });
});
