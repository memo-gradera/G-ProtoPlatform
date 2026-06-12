import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PriorityBadge } from '@/components/shared/StatusBadge';
import { getIdeaOwnerLabel } from '@/services/apiMappers';
import { CheckCircle2, XCircle, RotateCcw, ExternalLink, User, ChevronDown, ChevronUp } from 'lucide-react';

export default function ReviewCard({
  idea,
  onDecision,
  loading,
  canApprove = false,
  canReject = false,
  canNeedsRevision = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleReject = () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    onDecision(idea.id, 'rejected', rejectionReason.trim());
    setShowRejectInput(false);
    setRejectionReason('');
  };

  const showActions = canApprove || canReject || canNeedsRevision;

  return (
    <Card className="border border-border/60 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{idea.solution_name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{idea.short_description}</p>
          </div>
          <PriorityBadge priority={idea.priority} />
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            {getIdeaOwnerLabel(idea)}
          </div>
          {idea.prototype_url && (
            <a href={idea.prototype_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline">
              <ExternalLink className="w-3 h-3" /> View Prototype
            </a>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:underline mb-3"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Less details' : 'More details'}
        </button>

        {expanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4 p-3 bg-muted/50 rounded-lg">
            {idea.why_it_matters && (
              <div><span className="text-xs font-medium text-muted-foreground">Why It Matters</span><p className="mt-0.5">{idea.why_it_matters}</p></div>
            )}
            {idea.target_user && (
              <div><span className="text-xs font-medium text-muted-foreground">Target User</span><p className="mt-0.5">{idea.target_user}</p></div>
            )}
            {idea.minimum_viability && (
              <div className="md:col-span-2"><span className="text-xs font-medium text-muted-foreground">Minimum Viability</span><p className="mt-0.5">{idea.minimum_viability}</p></div>
            )}
            {idea.acceptance_criteria && (
              <div className="md:col-span-2"><span className="text-xs font-medium text-muted-foreground">Acceptance Criteria</span><p className="mt-0.5">{idea.acceptance_criteria}</p></div>
            )}
            {idea.demo_notes && (
              <div className="md:col-span-2"><span className="text-xs font-medium text-muted-foreground">Demo Notes</span><p className="mt-0.5">{idea.demo_notes}</p></div>
            )}
          </div>
        )}

        {showRejectInput && canReject && (
          <div className="mb-3">
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={2}
              className="text-sm"
            />
          </div>
        )}

        {showActions && (
          <div className="flex items-center gap-2">
            {canApprove && (
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onDecision(idea.id, 'approved')}
                disabled={loading}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </Button>
            )}
            {canReject && (
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5"
                onClick={handleReject}
                disabled={loading}
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </Button>
            )}
            {canNeedsRevision && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => onDecision(idea.id, 'needs_revision')}
                disabled={loading}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Needs Revision
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
