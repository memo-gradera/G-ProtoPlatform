import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { isBase44AuthMode } from '@/lib/authMode';
import { isBase44BackendEnabled } from '@/services/backendMode';

/**
 * BASE44 SDK is only loaded when auth or data backend still uses BASE44.
 * MSAL + API mode must never initialize the client (avoids analytics /auth side effects).
 */
export function isBase44ClientEnabled() {
  return isBase44AuthMode() || isBase44BackendEnabled();
}

let base44ClientInstance = null;

function createBase44ClientInstance() {
  const { appId, token, functionsVersion, appBaseUrl } = appParams;
  return createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: '',
    requiresAuth: false,
    appBaseUrl,
  });
}

export function getBase44Client() {
  if (!isBase44ClientEnabled()) {
    return null;
  }
  if (!base44ClientInstance) {
    base44ClientInstance = createBase44ClientInstance();
  }
  return base44ClientInstance;
}

/** Test helper */
export function resetBase44ClientForTests() {
  base44ClientInstance = null;
}

function createDisabledBase44Proxy(path = 'base44') {
  const handler = {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      return createDisabledBase44Proxy(`${path}.${String(prop)}`);
    },
    apply() {
      throw new Error(
        `${path}() is disabled. Current mode is MSAL/API — BASE44 must not be used.`,
      );
    },
  };
  return new Proxy(function noop() {}, handler);
}

/**
 * Legacy export — lazily resolves the real client or a no-op proxy that throws on use.
 */
export const base44 = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getBase44Client();
      if (!client) {
        return createDisabledBase44Proxy(`base44.${String(prop)}`);
      }
      return client[prop];
    },
  },
);
