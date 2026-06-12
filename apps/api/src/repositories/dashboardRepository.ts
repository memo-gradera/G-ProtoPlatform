import { prisma } from "../db/client.js";

export const dashboardRepository = {
  async getKpis() {
    const [
      totalIdeas,
      inProgressCount,
      readyForDemoCount,
      approvedCount,
      rejectedCount,
      blockedCount,
      prototypeCount,
    ] = await Promise.all([
      prisma.idea.count(),
      prisma.idea.count({ where: { status: "in_progress" } }),
      prisma.idea.count({ where: { status: "ready_for_demo" } }),
      prisma.idea.count({ where: { status: "approved" } }),
      prisma.idea.count({ where: { status: "rejected" } }),
      prisma.idea.count({ where: { status: "blocked" } }),
      prisma.prototype.count(),
    ]);

    const decided = approvedCount + rejectedCount;
    const approvalRate = decided > 0 ? approvedCount / decided : null;

    const readyHistory = await prisma.ideaStatusHistory.findMany({
      where: { newStatus: "ready_for_demo" },
      select: {
        ideaId: true,
        changedAt: true,
        idea: { select: { createdAt: true } },
      },
      orderBy: { changedAt: "asc" },
    });

    const firstReadyByIdea = new Map<string, { changedAt: Date; createdAt: Date }>();
    for (const entry of readyHistory) {
      if (!firstReadyByIdea.has(entry.ideaId)) {
        firstReadyByIdea.set(entry.ideaId, {
          changedAt: entry.changedAt,
          createdAt: entry.idea.createdAt,
        });
      }
    }

    const cycleTimesMs = [...firstReadyByIdea.values()].map(
      ({ changedAt, createdAt }) => changedAt.getTime() - createdAt.getTime(),
    );

    const averageCycleTimeDays =
      cycleTimesMs.length > 0
        ? cycleTimesMs.reduce((sum, ms) => sum + ms, 0) /
          cycleTimesMs.length /
          (1000 * 60 * 60 * 24)
        : null;

    return {
      total_ideas: totalIdeas,
      in_progress_count: inProgressCount,
      ready_for_demo_count: readyForDemoCount,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
      blocked_count: blockedCount,
      prototype_count: prototypeCount,
      approval_rate: approvalRate,
      average_cycle_time_days: averageCycleTimeDays,
    };
  },
};
