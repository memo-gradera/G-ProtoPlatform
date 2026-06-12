import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowRight, History } from 'lucide-react';
import { ideaStatusHistoryService } from '@/services/ideaStatusHistoryService';
import { queryKeys } from '@/lib/queryKeys';
import { getStatusLabel } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';

const METADATA_LABELS = {
  prototype_url: 'Prototype URL',
  decision_notes: 'Decision notes',
  executive_decision: 'Executive decision',
  rejection_reason: 'Rejection reason',
  blocker_reason: 'Blocker reason',
  demo_notes: 'Demo notes',
};

function parseMetadata(metadata) {
  if (!metadata || typeof metadata !== 'string') return null;
  try {
    const parsed = JSON.parse(metadata);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function summarizeMetadata(metadata) {
  const data = parseMetadata(metadata);
  if (!data) return null;

  const parts = Object.entries(data)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([key, value]) => {
      const label = METADATA_LABELS[key] || key.replace(/_/g, ' ');
      const text = String(value).trim();
      const display = text.length > 72 ? `${text.slice(0, 72)}…` : text;
      return `${label}: ${display}`;
    });

  return parts.length > 0 ? parts.join(' · ') : null;
}

function formatChangedAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'MMM d, yyyy · h:mm a');
}

function sortNewestFirst(entries) {
  return [...entries].sort((a, b) => {
    const aTime = new Date(a.changed_at || 0).getTime();
    const bTime = new Date(b.changed_at || 0).getTime();
    return bTime - aTime;
  });
}

function HistoryRow({ entry, isLast }) {
  const metadataSummary = summarizeMetadata(entry.metadata);

  return (
    <div className="relative flex gap-3 pb-4">
      <div className="flex flex-col items-center pt-1">
        <span className="w-2 h-2 rounded-full bg-primary/70 ring-2 ring-primary/20 flex-shrink-0" />
        {!isLast && <span className="w-px flex-1 bg-border mt-1" />}
      </div>

      <div className="flex-1 min-w-0 pb-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-medium text-foreground">
            {getStatusLabel(entry.previous_status)}
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="font-medium text-foreground">
            {getStatusLabel(entry.new_status)}
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground mt-1">
          {entry.changed_by || 'Unknown'} · {formatChangedAt(entry.changed_at)}
        </p>

        {entry.reason?.trim() && (
          <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">
            {entry.reason.trim()}
          </p>
        )}

        {metadataSummary && (
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            {metadataSummary}
          </p>
        )}
      </div>
    </div>
  );
}

export default function IdeaStatusHistorySection({ ideaId, open }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: queryKeys.ideaStatusHistory.byIdea(ideaId),
    queryFn: () => ideaStatusHistoryService.listByIdea(ideaId),
    enabled: open && Boolean(ideaId),
  });

  const sortedHistory = useMemo(() => sortNewestFirst(history), [history]);

  return (
    <div className="md:col-span-2 space-y-3 pt-2 border-t border-border/40">
      <div className="flex items-center gap-2">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Status History
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <span className="w-3.5 h-3.5 border-2 border-border border-t-primary rounded-full animate-spin" />
          Loading history…
        </div>
      ) : sortedHistory.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No status changes recorded yet.
        </p>
      ) : (
        <div className={cn('rounded-lg border border-border/50 bg-muted/30 px-3 py-3')}>
          {sortedHistory.map((entry, index) => (
            <HistoryRow
              key={entry.id || `${entry.changed_at}-${index}`}
              entry={entry}
              isLast={index === sortedHistory.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
