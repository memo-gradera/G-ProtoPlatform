import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveBackendMode } from '@/services/backendMode';

describe('resolveBackendMode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('forces local when VITE_DEV_DATA_BYPASS is true', () => {
    vi.stubEnv('VITE_DEV_DATA_BYPASS', 'true');
    vi.stubEnv('VITE_BACKEND_PROVIDER', 'api');
    expect(resolveBackendMode()).toBe('local');
  });

  it('returns api when configured and bypass is off', () => {
    vi.stubEnv('VITE_DEV_DATA_BYPASS', 'false');
    vi.stubEnv('VITE_BACKEND_PROVIDER', 'api');
    expect(resolveBackendMode()).toBe('api');
  });

  it('defaults to base44 for legacy compatibility', () => {
    vi.stubEnv('VITE_DEV_DATA_BYPASS', 'false');
    vi.stubEnv('VITE_BACKEND_PROVIDER', '');
    expect(resolveBackendMode()).toBe('base44');
  });
});
