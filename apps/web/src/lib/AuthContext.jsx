import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { enrichUserWithRole } from '@/lib/userRole';
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
import { apiClient, ApiClientError } from '@/services/apiClient';
import { normalizeApiUser } from '@/services/apiMappers';
import {
  handleMsalRedirect,
  loginWithMicrosoft,
  logoutFromMicrosoft,
} from '@/auth/tokenProvider';
import {
  clearSessionUser,
  setSessionUser,
} from '@/auth/sessionUser';

const AuthContext = createContext();

const UNPROVISIONED_MESSAGE =
  'User is not provisioned in GRADERA Innovation Hub.';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const applyDevBypassAuth = useCallback(() => {
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

    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
    setAuthChecked(true);
  }, []);

  const applyMsalAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    try {
      await handleMsalRedirect();
      const profile = await apiClient.get('/users/me');
      const appUser = normalizeApiUser(profile);

      setAppPublicSettings({ id: 'gradera-api', public_settings: {} });
      setSessionUser(appUser);
      setUser(appUser);
      setIsAuthenticated(true);
    } catch (error) {
      clearSessionUser();
      setUser(null);
      setIsAuthenticated(false);

      if (error instanceof ApiClientError) {
        if (error.type === 'not_provisioned' || error.type === 'forbidden') {
          setAuthError({
            type: 'user_not_registered',
            message: error.message || UNPROVISIONED_MESSAGE,
          });
        } else if (error.type === 'unauthorized') {
          setAuthError({
            type: 'auth_required',
            message: error.message || 'Authentication required',
          });
        } else {
          setAuthError({
            type: 'unknown',
            message: error.message || 'Failed to authenticate with Microsoft.',
          });
        }
      } else {
        setAuthError({
          type: 'unknown',
          message: error?.message || 'Failed to authenticate with Microsoft.',
        });
      }
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkAppState();
  }, []);

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

  const checkAppState = async () => {
    if (isLocalAuthMode()) {
      applyDevBypassAuth();
      return;
    }

    if (isMsalAuthMode()) {
      await applyMsalAuth();
      return;
    }

    await checkBase44AppState();
  };

  const checkBase44AppState = async () => {
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
  };

  const checkUserAuth = async () => {
    if (isLocalAuthMode()) {
      applyDevBypassAuth();
      return;
    }

    if (isMsalAuthMode()) {
      await applyMsalAuth();
      return;
    }

    try {
      setIsLoadingAuth(true);
      const currentUser = await enrichUserWithRole(await base44.auth.me());
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
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    clearSessionUser();

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

    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    if (isLocalAuthMode()) {
      window.location.href = '/login';
      return;
    }

    if (isMsalAuthMode()) {
      loginWithMicrosoft();
      return;
    }

    base44.auth.redirectToLogin(window.location.href);
  };

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
