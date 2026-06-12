import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, apiRequest } from '@/services/apiClient';

vi.mock('@/auth/tokenProvider', () => ({
  acquireAccessToken: vi.fn(),
}));

import { acquireAccessToken } from '@/auth/tokenProvider';

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3001/api');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('attaches bearer token when provided', async () => {
    vi.mocked(acquireAccessToken).mockResolvedValue(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhcGkiLCJzY3AiOiJhY2Nlc3MiLCJ0aWQiOiJ0MSIsInByZWZlcnJlZF91c2VybmFtZSI6InVzZXJAZ3JhZGVyYS5haSJ9.sig',
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { ok: true } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest('GET', '/users/me');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/users/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer /),
        }),
      }),
    );
  });

  it('normalizes 401 errors', async () => {
    vi.mocked(acquireAccessToken).mockResolvedValue('expired-token');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ message: 'Authentication required.' }),
      }),
    );

    await expect(apiRequest('GET', '/users/me')).rejects.toMatchObject({
      type: 'unauthorized',
      status: 401,
    });
  });

  it('normalizes 403 provisioning errors', async () => {
    vi.mocked(acquireAccessToken).mockResolvedValue('valid-token');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: { get: () => 'application/json' },
        json: async () => ({
          message: 'User is not provisioned in GRADERA Innovation Hub.',
        }),
      }),
    );

    try {
      await apiRequest('GET', '/users/me');
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      expect(error.type).toBe('not_provisioned');
      expect(error.status).toBe(403);
      expect(error.toastMessage).toContain('not provisioned');
    }
  });
});
