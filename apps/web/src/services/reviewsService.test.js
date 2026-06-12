import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/base44Client', () => ({
  base44: {},
}));

vi.mock('@/services/backendMode', () => ({
  isDevDataBypassEnabled: vi.fn(),
  isApiBackendEnabled: vi.fn(),
  isBase44BackendEnabled: vi.fn(),
}));

vi.mock('@/services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/lib/devDataStore', () => ({
  isDevDataBypassEnabled: vi.fn(),
  devDataStore: {
    listReviews: vi.fn(),
    createReview: vi.fn(),
  },
}));

import { isDevDataBypassEnabled, devDataStore } from '@/lib/devDataStore';
import { isApiBackendEnabled, isBase44BackendEnabled } from '@/services/backendMode';
import { apiClient } from '@/services/apiClient';
import { reviewsService, ReviewsBackendUnavailableError } from '@/services/reviewsService';

describe('reviewsService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses API mode when backend provider is api', async () => {
    vi.mocked(isDevDataBypassEnabled).mockReturnValue(false);
    vi.mocked(isApiBackendEnabled).mockReturnValue(true);
    vi.mocked(isBase44BackendEnabled).mockReturnValue(false);
    vi.mocked(apiClient.get).mockResolvedValue([
      { id: 'r1', idea_id: 'i1', decision: 'approved' },
    ]);

    const reviews = await reviewsService.list({ ideaId: 'i1' });

    expect(apiClient.get).toHaveBeenCalledWith('/reviews?idea_id=i1');
    expect(reviews).toHaveLength(1);
    expect(reviews[0].decision).toBe('approved');
  });

  it('creates review via POST /reviews in API mode', async () => {
    vi.mocked(isDevDataBypassEnabled).mockReturnValue(false);
    vi.mocked(isApiBackendEnabled).mockReturnValue(true);
    vi.mocked(isBase44BackendEnabled).mockReturnValue(false);
    vi.mocked(apiClient.post).mockResolvedValue({
      id: 'r2',
      idea_id: 'i1',
      decision: 'rejected',
    });

    const review = await reviewsService.reject({
      prototypeId: 'p1',
      ideaId: 'i1',
      rejectionReason: 'Not ready',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/reviews', {
      prototype_id: 'p1',
      idea_id: 'i1',
      decision: 'rejected',
      decision_notes: undefined,
      rejection_reason: 'Not ready',
      rejection_reason_id: undefined,
    });
    expect(review.decision).toBe('rejected');
  });

  it('uses local devDataStore when data bypass is enabled', async () => {
    vi.mocked(isDevDataBypassEnabled).mockReturnValue(true);
    vi.mocked(isApiBackendEnabled).mockReturnValue(false);
    vi.mocked(devDataStore.listReviews).mockReturnValue([]);

    await reviewsService.list();

    expect(devDataStore.listReviews).toHaveBeenCalled();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('rejects BASE44 mode with typed error', async () => {
    vi.mocked(isDevDataBypassEnabled).mockReturnValue(false);
    vi.mocked(isApiBackendEnabled).mockReturnValue(false);
    vi.mocked(isBase44BackendEnabled).mockReturnValue(true);

    await expect(reviewsService.list()).rejects.toBeInstanceOf(
      ReviewsBackendUnavailableError,
    );
  });
});
