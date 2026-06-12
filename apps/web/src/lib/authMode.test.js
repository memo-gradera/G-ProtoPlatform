import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveAuthMode } from '@/lib/authMode';

describe('resolveAuthMode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('forces local when VITE_DEV_AUTH_BYPASS is true', () => {
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'true');
    vi.stubEnv('VITE_AUTH_PROVIDER', 'msal');
    expect(resolveAuthMode()).toBe('local');
  });

  it('returns msal when configured and bypass is off', () => {
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'false');
    vi.stubEnv('VITE_AUTH_PROVIDER', 'msal');
    expect(resolveAuthMode()).toBe('msal');
  });

  it('defaults to base44 for legacy compatibility', () => {
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'false');
    vi.stubEnv('VITE_AUTH_PROVIDER', '');
    expect(resolveAuthMode()).toBe('base44');
  });
});
