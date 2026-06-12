import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { canAccessRoute, getAccessDeniedMessage } from '@/domain/rbac';
import AccessDenied from '@/components/shared/AccessDenied';

export default function RoleProtectedRoute({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!canAccessRoute(user, pathname)) {
    return (
      <AccessDenied
        message={getAccessDeniedMessage('this page')}
      />
    );
  }

  return children;
}
