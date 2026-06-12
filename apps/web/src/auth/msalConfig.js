export function getMsalConfig() {
  const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;
  const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;

  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri: typeof window !== 'undefined' ? window.location.origin : undefined,
      postLogoutRedirectUri:
        typeof window !== 'undefined'
          ? `${window.location.origin}/login`
          : undefined,
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    },
  };
}

export function getApiScope() {
  return import.meta.env.VITE_API_SCOPE;
}

export function getApiBaseUrl() {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  return base.replace(/\/$/, '');
}

export function isMsalConfigured() {
  return Boolean(
    import.meta.env.VITE_AZURE_TENANT_ID &&
      import.meta.env.VITE_AZURE_CLIENT_ID &&
      import.meta.env.VITE_API_SCOPE,
  );
}
