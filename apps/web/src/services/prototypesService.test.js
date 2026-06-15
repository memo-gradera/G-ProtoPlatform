import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      Prototype: {
        get: vi.fn(),
        delete: vi.fn(),
      },
    },
  },
}));

vi.mock('@/services/backendMode', () => ({
  isApiBackendEnabled: vi.fn(),
}));

vi.mock('@/services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/devDataStore', () => ({
  isDevDataBypassEnabled: vi.fn(),
  devDataStore: {
    getPrototype: vi.fn(),
    deletePrototype: vi.fn(),
  },
}));

vi.mock('@/lib/permissionGuard', () => ({
  assertCanPerformAction: vi.fn().mockResolvedValue({}),
}));

import { base44 } from '@/api/base44Client';
import { isDevDataBypassEnabled, devDataStore } from '@/lib/devDataStore';
import { isApiBackendEnabled } from '@/services/backendMode';
import { apiClient } from '@/services/apiClient';
import { assertCanPerformAction } from '@/lib/permissionGuard';
import { prototypesService } from '@/services/prototypesService';

const prototype = {
  id: 'proto-1',
  name: 'Demo',
  owner_id: 'user-1',
  status: 'draft',
};

describe('prototypesService.remove', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deletes via API when backend provider is api', async () => {
    vi.mocked(isDevDataBypassEnabled).mockReturnValue(false);
    vi.mocked(isApiBackendEnabled).mockReturnValue(true);
    vi.mocked(apiClient.get).mockResolvedValue(prototype);
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true, id: 'proto-1' });

    await prototypesService.remove('proto-1');

    expect(assertCanPerformAction).toHaveBeenCalledWith('prototype.delete', {
      prototype: expect.objectContaining({ id: 'proto-1', owner_id: 'user-1' }),
    });
    expect(apiClient.delete).toHaveBeenCalledWith('/prototypes/proto-1');
  });

  it('deletes via devDataStore when data bypass is enabled', async () => {
    vi.mocked(isDevDataBypassEnabled).mockReturnValue(true);
    vi.mocked(devDataStore.getPrototype).mockReturnValue(prototype);

    await prototypesService.remove('proto-1');

    expect(devDataStore.deletePrototype).toHaveBeenCalledWith('proto-1');
  });

  it('deletes via base44 when legacy backend is active', async () => {
    vi.mocked(isDevDataBypassEnabled).mockReturnValue(false);
    vi.mocked(isApiBackendEnabled).mockReturnValue(false);
    vi.mocked(base44.entities.Prototype.get).mockResolvedValue(prototype);

    await prototypesService.remove('proto-1');

    expect(base44.entities.Prototype.delete).toHaveBeenCalledWith('proto-1');
  });
});
