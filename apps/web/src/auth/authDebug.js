/**
 * Temporary auth diagnostics — off by default.
 * Enable with VITE_AUTH_DEBUG=true in development only.
 */
export function isAuthDebugEnabled() {
  return import.meta.env.DEV && import.meta.env.VITE_AUTH_DEBUG === 'true';
}
