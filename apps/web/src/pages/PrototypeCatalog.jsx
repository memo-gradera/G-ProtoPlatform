import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ideasService } from '@/services/ideasService';
import { prototypesService } from '@/services/prototypesService';
import { invalidateIdeas, invalidatePrototypes, queryKeys } from '@/lib/queryKeys';
import { showAccessDeniedToast, isRbacError } from '@/lib/accessDeniedToast';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/components/ui/use-toast';
import PageHeader from '@/components/shared/PageHeader';
import PrototypeCard from '@/components/prototypes/PrototypeCard';
import PrototypeFormDialog from '@/components/prototypes/PrototypeFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPrototypeOwnerLabel } from '@/services/apiMappers';
import { Plus, Search } from 'lucide-react';

function handleSaveError(error) {
  if (isRbacError(error)) {
    showAccessDeniedToast(error);
    return;
  }
  toast({
    variant: 'destructive',
    title: 'Cannot save prototype',
    description: error?.message || 'Save failed.',
  });
}

export default function PrototypeCatalog() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();
  const { canPerformAction } = usePermissions();

  const canCreate = canPerformAction('prototype.create');
  const canEditPrototype = (prototype) =>
    canPerformAction('prototype.edit', { prototype });

  const { data: prototypes = [], isLoading } = useQuery({
    queryKey: queryKeys.prototypes.list(),
    queryFn: () => prototypesService.list(),
  });

  const { data: ideas = [] } = useQuery({
    queryKey: queryKeys.ideas.list(),
    queryFn: () => ideasService.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing
        ? prototypesService.update(editing.id, data)
        : prototypesService.create(data),
    onSuccess: () => {
      invalidatePrototypes(queryClient);
      setDialogOpen(false);
      setEditing(null);
    },
    onError: handleSaveError,
  });

  const filtered = prototypes.filter(p => {
    const matchesSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
      getPrototypeOwnerLabel(p).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCardClick = (proto) => {
    if (!canEditPrototype(proto)) {
      showAccessDeniedToast();
      return;
    }
    setEditing(proto);
    setDialogOpen(true);
  };

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
        title="Prototype Catalog"
        description="Browse and manage all prototypes"
        actions={
          canCreate ? (
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Add Prototype
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search prototypes..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_development">In Development</SelectItem>
            <SelectItem value="demo_ready">Demo Ready</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No prototypes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(p => (
            <PrototypeCard
              key={p.id}
              prototype={p}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      <PrototypeFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSave={(data) => saveMutation.mutate(data)}
        prototype={editing}
        loading={saveMutation.isPending}
        ideas={ideas}
      />
    </div>
  );
}
