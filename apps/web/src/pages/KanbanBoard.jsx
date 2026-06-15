import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { validateTransition } from '@/domain/ideaWorkflow';
import {
  canAuthorizeTransition,
  hasAnyDraggableTarget,
  KANBAN_COLUMNS,
} from '@/domain/kanbanTransitionAuth';
import { ideasService } from '@/services/ideasService';
import { invalidateIdeas, queryKeys } from '@/lib/queryKeys';
import { showAccessDeniedToast, isRbacError, showDeleteErrorToast } from '@/lib/accessDeniedToast';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/components/ui/use-toast';
import { DragDropContext } from '@hello-pangea/dnd';
import KanbanColumn from '@/components/kanban/KanbanColumn';
import CreateIdeaModal from '@/components/shared/CreateIdeaModal';
import IdeaDetailDrawer from '@/components/shared/IdeaDetailDrawer';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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

export default function KanbanBoard() {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailIdea, setDetailIdea] = useState(null);
  const queryClient = useQueryClient();
  const { canPerformAction, hasPermission, user } = usePermissions();

  const canCreate = canPerformAction('idea.create');
  const canEditIdea = (idea) => canPerformAction('idea.edit', { idea });
  const canDeleteIdea = (idea) => canPerformAction('idea.delete', { idea });
  const canDragIdea = (idea) =>
    hasAnyDraggableTarget(idea, canPerformAction, hasPermission, user);

  const ideasListKey = queryKeys.ideas.list();

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ideasListKey,
    queryFn: () => ideasService.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => ideasService.create(data),
    onSuccess: () => {
      invalidateIdeas(queryClient);
      setCreateOpen(false);
    },
    onError: showAccessDeniedToast,
  });

  const saveMutation = useMutation({
    mutationFn: (formData) => {
      if (formData.status !== detailIdea.status) {
        const validation = validateTransition(detailIdea.status, formData.status, formData);
        if (!validation.valid) {
          return Promise.reject(new Error(validation.message));
        }
      }
      return ideasService.save(detailIdea.id, formData, detailIdea);
    },
    onSuccess: () => {
      invalidateIdeas(queryClient);
      setDetailIdea(null);
    },
    onError: handleMutationError,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }) => ideasService.transitionStatus(id, status),
    onSuccess: () => invalidateIdeas(queryClient),
    onError: handleMutationError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => ideasService.remove(id),
    onSuccess: () => {
      invalidateIdeas(queryClient);
      setDetailIdea(null);
      toast({
        title: 'Idea deleted',
        description: 'The idea was permanently removed.',
      });
    },
    onError: (error) => showDeleteErrorToast(error, 'idea'),
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const idea = ideas.find(i => i.id === draggableId);
    if (!idea || idea.status === newStatus) return;

    // Drop validates the actual target column (RBAC + workflow fields). Service layer
    // re-validates on mutate; cache updates only in moveMutation.onSuccess.
    if (!canAuthorizeTransition(idea, newStatus, canPerformAction, user)) {
      showAccessDeniedToast();
      return;
    }

    const validation = validateTransition(idea.status, newStatus, idea);
    if (!validation.valid) {
      showTransitionError({ message: validation.message });
      return;
    }

    moveMutation.mutate({ id: draggableId, status: newStatus });
  };

  const handleCardClick = (idea) => {
    setDetailIdea(idea);
  };

  const columnData = {};
  KANBAN_COLUMNS.forEach(col => {
    columnData[col] = ideas.filter(i => i.status === col);
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
        title="Kanban Board"
        description="Drag ideas through the innovation pipeline"
        actions={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> New Idea
            </Button>
          ) : null
        }
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
          {KANBAN_COLUMNS.map(col => (
            <KanbanColumn
              key={col}
              columnId={col}
              ideas={columnData[col]}
              onCardClick={handleCardClick}
              isDragDisabled={(idea) => !canDragIdea(idea)}
            />
          ))}
        </div>
      </DragDropContext>

      <CreateIdeaModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
      />

      <IdeaDetailDrawer
        open={Boolean(detailIdea)}
        onClose={() => setDetailIdea(null)}
        onSave={(data) => saveMutation.mutate(data)}
        onDelete={(id) => deleteMutation.mutate(id)}
        idea={detailIdea}
        loading={saveMutation.isPending}
        deleting={deleteMutation.isPending}
        readOnly={detailIdea ? !canEditIdea(detailIdea) : true}
        canChangeStatus={detailIdea ? canDragIdea(detailIdea) : false}
        canDelete={detailIdea ? canDeleteIdea(detailIdea) : false}
      />
    </div>
  );
}
