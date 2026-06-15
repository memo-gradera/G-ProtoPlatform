import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ideasService } from '@/services/ideasService';
import { usersService } from '@/services/usersService';
import { queryKeys } from '@/lib/queryKeys';
import PageHeader from '@/components/shared/PageHeader';
import UserManagementPanel from '@/components/admin/UserManagementPanel';
import { Card } from '@/components/ui/card';
import { Users, Shield, BarChart3 } from 'lucide-react';

export default function AdminSettings() {
  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.list,
    queryFn: () => usersService.list(),
  });

  const { data: ideas = [] } = useQuery({
    queryKey: queryKeys.ideas.list(),
    queryFn: () => ideasService.list(),
  });

  const ideaCount = ideas.length;
  const userCount = users.length;
  const activeStatuses = ['in_progress', 'ready_4_demo'];
  const activeIdeas = ideas.filter((idea) => activeStatuses.includes(idea.status)).length;

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

      <UserManagementPanel />
    </div>
  );
}
