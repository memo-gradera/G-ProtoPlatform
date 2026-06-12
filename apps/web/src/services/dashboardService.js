import { differenceInDays } from 'date-fns';
import { ideasService } from '@/services/ideasService';
import { ideaStatusHistoryService } from '@/services/ideaStatusHistoryService';
import { prototypesService } from '@/services/prototypesService';
import { isApiBackendEnabled } from '@/services/backendMode';
import { apiClient } from '@/services/apiClient';
import { normalizeDashboardKpis } from '@/services/apiMappers';

/**
 * Average days from idea creation to first Ready for Demo transition (history-based).
 * @param {Array<{ id: string, created_date?: string }>} ideas
 * @param {Array<{ idea_id: string, new_status: string, changed_at?: string, created_date?: string }>} history
 * @returns {string | null}
 */
function computeAvgCycleTimeFromHistory(ideas, history) {
  const firstReadyAtByIdea = new Map();

  for (const entry of history) {
    if (!ideaStatusHistoryService.isReadyForDemoStatus(entry.new_status)) {
      continue;
    }

    const at = new Date(entry.changed_at || entry.created_date);
    if (Number.isNaN(at.getTime())) continue;

    const previous = firstReadyAtByIdea.get(entry.idea_id);
    if (!previous || at < previous) {
      firstReadyAtByIdea.set(entry.idea_id, at);
    }
  }

  const dayCounts = [];

  for (const [ideaId, readyAt] of firstReadyAtByIdea) {
    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea?.created_date) continue;

    const created = new Date(idea.created_date);
    if (Number.isNaN(created.getTime())) continue;

    dayCounts.push(differenceInDays(readyAt, created));
  }

  if (dayCounts.length === 0) {
    return null;
  }

  const avg = Math.round(
    dayCounts.reduce((sum, days) => sum + days, 0) / dayCounts.length,
  );
  return `${avg} days`;
}

/**
 * Legacy estimate when no history records exist yet.
 * @param {Array<{ status: string, created_date?: string, updated_date?: string }>} ideas
 * @returns {string | null}
 */
function computeAvgCycleTimeLegacy(ideas) {
  const demoReady = ideas.filter(
    (i) => i.status === 'ready_4_demo' && i.created_date,
  );

  if (demoReady.length === 0) {
    return null;
  }

  const totalDays = demoReady.reduce((sum, i) => {
    return (
      sum +
      differenceInDays(
        new Date(i.updated_date || new Date()),
        new Date(i.created_date),
      )
    );
  }, 0);

  return Math.round(totalDays / demoReady.length) + ' days';
}

export const dashboardService = {
  async getKpis() {
    if (isApiBackendEnabled()) {
      const kpis = await apiClient.get('/dashboard/kpis');
      return normalizeDashboardKpis(kpis);
    }

    const [ideas, prototypes, history] = await Promise.all([
      ideasService.list(),
      prototypesService.list(),
      ideaStatusHistoryService.list(),
    ]);

    const totalIdeas = ideas.length;
    const inProgress = ideas.filter((i) => i.status === 'in_progress').length;
    const readyForDemo = ideas.filter((i) => i.status === 'ready_4_demo').length;
    const approved = ideas.filter((i) => i.status === 'approved').length;
    const rejected = ideas.filter((i) => i.status === 'rejected').length;
    const blocked = ideas.filter((i) => i.status === 'blocked').length;

    const approvalRate =
      totalIdeas > 0 ? Math.round((approved / totalIdeas) * 100) + '%' : '—';

    let avgCycleTime = '—';
    if (history.length > 0) {
      avgCycleTime =
        computeAvgCycleTimeFromHistory(ideas, history) ?? '—';
    } else {
      avgCycleTime = computeAvgCycleTimeLegacy(ideas) ?? '—';
    }

    return {
      totalIdeas,
      inProgress,
      readyForDemo,
      approved,
      rejected,
      blocked,
      approvalRate,
      avgCycleTime,
      prototypeCount: prototypes.length,
    };
  },

  getIdeasByStatus() {
    return ideasService.list();
  },

  async getRejectionReasons() {
    const ideas = await ideasService.list();
    const rejected = ideas.filter((i) => i.status === 'rejected');
    const reasonMap = {};

    rejected.forEach((i) => {
      const reason = i.rejection_reason || 'No reason given';
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    });

    return Object.entries(reasonMap).map(([reason, count]) => ({
      reason: reason.length > 25 ? reason.slice(0, 25) + '…' : reason,
      count,
    }));
  },
};
