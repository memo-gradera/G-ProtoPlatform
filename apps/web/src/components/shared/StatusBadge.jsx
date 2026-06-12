import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles = {
  ideas: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  ready_4_demo: 'bg-violet-50 text-violet-700 border-violet-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-slate-100 text-slate-600 border-slate-200',
  draft: 'bg-slate-50 text-slate-600 border-slate-200',
  in_development: 'bg-amber-50 text-amber-700 border-amber-200',
  demo_ready: 'bg-violet-50 text-violet-700 border-violet-200',
  archived: 'bg-slate-100 text-slate-500 border-slate-200',
};

const statusLabels = {
  ideas: 'Idea',
  in_progress: 'In Progress',
  ready_4_demo: 'Ready 4 Demo',
  ready_for_demo: 'Ready 4 Demo',
  blocked: 'Blocked',
  approved: 'Approved',
  rejected: 'Rejected',
  draft: 'Draft',
  in_development: 'In Development',
  demo_ready: 'Demo Ready',
  archived: 'Archived',
};

export function getStatusLabel(status) {
  return statusLabels[status] || status?.replace(/_/g, ' ') || '—';
}

const priorityStyles = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium border', statusStyles[status] || statusStyles.draft)}>
      {getStatusLabel(status)}
    </Badge>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium border', priorityStyles[priority] || priorityStyles.medium)}>
      {priority?.charAt(0).toUpperCase() + priority?.slice(1)}
    </Badge>
  );
}