import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/services/apiClient';
import { RbacError } from '@/domain/rbac';
import {
  isAccessDeniedError,
  isRbacError,
  showDeleteErrorToast,
} from '@/lib/accessDeniedToast';

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

import { toast } from '@/components/ui/use-toast';

describe('accessDeniedToast', () => {
  it('treats API forbidden responses as access denied', () => {
    const error = new ApiClientError(
      'forbidden',
      'You do not have permission to perform this action.',
      403,
    );

    expect(isAccessDeniedError(error)).toBe(true);
    expect(isRbacError(error)).toBe(false);
  });

  it('shows linked-record delete errors in toast message', () => {
    const error = new Error(
      'Cannot delete idea with linked prototypes. Delete or archive prototypes first.',
    );

    showDeleteErrorToast(error, 'idea');

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: 'Cannot delete idea',
        description:
          'Cannot delete idea with linked prototypes. Delete or archive prototypes first.',
      }),
    );
  });

  it('shows access denied toast for RBAC errors', () => {
    showDeleteErrorToast(new RbacError(), 'prototype');

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Access denied',
      }),
    );
  });
});
