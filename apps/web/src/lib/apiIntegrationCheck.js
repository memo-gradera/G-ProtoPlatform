/**
 * Smoke-check helpers for local GRADERA API integration (used by scripts/checkApiMode.mjs).
 */

export const API_BASE_URL_MISSING_MESSAGE =
  'VITE_API_BASE_URL is not set. Add it to apps/web/.env.local (e.g. http://localhost:8080/api).';

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string | null}
 */
export function resolveApiBaseUrl(env = {}) {
  const raw = env.VITE_API_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

/**
 * @param {string} apiBaseUrl
 * @returns {string}
 */
export function deriveHealthUrl(apiBaseUrl) {
  if (apiBaseUrl.endsWith('/api')) {
    return `${apiBaseUrl.slice(0, -4)}/health`;
  }
  try {
    const url = new URL(apiBaseUrl);
    url.pathname = '/health';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return `${apiBaseUrl.replace(/\/api\/?$/, '')}/health`;
  }
}

/**
 * @param {Response} response
 */
async function parseJsonBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    return text ? { message: text } : null;
  }
  return response.json();
}

/**
 * @param {string} label
 * @param {string} url
 * @param {RequestInit} [init]
 */
export async function checkEndpoint(label, url, init = {}) {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.headers || {}),
      },
    });
    const body = await parseJsonBody(response);
    const ok = response.ok;
    return {
      label,
      url,
      ok,
      status: response.status,
      detail: ok
        ? summarizeSuccess(body)
        : body?.message || body?.error || `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      label,
      url,
      ok: false,
      status: 0,
      detail: error?.message || 'Network error',
    };
  }
}

function summarizeSuccess(body) {
  if (body == null) return 'OK';
  if (body.status === 'ok') return 'ok';
  if (Array.isArray(body.data)) return `${body.data.length} item(s)`;
  if (body.data && typeof body.data === 'object') {
    if (body.data.email) return body.data.email;
    return 'OK';
  }
  return 'OK';
}

/**
 * @param {string} apiBaseUrl
 * @param {{ bearerToken?: string | null }} [options]
 */
export async function runApiSmokeChecks(apiBaseUrl, options = {}) {
  const headers = {};
  if (options.bearerToken) {
    headers.Authorization = `Bearer ${options.bearerToken}`;
  }

  const healthUrl = deriveHealthUrl(apiBaseUrl);

  return Promise.all([
    checkEndpoint('GET /health', healthUrl, { headers }),
    checkEndpoint('GET /api/users/me', `${apiBaseUrl}/users/me`, { headers }),
    checkEndpoint('GET /api/dashboard/kpis', `${apiBaseUrl}/dashboard/kpis`, {
      headers,
    }),
    checkEndpoint('GET /api/ideas', `${apiBaseUrl}/ideas`, { headers }),
  ]);
}
