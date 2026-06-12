import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/services/apiClient';
import {
  UNPROVISIONED_MESSAGE,
  completeMsalAuthSession,
  mapMsalApiError,
  resolveProtectedRouteAccess,
  shouldRedirectAuthenticatedUserFromLogin,
} from '@/auth/msalAuthFlow';

describe('msalAuthFlow', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sets user on successful /users/me', async () => {
    const result = await completeMsalAuthSession({
      handleMsalRedirect: vi.fn().mockResolvedValue({
        username: 'user@gradera.ai',
        homeAccountId: 'home-1',
      }),
      getUsersMe: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@gradera.ai',
        full_name: 'Entra User',
        role: 'viewer',
      }),
    });

    expect(result.outcome).toBe('success');
    expect(result.user).toMatchObject({
      id: 'user-1',
      email: 'user@gradera.ai',
      role: 'viewer',
    });
  });

  it('redirects authenticated users away from /login', () => {
    expect(
      shouldRedirectAuthenticatedUserFromLogin({
        pathname: '/login',
        isAuthenticated: true,
        hasUser: true,
      }),
    ).toBe(true);

    expect(
      shouldRedirectAuthenticatedUserFromLogin({
        pathname: '/login',
        isAuthenticated: false,
        hasUser: false,
      }),
    ).toBe(false);
  });

  it('maps 403 provisioning errors without retry loop trigger', () => {
    const error = mapMsalApiError(
      new ApiClientError('not_provisioned', UNPROVISIONED_MESSAGE, 403),
    );

    expect(error).toEqual({
      type: 'user_not_registered',
      message: UNPROVISIONED_MESSAGE,
    });

    const decision = resolveProtectedRouteAccess({
      isAuthenticated: false,
      authError: error,
      isLoadingAuth: false,
      authChecked: true,
    });

    expect(decision.action).toBe('not_provisioned');
  });

  it('maps 401 errors and keeps user on login without auto loop', () => {
    const error = mapMsalApiError(
      new ApiClientError('unauthorized', 'Invalid or expired access token.', 401),
    );

    expect(error.type).toBe('auth_required');

    const decision = resolveProtectedRouteAccess({
      isAuthenticated: false,
      authError: error,
      isLoadingAuth: false,
      authChecked: true,
    });

    expect(decision.action).toBe('redirect_login');
  });

  it('allows protected routes when authenticated even if stale authError exists', () => {
    const decision = resolveProtectedRouteAccess({
      isAuthenticated: true,
      authError: {
        type: 'auth_required',
        message: 'stale error from prior attempt',
      },
      isLoadingAuth: false,
      authChecked: true,
    });

    expect(decision.action).toBe('allow');
  });

  it('does not call BASE44 during MSAL session resolution', async () => {
    const getUsersMe = vi.fn().mockResolvedValue({
      id: 'api-user',
      email: 'user@gradera.ai',
      role: 'admin',
    });
    const handleMsalRedirect = vi.fn().mockResolvedValue({
      username: 'user@gradera.ai',
    });

    await completeMsalAuthSession({ handleMsalRedirect, getUsersMe });

    expect(getUsersMe).toHaveBeenCalledTimes(1);
    expect(handleMsalRedirect).toHaveBeenCalledTimes(1);
  });
});

describe('MSAL/API mode isolation during auth session', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('uses API /users/me and not BASE44 in MSAL mode', async () => {
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'false');
    vi.stubEnv('VITE_AUTH_PROVIDER', 'msal');
    vi.stubEnv('VITE_BACKEND_PROVIDER', 'api');

    vi.resetModules();

    vi.doMock('@/api/base44Client.js', () => ({
      getBase44Client: vi.fn(() => {
        throw new Error('BASE44 should not be called in MSAL mode');
      }),
      isBase44ClientEnabled: vi.fn(() => false),
    }));

    vi.doMock('@/auth/tokenProvider.js', () => ({
      handleMsalRedirect: vi.fn().mockResolvedValue({
        username: 'user@gradera.ai',
      }),
      getMsalAccountDiagnostics: vi.fn().mockResolvedValue({
        accountCount: 1,
        activeUsername: 'user@gradera.ai',
      }),
      isMsalInteractionInProgress: vi.fn(() => false),
      loginWithMicrosoft: vi.fn(),
      logoutFromMicrosoft: vi.fn(),
      acquireAccessToken: vi.fn(),
    }));

    vi.doMock('@/services/apiClient.js', () => ({
      apiClient: {
        get: vi.fn().mockResolvedValue({
          id: 'api-user',
          email: 'user@gradera.ai',
          full_name: 'Entra User',
          role: 'viewer',
        }),
      },
      ApiClientError: class ApiClientError extends Error {
        constructor(type, message, status) {
          super(message);
          this.type = type;
          this.status = status;
        }
      },
    }));

    const { completeMsalAuthSession: completeSession } = await import(
      '@/auth/msalAuthFlow.js'
    );
    const { apiClient } = await import('@/services/apiClient.js');
    const { getBase44Client } = await import('@/api/base44Client.js');
    const { handleMsalRedirect } = await import('@/auth/tokenProvider.js');

    const result = await completeSession({
      handleMsalRedirect,
      getUsersMe: () => apiClient.get('/users/me'),
    });

    expect(result.outcome).toBe('success');
    expect(apiClient.get).toHaveBeenCalledWith('/users/me');
    expect(getBase44Client).not.toHaveBeenCalled();
  });
});
