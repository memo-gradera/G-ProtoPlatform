import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ideasService } from '@/services/ideasService';
import { usersService } from '@/services/usersService';
import { queryKeys } from '@/lib/queryKeys';
import { showAccessDeniedToast } from '@/lib/accessDeniedToast';
import { usePermissions } from '@/hooks/usePermissions';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Users, Shield, BarChart3 } from 'lucide-react';

const roleLabels = {
  admin: 'Admin',
  innovation_lead: 'Innovation Lead',
  developer: 'Developer',
  executive_reviewer: 'Executive Reviewer',
  viewer: 'Viewer',
};

const roleBadgeColors = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  innovation_lead: 'bg-violet-50 text-violet-700 border-violet-200',
  developer: 'bg-blue-50 text-blue-700 border-blue-200',
  executive_reviewer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  viewer: 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { canPerformAction } = usePermissions();
  const canManageUsers = canPerformAction('admin.manage_users');

  const { data: users = [], isLoading } = useQuery({
    queryKey: queryKeys.users.list,
    queryFn: () => usersService.list(),
  });

  const { data: ideas = [] } = useQuery({
    queryKey: queryKeys.ideas.list(),
    queryFn: () => ideasService.list(),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => usersService.updateRole(id, role),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
    onError: showAccessDeniedToast,
  });

  const ideaCount = ideas.length;
  const userCount = users.length;
  const activeStatuses = ['in_progress', 'ready_4_demo'];
  const activeIdeas = ideas.filter(i => activeStatuses.includes(i.status)).length;

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
        title="Admin Settings"
        description="Manage users, roles, and system configuration"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 border border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-heading">{userCount}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold font-heading">{ideaCount}</p>
              <p className="text-xs text-muted-foreground">Total Ideas</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold font-heading">{activeIdeas}</p>
              <p className="text-xs text-muted-foreground">Active Ideas</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border border-border/60 overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/30">
          <CardTitle className="text-base font-heading">User Management</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Change Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] font-medium border ${roleBadgeColors[user.role] || roleBadgeColors.viewer}`}>
                        {roleLabels[user.role] || user.role || 'Viewer'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManageUsers ? (
                        <Select
                          value={user.role || 'viewer'}
                          onValueChange={role => updateRoleMutation.mutate({ id: user.id, role })}
                        >
                          <SelectTrigger className="w-44 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="innovation_lead">Innovation Lead</SelectItem>
                            <SelectItem value="developer">Developer</SelectItem>
                            <SelectItem value="executive_reviewer">Executive Reviewer</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
