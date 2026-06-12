import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { queryKeys } from '@/lib/queryKeys';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import StatusPieChart from '@/components/dashboard/StatusPieChart';
import RejectionChart from '@/components/dashboard/RejectionChart';
import {
  Lightbulb, Rocket, Monitor, CheckCircle2, XCircle,
  Clock, TrendingUp, AlertTriangle
} from 'lucide-react';

export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: queryKeys.ideas.kpis,
    queryFn: () => dashboardService.getKpis(),
  });

  const { data: ideas = [], isLoading: ideasLoading } = useQuery({
    queryKey: queryKeys.ideas.list(),
    queryFn: () => dashboardService.getIdeasByStatus(),
  });

  const isLoading = kpisLoading || ideasLoading;

  if (isLoading || !kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
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
