import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/base44Client', () => ({
  base44: { integrations: { Core: { UploadFile: vi.fn() } } },
}));

vi.mock('@/services/backendMode', () => ({
  isDevDataBypassEnabled: vi.fn(),
  isApiBackendEnabled: vi.fn(),
}));

vi.mock('@/services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock('@/auth/msalConfig', () => ({
  getApiBaseUrl: vi.fn(() => 'http://localhost:8080/api'),
}));

vi.mock('@/auth/tokenProvider', () => ({
  acquireAccessToken: vi.fn().mockResolvedValue(null),
}));

import { isApiBackendEnabled } from '@/services/backendMode';
import { apiClient } from '@/services/apiClient';
import {
  filesService,
  FileUploadUnavailableError,
} from '@/services/filesService';

describe('filesService API mode', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('throws FileUploadUnavailableError when upload endpoint is not implemented', async () => {
    vi.mocked(isApiBackendEnabled).mockReturnValue(true);
    vi.mocked(apiClient.get).mockResolvedValue({
      resource: 'files',
      status: 'not_implemented',
    });

    const file = new File(['test'], 'shot.png', { type: 'image/png' });

    await expect(filesService.uploadPrototypeScreenshot(file)).rejects.toBeInstanceOf(
      FileUploadUnavailableError,
    );

    await expect(
      filesService.uploadPrototypeScreenshot(file),
    ).rejects.toThrow(
      'File upload is not available in API mode yet. Use a URL or enable local mode.',
    );
  });
});
