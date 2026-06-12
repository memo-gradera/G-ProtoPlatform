/**
 * Resolves frontend authentication provider.
 *
 * Priority:
 * 1. VITE_DEV_AUTH_BYPASS=true → local (dev user)
 * 2. VITE_AUTH_PROVIDER=msal | local | base44
 * 3. Default → base44 (legacy pilot compatibility)
 */
export function resolveAuthMode() {
  if (import.meta.env.VITE_DEV_AUTH_BYPASS === 'true') {
    return 'local';
  }

  const provider = import.meta.env.VITE_AUTH_PROVIDER?.toLowerCase();
  if (provider === 'msal' || provider === 'local' || provider === 'base44') {
    return provider;
  }

  return 'base44';
}

/** Alias for startup logging and diagnostics */
export function getAuthProvider() {
  return resolveAuthMode();
}

export function isLocalAuthMode() {
  return resolveAuthMode() === 'local';
}

export function isMsalAuthMode() {
  return resolveAuthMode() === 'msal';
}

export function isBase44AuthMode() {
  return resolveAuthMode() === 'base44';
}
