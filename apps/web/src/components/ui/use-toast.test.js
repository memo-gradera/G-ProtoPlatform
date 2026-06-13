import { describe, expect, it } from 'vitest';
import { reducer, shouldDismissToastOnClick } from '@/components/ui/use-toast';

function mockClickTarget({ interactive = false } = {}) {
  const target = {
    closest() {
      return interactive ? target : null;
    },
  };
  return target;
}

describe('shouldDismissToastOnClick', () => {
  it('dismisses when clicking toast body text', () => {
    expect(shouldDismissToastOnClick(mockClickTarget())).toBe(true);
  });

  it('does not dismiss when clicking an interactive child button', () => {
    expect(shouldDismissToastOnClick(mockClickTarget({ interactive: true }))).toBe(
      false,
    );
  });

  it('does not dismiss when clicking toast action links', () => {
    expect(shouldDismissToastOnClick(mockClickTarget({ interactive: true }))).toBe(
      false,
    );
  });

  it('dismisses when target has no closest method', () => {
    expect(shouldDismissToastOnClick(null)).toBe(true);
    expect(shouldDismissToastOnClick({})).toBe(true);
  });
});

describe('use-toast reducer', () => {
  it('marks a toast as closed when dismissed', () => {
    const state = {
      toasts: [
        { id: '1', open: true },
        { id: '2', open: true },
      ],
    };

    const next = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' });

    expect(next.toasts.find((toast) => toast.id === '1')?.open).toBe(false);
    expect(next.toasts.find((toast) => toast.id === '2')?.open).toBe(true);
  });
});
