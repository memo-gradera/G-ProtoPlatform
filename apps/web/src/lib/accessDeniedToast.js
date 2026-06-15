import { toast } from '@/components/ui/use-toast';
import { RbacError } from '@/domain/rbac';
import { ApiClientError } from '@/services/apiClient';

export function showAccessDeniedToast(error) {
  const message =
    error instanceof RbacError || error?.name === 'RbacError'
      ? error.message
      : error instanceof ApiClientError && error.type === 'forbidden'
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

export function isAccessDeniedError(error) {
  return (
    isRbacError(error) ||
    (error instanceof ApiClientError &&
      (error.type === 'forbidden' || error.type === 'not_provisioned'))
  );
}

export function showDeleteErrorToast(error, entityName) {
  if (isAccessDeniedError(error)) {
    showAccessDeniedToast(error);
    return;
  }

  toast({
    variant: 'destructive',
    title: `Cannot delete ${entityName}`,
    description: error?.message || 'Delete failed.',
  });
}
