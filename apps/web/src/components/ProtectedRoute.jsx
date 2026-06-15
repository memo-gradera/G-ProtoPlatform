import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { resolveProtectedRouteAccess } from '@/auth/msalAuthFlow';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import GraderaLogo from '@/components/GraderaLogo';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background">
    <GraderaLogo size="lg" tone="onLight" />
    <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError } = useAuth();

  const decision = resolveProtectedRouteAccess({
    isAuthenticated,
    authError,
    isLoadingAuth,
    authChecked,
  });

  if (decision.action === 'loading') {
    return fallback;
  }

  if (decision.action === 'not_provisioned') {
    return <UserNotRegisteredError message={authError?.message} />;
  }

  if (decision.action === 'redirect_login') {
    return unauthenticatedElement;
  }

  return <Outlet />;
}
