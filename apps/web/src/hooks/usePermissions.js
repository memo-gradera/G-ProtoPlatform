import { useAuth } from '@/lib/AuthContext';
import {
  canAccessRoute,
  canPerformAction,
  getUserRole,
  hasPermission,
} from '@/domain/rbac';

export function usePermissions() {
  const { user } = useAuth();

  return {
    user,
    role: getUserRole(user),
    hasPermission: (permission) => hasPermission(user, permission),
    canAccessRoute: (route) => canAccessRoute(user, route),
    canPerformAction: (action, resource) => canPerformAction(user, action, resource),
  };
}
