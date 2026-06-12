import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ideasService } from '@/services/ideasService';
import { invalidateIdeas, queryKeys } from '@/lib/queryKeys';
import { showAccessDeniedToast, isRbacError } from '@/lib/accessDeniedToast';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/components/ui/use-toast';
import PageHeader from '@/components/shared/PageHeader';
import ReviewCard from '@/components/review/ReviewCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function showTransitionError(error) {
  toast({
    variant: 'destructive',
    title: 'Cannot update idea',
    description: error?.message || 'This transition is not allowed.',
  });
}

function handleMutationError(error) {
  if (isRbacError(error)) {
    showAccessDeniedToast(error);
    return;
  }
  showTransitionError(error);
}

export default function ExecutiveReview() {
  const queryClient = useQueryClient();
  const { canPerformAction } = usePermissions();

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: queryKeys.ideas.list(),
    queryFn: () => ideasService.list(),
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ id, decision, rejectionReason, idea }) => {
      if (decision === 'approved') {
        const decisionNotes = (idea.decision_notes || idea.demo_notes || '').trim();
        return ideasService.transitionStatus(id, 'approved', {
          patch: {
            executive_decision: 'approved',
            decision_notes: decisionNotes,
            demo_notes: idea.demo_notes?.trim() || decisionNotes,
          },
        });
      }
      if (decision === 'rejected') {
        return ideasService.transitionStatus(id, 'rejected', {
          patch: {
            executive_decision: 'rejected',
            rejection_reason: rejectionReason.trim(),
          },
        });
      }
      if (decision === 'needs_revision') {
        return ideasService.transitionStatus(id, 'in_progress', {
          patch: { executive_decision: 'needs_revision' },
        });
      }
      throw new Error(`Unsupported decision: ${decision}`);
    },
    onSuccess: () => invalidateIdeas(queryClient),
    onError: handleMutationError,
  });

  const handleDecision = (id, decision, rejectionReason) => {
    const idea = ideas.find((i) => i.id === id);
    if (!idea) return;

    if (decision === 'approved') {
      if (!canPerformAction('review.approve', { idea })) {
        showAccessDeniedToast();
        return;
      }
      const decisionNotes = (idea.decision_notes || idea.demo_notes || '').trim();
      if (!decisionNotes) {
        toast({
          variant: 'destructive',
          title: 'Cannot approve idea',
          description:
            'Executive decision notes are required before approving this idea.',
        });
        return;
      }
    }
    if (decision === 'rejected') {
      if (!canPerformAction('review.reject', { idea })) {
        showAccessDeniedToast();
        return;
      }
      if (!rejectionReason?.trim()) {
        toast({
          variant: 'destructive',
          title: 'Cannot reject idea',
          description: 'Please enter a rejection reason before moving this idea to Rejected.',
        });
        return;
      }
    }
    if (decision === 'needs_revision' && !canPerformAction('review.needs_revision', { idea })) {
      showAccessDeniedToast();
      return;
    }

    decisionMutation.mutate({ id, decision, rejectionReason, idea });
  };

  const readyForReview = ideas.filter(i => i.status === 'ready_4_demo');
  const reviewed = ideas.filter(i => ['approved', 'rejected'].includes(i.status) && i.executive_decision !== 'pending');

  const reviewPermissions = (idea) => ({
    canApprove: canPerformAction('review.approve', { idea }),
    canReject: canPerformAction('review.reject', { idea }),
    canNeedsRevision: canPerformAction('review.needs_revision', { idea }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Executive Review"
        description="Review and decide on demo-ready prototypes"
      />

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="gap-1.5">
            Pending Review
            {readyForReview.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                {readyForReview.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviewed">Previously Reviewed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {readyForReview.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">No ideas pending review</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl">
              {readyForReview.map(idea => (
                <ReviewCard
                  key={idea.id}
                  idea={idea}
                  onDecision={handleDecision}
                  loading={decisionMutation.isPending}
                  {...reviewPermissions(idea)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviewed">
          {reviewed.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">No reviewed ideas yet</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl">
              {reviewed.map(idea => (
                <ReviewCard
                  key={idea.id}
                  idea={idea}
                  onDecision={handleDecision}
                  loading={decisionMutation.isPending}
                  {...reviewPermissions(idea)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
