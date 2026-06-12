import { toast } from '@/components/ui/use-toast';
import { RbacError } from '@/domain/rbac';

export function showAccessDeniedToast(error) {
  const message =
    error instanceof RbacError || error?.name === 'RbacError'
      ? error.message
      : 'You do not have permission to perform this action.';

  toast({
    variant: 'destructive',
    title: 'Access denied',
    description: message,
  });
}

export function isRbacError(error) {
  return error instanceof RbacError || error?.name === 'RbacError';
}
