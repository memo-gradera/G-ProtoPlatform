import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/base44Client', () => ({
  base44: { integrations: { Core: { UploadFile: vi.fn() } } },
}));

vi.mock('@/services/backendMode', () => ({
  isDevDataBypassEnabled: vi.fn(),
  isApiBackendEnabled: vi.fn(),
}));

vi.mock('@/auth/msalConfig', () => ({
  getApiBaseUrl: vi.fn(() => 'http://localhost:8080/api'),
}));

vi.mock('@/auth/tokenProvider', () => ({
  acquireAccessToken: vi.fn().mockResolvedValue(null),
}));

import { isApiBackendEnabled } from '@/services/backendMode';
import {
  filesService,
  FileUploadError,
} from '@/services/filesService';

describe('filesService API mode', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('uploads screenshots via POST /prototypes/screenshots', async () => {
    vi.mocked(isApiBackendEnabled).mockReturnValue(true);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          urls: ['http://localhost:8080/uploads/prototypes/a.png'],
          screenshot_url: 'http://localhost:8080/uploads/prototypes/a.png',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const file = new File(['test'], 'shot.png', { type: 'image/png' });
    const result = await filesService.uploadPrototypeScreenshots([file]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/prototypes/screenshots',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.urls).toHaveLength(1);
    expect(result.screenshot_url).toBe(result.urls[0]);
  });

  it('surfaces API upload errors', async () => {
    vi.mocked(isApiBackendEnabled).mockReturnValue(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Only PNG, JPG, JPEG, and WebP images are allowed.' }),
      }),
    );

    const file = new File(['test'], 'shot.txt', { type: 'text/plain' });

    await expect(filesService.uploadPrototypeScreenshots([file])).rejects.toBeInstanceOf(
      FileUploadError,
    );
  });
});
