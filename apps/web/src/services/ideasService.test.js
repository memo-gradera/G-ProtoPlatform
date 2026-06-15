import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      Idea: {
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
    getIdea: vi.fn(),
    deleteIdea: vi.fn(),
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
import { ideasService } from '@/services/ideasService';

const idea = {
  id: 'idea-1',
  solution_name: 'Test Idea',
  owner: 'user@example.com',
  status: 'ideas',
};

describe('ideasService.remove', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deletes via API when backend provider is api', async () => {
    vi.mocked(isDevDataBypassEnabled).mockReturnValue(false);
    vi.mocked(isApiBackendEnabled).mockReturnValue(true);
    vi.mocked(apiClient.get).mockResolvedValue(idea);
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true, id: 'idea-1' });

    await ideasService.remove('idea-1');

    expect(assertCanPerformAction).toHaveBeenCalledWith('idea.delete', {
      idea: expect.objectContaining({ id: 'idea-1' }),
    });
    expect(apiClient.delete).toHaveBeenCalledWith('/ideas/idea-1');
  });

  it('deletes via devDataStore when data bypass is enabled', async () => {
    vi.mocked(isDevDataBypassEnabled).mockReturnValue(true);
    vi.mocked(devDataStore.getIdea).mockReturnValue(idea);

    await ideasService.remove('idea-1');

    expect(devDataStore.deleteIdea).toHaveBeenCalledWith('idea-1');
  });

  it('deletes via base44 when legacy backend is active', async () => {
    vi.mocked(isDevDataBypassEnabled).mockReturnValue(false);
    vi.mocked(isApiBackendEnabled).mockReturnValue(false);
    vi.mocked(base44.entities.Idea.get).mockResolvedValue(idea);

    await ideasService.remove('idea-1');

    expect(base44.entities.Idea.delete).toHaveBeenCalledWith('idea-1');
  });
});
