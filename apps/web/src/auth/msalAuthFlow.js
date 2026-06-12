import { ApiClientError } from '@/services/apiClient';
import { normalizeApiUser } from '@/services/apiMappers';

export const UNPROVISIONED_MESSAGE =
  'User is not provisioned in GRADERA Innovation Hub.';

export function mapMsalApiError(error) {
  if (error instanceof ApiClientError) {
    if (error.type === 'not_provisioned' || error.type === 'forbidden') {
      return {
        type: 'user_not_registered',
        message: error.message || UNPROVISIONED_MESSAGE,
      };
    }
    if (error.type === 'unauthorized') {
      return {
        type: 'auth_required',
        message:
          error.message ||
          'Your Microsoft session is valid but the API rejected the access token. Sign in again or contact an administrator.',
      };
    }
    return {
      type: 'unknown',
      message: error.message || 'Failed to authenticate with Microsoft.',
    };
  }

  return {
    type: 'unknown',
    message: error?.message || 'Failed to authenticate with Microsoft.',
  };
}

/**
 * Resolves MSAL account + API profile into an auth session outcome.
 * @param {{ handleMsalRedirect: () => Promise<object|null>, getUsersMe: () => Promise<object> }} deps
 */
export async function completeMsalAuthSession(deps) {
  const account = await deps.handleMsalRedirect();

  if (!account) {
    return { outcome: 'no_account', account: null, user: null, error: null };
  }

  try {
    const profile = await deps.getUsersMe();
    return {
      outcome: 'success',
      account,
      user: normalizeApiUser(profile),
      error: null,
    };
  } catch (error) {
    return {
      outcome: 'error',
      account,
      user: null,
      error: mapMsalApiError(error),
    };
  }
}

export function resolveProtectedRouteAccess({
  isAuthenticated,
  authError,
  isLoadingAuth,
  authChecked,
}) {
  if (isLoadingAuth || !authChecked) {
    return { action: 'loading' };
  }

  if (isAuthenticated) {
    return { action: 'allow' };
  }

  if (authError?.type === 'user_not_registered') {
    return { action: 'not_provisioned' };
  }

  return { action: 'redirect_login' };
}

export function shouldRedirectAuthenticatedUserFromLogin({
  pathname,
  isAuthenticated,
  hasUser,
}) {
  return (
    (pathname === '/login' || pathname === '/login/') &&
    isAuthenticated &&
    hasUser
  );
}

export function shouldAutoRetryMsalLogin({
  isMsalMode,
  isAuthenticated,
  hasUser,
  interactionInProgress,
}) {
  if (!isMsalMode) return false;
  if (isAuthenticated && hasUser) return false;
  if (interactionInProgress) return false;
  return false;
}
