import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/usersService.js', () => ({
  usersService: {
    enrichAuthUserWithRole: vi.fn(),
    me: vi.fn(),
  },
}));

import { usersService } from '@/services/usersService.js';
import { enrichUserWithRole } from '@/lib/userRole.js';

describe('MSAL/API mode isolation', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('enrichUserWithRole does not call BASE44 enrichment in MSAL mode', async () => {
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'false');
    vi.stubEnv('VITE_AUTH_PROVIDER', 'msal');
    vi.stubEnv('VITE_BACKEND_PROVIDER', 'api');

    const authUser = { id: '1', email: 'user@gradera.ai', role: 'admin' };
    const result = await enrichUserWithRole(authUser);

    expect(result).toEqual(authUser);
    expect(usersService.enrichAuthUserWithRole).not.toHaveBeenCalled();
  });

  it('getCurrentUser uses API client instead of BASE44 in MSAL mode', async () => {
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'false');
    vi.stubEnv('VITE_AUTH_PROVIDER', 'msal');
    vi.stubEnv('VITE_BACKEND_PROVIDER', 'api');

    vi.resetModules();

    vi.doMock('@/auth/sessionUser.js', () => ({
      getSessionUser: vi.fn(() => null),
      setSessionUser: vi.fn(),
    }));

    vi.doMock('@/services/apiClient.js', () => ({
      apiClient: {
        get: vi.fn().mockResolvedValue({
          id: 'api-user',
          email: 'user@gradera.ai',
          role: 'viewer',
        }),
      },
    }));

    vi.doMock('@/api/base44Client.js', () => ({
      getBase44Client: vi.fn(() => null),
      isBase44ClientEnabled: vi.fn(() => false),
    }));

    const { getCurrentUser } = await import('@/lib/permissionGuard.js');
    const { apiClient } = await import('@/services/apiClient.js');
    const { getBase44Client } = await import('@/api/base44Client.js');

    const user = await getCurrentUser();

    expect(apiClient.get).toHaveBeenCalledWith('/users/me');
    expect(getBase44Client).not.toHaveBeenCalled();
    expect(user.email).toBe('user@gradera.ai');
  });
});
