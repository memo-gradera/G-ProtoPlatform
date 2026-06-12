import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAuthDebugEnabled } from '@/auth/authDebug';

describe('authDebug', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is off by default', () => {
    vi.stubEnv('VITE_AUTH_DEBUG', '');

    expect(isAuthDebugEnabled()).toBe(false);
  });

  it('is enabled only when VITE_AUTH_DEBUG=true in development', () => {
    vi.stubEnv('VITE_AUTH_DEBUG', 'true');

    expect(isAuthDebugEnabled()).toBe(import.meta.env.DEV);
  });

  it('stays off when VITE_AUTH_DEBUG is false', () => {
    vi.stubEnv('VITE_AUTH_DEBUG', 'false');

    expect(isAuthDebugEnabled()).toBe(false);
  });
});
