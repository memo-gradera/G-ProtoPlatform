import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ideasService } from '@/services/ideasService';
import { invalidateIdeas, queryKeys } from '@/lib/queryKeys';
import { showAccessDeniedToast, isRbacError } from '@/lib/accessDeniedToast';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/components/ui/use-toast';
import PageHeader from '@/components/shared/PageHeader';
import { PriorityBadge } from '@/components/shared/StatusBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Search, RotateCcw, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';
import { getIdeaOwnerLabel } from '@/services/apiMappers';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

function handleMutationError(error) {
  if (isRbacError(error)) {
    showAccessDeniedToast(error);
    return;
  }
  toast({
    variant: 'destructive',
    title: 'Cannot update idea',
    description: error?.message || 'This action failed.',
  });
}

export default function RejectedArchive() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { canPerformAction } = usePermissions();

  const canReopen = (idea) => canPerformAction('idea.reopen_rejected', { idea });
  const canDelete = canPerformAction('idea.delete', { idea: {} });

  const rejectedListKey = queryKeys.ideas.list({ sort: '-updated_date' });

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: rejectedListKey,
    queryFn: () => ideasService.list({ sort: '-updated_date' }),
  });

  const reopenMutation = useMutation({
    mutationFn: (id) =>
      ideasService.transitionStatus(id, 'ideas', {
        patch: { executive_decision: 'pending', rejection_reason: '' },
      }),
    onSuccess: () => invalidateIdeas(queryClient),
    onError: handleMutationError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => ideasService.remove(id),
    onSuccess: () => invalidateIdeas(queryClient),
    onError: showAccessDeniedToast,
  });

  const rejected = ideas.filter(i => i.status === 'rejected');
  const filtered = rejected.filter(i =>
    !search || i.solution_name?.toLowerCase().includes(search.toLowerCase()) ||
    getIdeaOwnerLabel(i).toLowerCase().includes(search.toLowerCase())
  );

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
        title="Rejected Archive"
        description={`${rejected.length} rejected ideas`}
      />

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search rejected ideas..."
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No rejected ideas found</p>
        </div>
      ) : (
        <Card className="border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Solution</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Rejection Reason</TableHead>
                  <TableHead>Rejected On</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(idea => (
                  <TableRow key={idea.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{idea.solution_name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{idea.short_description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {getIdeaOwnerLabel(idea)}
                      </div>
                    </TableCell>
                    <TableCell><PriorityBadge priority={idea.priority} /></TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                        {idea.rejection_reason || '—'}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {idea.updated_date ? format(new Date(idea.updated_date), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canReopen(idea) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Re-open as Idea"
                            onClick={() => reopenMutation.mutate(idea.id)}
                            disabled={reopenMutation.isPending}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this idea?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove "{idea.solution_name}" from the archive.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(idea.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
