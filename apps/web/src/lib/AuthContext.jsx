import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { getBase44Client } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import {
  isBase44AuthMode,
  isLocalAuthMode,
  isMsalAuthMode,
} from '@/lib/authMode';
import {
  clearDevBypassLoggedOut,
  createDevUser,
  isDevAuthBypassEnabled,
  isDevBypassLoggedOut,
  markDevBypassLoggedOut,
} from '@/lib/devUser';
import { logAuthLifecycle } from '@/lib/authLifecycleLog';
import { apiClient } from '@/services/apiClient';
import {
  completeMsalAuthSession,
  mapMsalApiError,
} from '@/auth/msalAuthFlow';
import {
  handleMsalRedirect,
  getMsalAccountDiagnostics,
  isMsalInteractionInProgress,
  loginWithMicrosoft,
  logoutFromMicrosoft,
} from '@/auth/tokenProvider';
import {
  clearSessionUser,
  setSessionUser,
} from '@/auth/sessionUser';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const authCheckInFlightRef = useRef(null);
  const appStateCheckInFlightRef = useRef(null);

  const setLoadingState = useCallback((loading) => {
    logAuthLifecycle('loading state change', { loading });
    setIsLoadingAuth(loading);
    setIsLoadingPublicSettings(loading);
  }, []);

  const applyDevBypassAuth = useCallback(() => {
    logAuthLifecycle('applyDevBypassAuth');
    setAppPublicSettings({ id: appParams.appId, public_settings: {} });
    setAuthError(null);

    if (isDevBypassLoggedOut()) {
      setUser(null);
      setIsAuthenticated(false);
      clearSessionUser();
    } else {
      const devUser = createDevUser();
      setUser(devUser);
      setSessionUser(devUser);
      setIsAuthenticated(true);
    }

    setLoadingState(false);
    setAuthChecked(true);
  }, [setLoadingState]);

  const applyMsalAuth = useCallback(async () => {
    if (authCheckInFlightRef.current) {
      logAuthLifecycle('applyMsalAuth skipped — already in flight');
      return authCheckInFlightRef.current;
    }

    const run = (async () => {
      logAuthLifecycle('applyMsalAuth start');
      const msalBefore = await getMsalAccountDiagnostics();
      logAuthLifecycle('msal accounts', msalBefore);
      setLoadingState(true);
      setAuthError(null);

      try {
        const result = await completeMsalAuthSession({
          handleMsalRedirect,
          getUsersMe: () => apiClient.get('/users/me'),
        });

        logAuthLifecycle('applyMsalAuth session resolved', {
          outcome: result.outcome,
          accountUsername: result.account?.username ?? null,
          apiUserEmail: result.user?.email ?? null,
          msalAccounts: await getMsalAccountDiagnostics(),
        });

        setAppPublicSettings({ id: 'gradera-api', public_settings: {} });

        if (result.outcome === 'no_account') {
          clearSessionUser();
          setUser(null);
          setIsAuthenticated(false);
          setAuthError(null);
          return;
        }

        if (result.outcome === 'success') {
          setSessionUser(result.user);
          setUser(result.user);
          setIsAuthenticated(true);
          setAuthError(null);
          logAuthLifecycle('setUser called', {
            userId: result.user.id,
            email: result.user.email,
            role: result.user.role,
          });
          return;
        }

        clearSessionUser();
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(result.error);
        logAuthLifecycle('auth error set', result.error);
      } catch (error) {
        console.error('[GRADERA MSAL auth]', error);
        clearSessionUser();
        setUser(null);
        setIsAuthenticated(false);
        const mappedError = mapMsalApiError(error);
        setAuthError(mappedError);
        logAuthLifecycle('auth error set', mappedError);
      } finally {
        setLoadingState(false);
        setAuthChecked(true);
        logAuthLifecycle('applyMsalAuth end', {
          authChecked: true,
        });
      }
    })();

    authCheckInFlightRef.current = run;
    try {
      await run;
    } finally {
      authCheckInFlightRef.current = null;
    }
  }, [setLoadingState]);

  const checkUserAuth = useCallback(async () => {
    logAuthLifecycle('checkUserAuth start');

    if (isLocalAuthMode()) {
      applyDevBypassAuth();
      return;
    }

    if (isMsalAuthMode()) {
      await applyMsalAuth();
      return;
    }

    if (!isBase44AuthMode()) {
      return;
    }

    const client = getBase44Client();
    if (!client) {
      setAuthError({
        type: 'auth_required',
        message: 'Authentication required',
      });
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      return;
    }

    try {
      setIsLoadingAuth(true);
      const currentUser = await client.auth.me();
      setSessionUser(currentUser);
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);

      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required',
        });
      }
    } finally {
      logAuthLifecycle('checkUserAuth end');
    }
  }, [applyDevBypassAuth, applyMsalAuth]);

  const checkBase44AppState = useCallback(async () => {
    if (!isBase44AuthMode()) {
      return;
    }

    const client = getBase44Client();
    if (!client) {
      setAuthError({
        type: 'unknown',
        message: 'BASE44 client is not available.',
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId,
        },
        token: appParams.token,
        interceptResponses: true,
      });

      try {
        const publicSettings = await appClient.get(
          `/prod/public-settings/by-id/${appParams.appId}`,
        );
        setAppPublicSettings(publicSettings);

        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);

        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required',
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app',
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message,
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app',
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred',
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  }, [checkUserAuth]);

  const checkAppState = useCallback(async () => {
    if (appStateCheckInFlightRef.current) {
      logAuthLifecycle('checkAppState skipped — already in flight');
      return appStateCheckInFlightRef.current;
    }

    const run = (async () => {
      logAuthLifecycle('checkAppState start');

      if (isLocalAuthMode()) {
        applyDevBypassAuth();
        logAuthLifecycle('checkAppState end', { mode: 'local' });
        return;
      }

      if (isMsalAuthMode()) {
        await applyMsalAuth();
        logAuthLifecycle('checkAppState end', { mode: 'msal' });
        return;
      }

      await checkBase44AppState();
      logAuthLifecycle('checkAppState end', { mode: 'base44' });
    })();

    appStateCheckInFlightRef.current = run;
    try {
      await run;
    } finally {
      appStateCheckInFlightRef.current = null;
    }
  }, [applyDevBypassAuth, applyMsalAuth, checkBase44AppState]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  useEffect(() => {
    if (!isDevAuthBypassEnabled()) return undefined;

    const handleRoleChange = () => {
      if (!isDevBypassLoggedOut()) {
        const devUser = createDevUser();
        setUser(devUser);
        setSessionUser(devUser);
      }
    };

    window.addEventListener('dev-user-role-changed', handleRoleChange);
    return () => window.removeEventListener('dev-user-role-changed', handleRoleChange);
  }, []);

  const logout = (shouldRedirect = true) => {
    logAuthLifecycle('logout', { shouldRedirect });
    setUser(null);
    setIsAuthenticated(false);
    clearSessionUser();
    setAuthError(null);

    if (isLocalAuthMode()) {
      markDevBypassLoggedOut();
      if (shouldRedirect) {
        window.location.href = '/login';
      }
      return;
    }

    if (isMsalAuthMode()) {
      if (shouldRedirect) {
        logoutFromMicrosoft();
      }
      return;
    }

    const client = getBase44Client();
    if (!client) return;

    if (shouldRedirect) {
      client.auth.logout(window.location.href);
    } else {
      client.auth.logout();
    }
  };

  const navigateToLogin = () => {
    if (isAuthenticated && user) {
      logAuthLifecycle('navigateToLogin skipped — already authenticated', {
        email: user.email,
      });
      return;
    }

    if (isMsalAuthMode() && isMsalInteractionInProgress()) {
      logAuthLifecycle('navigateToLogin skipped — MSAL interaction in progress');
      return;
    }

    logAuthLifecycle('navigateToLogin');

    if (isLocalAuthMode()) {
      window.location.href = '/login';
      return;
    }

    if (isMsalAuthMode()) {
      loginWithMicrosoft();
      return;
    }

    const client = getBase44Client();
    if (client) {
      client.auth.redirectToLogin(window.location.href);
    }
  };

  const clearAuthError = useCallback(() => {
    logAuthLifecycle('clearAuthError');
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
        clearAuthError,
        isMsalAuthMode: isMsalAuthMode(),
        isBase44AuthMode: isBase44AuthMode(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
