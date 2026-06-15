import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Search } from 'lucide-react';
import { usersService } from '@/services/usersService';
import { queryKeys } from '@/lib/queryKeys';
import { showAccessDeniedToast, isRbacError } from '@/lib/accessDeniedToast';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getRoleLabel,
  getStatusLabel,
  roleBadgeColors,
  statusBadgeColors,
  USER_ROLES,
} from '@/lib/roleDisplay';
import CreateUserDialog from '@/components/admin/CreateUserDialog';

function handleMutationError(error, title) {
  if (isRbacError(error)) {
    showAccessDeniedToast(error);
    return;
  }

  toast({
    variant: 'destructive',
    title,
    description: error?.message || 'This action failed.',
  });
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return format(new Date(value), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

export default function UserManagementPanel() {
  const queryClient = useQueryClient();
  const { user: currentUser, canPerformAction } = usePermissions();
  const canManageUsers = canPerformAction('admin.manage_users');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filters = useMemo(() => {
    const next = {};
    if (search.trim()) next.search = search.trim();
    if (roleFilter !== 'all') next.role = roleFilter;
    return next;
  }, [search, roleFilter]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: [...queryKeys.users.list, filters],
    queryFn: () => usersService.list(filters),
    enabled: canManageUsers,
  });

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

  const createUserMutation = useMutation({
    mutationFn: (payload) => usersService.createUser(payload),
    onSuccess: () => {
      invalidateUsers();
      setCreateDialogOpen(false);
      toast({
        title: 'User created',
        description: 'The user has been added and can sign in once provisioned.',
      });
    },
    onError: (error) => handleMutationError(error, 'Cannot create user'),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }) => usersService.updateUser(id, payload),
    onSuccess: () => {
      invalidateUsers();
      toast({
        title: 'User updated',
        description: 'User details were saved.',
      });
    },
    onError: (error) => handleMutationError(error, 'Cannot update user'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => usersService.updateUserStatus(id, status),
    onSuccess: (_, variables) => {
      invalidateUsers();
      toast({
        title: variables.status === 'active' ? 'User reactivated' : 'User deactivated',
        description: 'User status was updated.',
      });
    },
    onError: (error) => handleMutationError(error, 'Cannot update user status'),
  });

  const isMutating =
    createUserMutation.isPending ||
    updateUserMutation.isPending ||
    updateStatusMutation.isPending;

  if (!canManageUsers) {
    return (
      <Card className="border border-border/60">
        <CardContent className="p-6 text-sm text-muted-foreground">
          You do not have permission to manage users.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card className="border border-border/60 overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base font-heading">Users</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or email"
                  className="pl-9 h-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-44 h-9">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="h-9" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create user
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No users match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    const isActive = user.status === 'active';

                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role || 'viewer'}
                            disabled={isMutating || isSelf}
                            onValueChange={(role) =>
                              updateUserMutation.mutate({ id: user.id, payload: { role } })
                            }
                          >
                            <SelectTrigger className="w-44 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {USER_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {getRoleLabel(role)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-medium border ${
                              statusBadgeColors[user.status] || statusBadgeColors.pending
                            }`}
                          >
                            {getStatusLabel(user.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(user.last_login_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={isMutating || isSelf}
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: user.id,
                                status: isActive ? 'inactive' : 'active',
                              })
                            }
                          >
                            {isActive ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(payload) => createUserMutation.mutate(payload)}
        isSubmitting={createUserMutation.isPending}
      />
    </>
  );
}
