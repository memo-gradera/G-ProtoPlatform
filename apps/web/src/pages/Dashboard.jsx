import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { queryKeys } from '@/lib/queryKeys';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import StatusPieChart from '@/components/dashboard/StatusPieChart';
import RejectionChart from '@/components/dashboard/RejectionChart';
import { resolveDashboardViewState } from '@/pages/dashboardViewState';
import { Button } from '@/components/ui/button';
import {
  Lightbulb, Rocket, Monitor, CheckCircle2, XCircle,
  Clock, TrendingUp, AlertTriangle,
} from 'lucide-react';

export default function Dashboard() {
  const kpisQuery = useQuery({
    queryKey: queryKeys.ideas.kpis,
    queryFn: () => dashboardService.getKpis(),
  });

  const ideasQuery = useQuery({
    queryKey: queryKeys.ideas.list(),
    queryFn: () => dashboardService.getIdeasByStatus(),
  });

  const isLoading = kpisQuery.isLoading || ideasQuery.isLoading;
  const hasError = kpisQuery.isError || ideasQuery.isError;
  const viewState = resolveDashboardViewState({
    kpisLoading: kpisQuery.isLoading,
    ideasLoading: ideasQuery.isLoading,
    kpisError: kpisQuery.isError,
    ideasError: ideasQuery.isError,
    kpis: kpisQuery.data,
  });
  const errorMessage =
    kpisQuery.error?.message ||
    ideasQuery.error?.message ||
    'Unable to load dashboard data from the GRADERA API.';

  if (viewState === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (viewState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-6">
        <AlertTriangle className="w-10 h-10 text-destructive" />
        <div>
          <p className="font-medium text-foreground">Dashboard failed to load</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">{errorMessage}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            kpisQuery.refetch();
            ideasQuery.refetch();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const kpis = kpisQuery.data;
  const ideas = ideasQuery.data ?? [];

  if (viewState !== 'ready' || !kpis) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-6">
        <AlertTriangle className="w-10 h-10 text-destructive" />
        <p className="text-sm text-muted-foreground">Dashboard data is unavailable.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            kpisQuery.refetch();
            ideasQuery.refetch();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Innovation pipeline overview and key metrics"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Ideas" value={kpis.totalIdeas} icon={Lightbulb} />
        <StatCard label="In Progress" value={kpis.inProgress} icon={Rocket} accent="bg-amber-500" />
        <StatCard label="Ready for Demo" value={kpis.readyForDemo} icon={Monitor} accent="bg-violet-500" />
        <StatCard label="Approved" value={kpis.approved} icon={CheckCircle2} accent="bg-emerald-500" />
        <StatCard label="Rejected" value={kpis.rejected} icon={XCircle} />
        <StatCard label="Avg Cycle Time" value={kpis.avgCycleTime} icon={Clock} subtitle="Ideas → Ready 4 Demo" />
        <StatCard label="Approval Rate" value={kpis.approvalRate} icon={TrendingUp} accent="bg-primary" />
        <StatCard label="Blocked" value={kpis.blocked} icon={AlertTriangle} accent="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusPieChart ideas={ideas} />
        <RejectionChart ideas={ideas} />
      </div>
    </div>
  );
}
