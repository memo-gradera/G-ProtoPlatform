import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app-params.js', () => ({
  appParams: {
    appId: 'test-app',
    token: null,
    functionsVersion: undefined,
    appBaseUrl: 'https://example.base44.app',
  },
}));

describe('base44Client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('does not enable BASE44 client in MSAL + API mode', async () => {
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'false');
    vi.stubEnv('VITE_AUTH_PROVIDER', 'msal');
    vi.stubEnv('VITE_BACKEND_PROVIDER', 'api');
    vi.stubEnv('VITE_DEV_DATA_BYPASS', 'false');

    const { isBase44ClientEnabled, getBase44Client } = await import(
      '@/api/base44Client.js'
    );

    expect(isBase44ClientEnabled()).toBe(false);
    expect(getBase44Client()).toBeNull();
  });

  it('throws when BASE44 auth is invoked in MSAL mode', async () => {
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'false');
    vi.stubEnv('VITE_AUTH_PROVIDER', 'msal');
    vi.stubEnv('VITE_BACKEND_PROVIDER', 'api');

    const { base44 } = await import('@/api/base44Client.js');

    expect(() => base44.auth.me()).toThrow(/disabled/i);
  });
});
