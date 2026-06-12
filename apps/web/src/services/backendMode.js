/**
 * Resolves data backend provider.
 *
 * Priority:
 * 1. VITE_DEV_DATA_BYPASS=true → local (localStorage demo data)
 * 2. VITE_BACKEND_PROVIDER=api | local | base44
 * 3. Default → base44 (legacy pilot compatibility)
 */
export function resolveBackendMode() {
  if (import.meta.env.VITE_DEV_DATA_BYPASS === 'true') {
    return 'local';
  }

  const provider = import.meta.env.VITE_BACKEND_PROVIDER?.toLowerCase();
  if (provider === 'api' || provider === 'local' || provider === 'base44') {
    return provider;
  }

  return 'base44';
}

/** Alias for startup logging and diagnostics */
export function getBackendProvider() {
  return resolveBackendMode();
}

export function isApiBackendEnabled() {
  return resolveBackendMode() === 'api';
}

export function isLocalBackendEnabled() {
  return resolveBackendMode() === 'local';
}

export function isBase44BackendEnabled() {
  return resolveBackendMode() === 'base44';
}
