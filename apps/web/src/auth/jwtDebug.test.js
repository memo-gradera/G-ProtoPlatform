import { afterEach, describe, expect, it, vi } from 'vitest';
import { logMsalTokenDiagnostics } from '@/auth/jwtDebug';

describe('jwtDebug auth logging', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('does not log MSAL diagnostics by default', () => {
    vi.stubEnv('VITE_AUTH_DEBUG', '');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logMsalTokenDiagnostics('acquireTokenSilent', { username: 'user@gradera.ai' }, 'token');

    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logs MSAL diagnostics when auth debug is enabled', () => {
    vi.stubEnv('VITE_AUTH_DEBUG', 'true');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logMsalTokenDiagnostics('acquireTokenSilent', { username: 'user@gradera.ai' }, null);

    expect(infoSpy).toHaveBeenCalled();
  });
});
