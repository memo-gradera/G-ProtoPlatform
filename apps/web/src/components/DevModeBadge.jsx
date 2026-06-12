import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/AuthContext';
import { resetDevData, isDevDataBypassEnabled } from '@/lib/devDataStore';
import {
  DEV_ROLES,
  isDevAuthBypassEnabled,
  setDevRole,
} from '@/lib/devUser';
import {
  invalidateIdeas,
  invalidatePrototypes,
  queryKeys,
} from '@/lib/queryKeys';

const roleLabels = {
  admin: 'Admin',
  innovation_lead: 'Innovation Lead',
  developer: 'Developer',
  executive_reviewer: 'Executive Reviewer',
  viewer: 'Viewer',
};

export default function DevModeBadge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const devAuth = isDevAuthBypassEnabled();
  const devData = isDevDataBypassEnabled();

  if (!devAuth && !devData) {
    return null;
  }

  const currentRole = user?.role || 'admin';

  const handleResetDemoData = async () => {
    resetDevData();
    await Promise.all([
      invalidateIdeas(queryClient),
      invalidatePrototypes(queryClient),
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
    ]);
    window.location.reload();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
      <Badge
        variant="outline"
        className="border-amber-300 bg-amber-100 text-amber-900 text-[10px] font-semibold uppercase tracking-wide"
      >
        DEV MODE
      </Badge>
      {devAuth && (
        <>
          <span className="text-xs font-medium">Role:</span>
          <Select value={currentRole} onValueChange={setDevRole}>
            <SelectTrigger className="h-7 w-44 text-xs bg-white border-amber-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEV_ROLES.map((role) => (
                <SelectItem key={role} value={role} className="text-xs">
                  {roleLabels[role] || role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
      {devData && (
        <>
          <span className="text-xs text-amber-800">Local data</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs border-amber-300 bg-white hover:bg-amber-100"
            onClick={handleResetDemoData}
          >
            Reset Demo Data
          </Button>
        </>
      )}
    </div>
  );
}
