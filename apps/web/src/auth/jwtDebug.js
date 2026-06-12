import { isAuthDebugEnabled } from '@/auth/authDebug';

/**
 * Decode JWT payload for debug logging (no signature verification).
 * @param {string | null | undefined} token
 */
export function decodeJwtClaimsForDebug(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    let json;
    if (typeof atob === 'function') {
      json = atob(padded);
    } else if (typeof Buffer !== 'undefined') {
      json = Buffer.from(padded, 'base64').toString('utf8');
    } else {
      return null;
    }
    const payload = JSON.parse(json);
    const exp =
      typeof payload.exp === 'number'
        ? new Date(payload.exp * 1000).toISOString()
        : undefined;

    return {
      aud: payload.aud,
      iss: payload.iss,
      scp: payload.scp,
      tid: payload.tid,
      exp,
      preferred_username:
        payload.preferred_username ?? payload.upn ?? payload.email,
    };
  } catch {
    return null;
  }
}

/**
 * @param {string | null | undefined} token
 * @returns {string | undefined}
 */
export function tokenPrefixForDebug(token) {
  if (!token || typeof token !== 'string') return undefined;
  return token.slice(0, 20);
}

/**
 * @param {string} label
 * @param {object} account
 * @param {string | null | undefined} accessToken
 */
export function logMsalTokenDiagnostics(label, account, accessToken) {
  if (!isAuthDebugEnabled()) return;

  const claims = decodeJwtClaimsForDebug(accessToken);
  console.info(`[GRADERA MSAL] ${label}`, {
    tokenAcquired: Boolean(accessToken),
    account: account
      ? {
          username: account.username,
          homeAccountId: account.homeAccountId,
        }
      : null,
    claims,
  });
}

/**
 * @param {object} params
 */
export function logUsersMeRequestDiagnostics({
  apiUrl,
  authorizationHeaderPresent,
  accessToken,
}) {
  if (!isAuthDebugEnabled()) return;

  console.info('[GRADERA API auth] GET /users/me request', {
    apiUrl,
    authorizationHeaderPresent,
    bearerTokenPrefix: tokenPrefixForDebug(accessToken),
  });
}

/**
 * @param {string} label
 * @param {boolean} tokenAcquired
 * @param {string | null | undefined} token
 * @param {boolean} hasAuthorizationHeader
 */
export function logApiAuthDebug(
  label,
  { tokenAcquired, token, hasAuthorizationHeader },
) {
  if (!isAuthDebugEnabled()) return;

  const claims = decodeJwtClaimsForDebug(token);
  console.info(`[GRADERA API auth] ${label}`, {
    tokenAcquired,
    hasAuthorizationHeader,
    claims,
  });
}
