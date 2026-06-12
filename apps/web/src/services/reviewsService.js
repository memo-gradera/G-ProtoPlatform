import { base44 } from '@/api/base44Client';
import { devDataStore, isDevDataBypassEnabled } from '@/lib/devDataStore';
import { isApiBackendEnabled, isBase44BackendEnabled } from '@/services/backendMode';
import { apiClient } from '@/services/apiClient';
import { normalizeReview } from '@/services/apiMappers';

export class ReviewsBackendUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReviewsBackendUnavailableError';
  }
}

export const reviewsService = {
  /**
   * @param {{ ideaId?: string }} [options]
   */
  list(options = {}) {
    const { ideaId } = options;

    if (isDevDataBypassEnabled()) {
      return Promise.resolve(devDataStore.listReviews({ ideaId }));
    }

    if (isApiBackendEnabled()) {
      const query = ideaId ? `?idea_id=${encodeURIComponent(ideaId)}` : '';
      return apiClient
        .get(`/reviews${query}`)
        .then((reviews) => reviews.map(normalizeReview));
    }

    if (isBase44BackendEnabled()) {
      return Promise.reject(
        new ReviewsBackendUnavailableError(
          'Reviews are not available on the BASE44 pilot backend. Use API mode or local demo data.',
        ),
      );
    }

    return Promise.resolve([]);
  },

  /**
   * Creates an executive review record. Approve/reject transitions the linked idea via API.
   * @param {object} payload
   */
  async create(payload) {
    if (isDevDataBypassEnabled()) {
      return devDataStore.createReview(payload);
    }

    if (isApiBackendEnabled()) {
      const body = {
        prototype_id: payload.prototype_id,
        idea_id: payload.idea_id,
        decision: payload.decision,
        decision_notes: payload.decision_notes,
        rejection_reason: payload.rejection_reason,
        rejection_reason_id: payload.rejection_reason_id,
      };
      const review = await apiClient.post('/reviews', body);
      return normalizeReview(review);
    }

    if (isBase44BackendEnabled()) {
      throw new ReviewsBackendUnavailableError(
        'Reviews are not available on the BASE44 pilot backend. Use API mode or local demo data.',
      );
    }

    throw new ReviewsBackendUnavailableError('Reviews backend is not configured.');
  },

  /**
   * Convenience wrapper for executive approve flow (API creates review + transitions idea).
   */
  async approve({ prototypeId, ideaId, decisionNotes }) {
    return this.create({
      prototype_id: prototypeId,
      idea_id: ideaId,
      decision: 'approved',
      decision_notes: decisionNotes,
    });
  },

  /**
   * Convenience wrapper for executive reject flow.
   */
  async reject({ prototypeId, ideaId, rejectionReason, decisionNotes }) {
    return this.create({
      prototype_id: prototypeId,
      idea_id: ideaId,
      decision: 'rejected',
      rejection_reason: rejectionReason,
      decision_notes: decisionNotes,
    });
  },
};
