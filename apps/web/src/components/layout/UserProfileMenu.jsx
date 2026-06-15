import React from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { getRoleLabel, roleBadgeColors } from '@/lib/roleDisplay';
import { getUserDisplayName, getUserInitials } from '@/lib/userDisplay';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function UserProfileMenu({ className }) {
  const { logout } = useAuth();
  const { user, role } = usePermissions();

  if (!user) {
    return null;
  }

  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const email = user.email || '—';
  const roleLabel = getRoleLabel(role);
  const roleBadgeClass = roleBadgeColors[role] || roleBadgeColors.viewer;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-auto gap-2 rounded-full border-border/70 bg-card px-2 py-1.5 shadow-sm',
            'hover:bg-muted/60 hover:border-[hsl(172_60%_45%/0.35)]',
            'text-foreground focus-visible:ring-[hsl(172_60%_45%/0.45)]',
            className,
          )}
          aria-label="Open user profile menu"
        >
          <Avatar className="h-8 w-8 border border-border/60">
            <AvatarFallback className="bg-[hsl(230_25%_16%)] text-xs font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 flex-col items-start text-left sm:flex">
            <span className="max-w-[10rem] truncate text-sm font-medium text-foreground lg:max-w-[14rem]">
              {displayName}
            </span>
            <span className="max-w-[10rem] truncate text-xs text-muted-foreground lg:max-w-[14rem]">
              {email}
            </span>
          </span>
          <Badge
            variant="outline"
            className={cn(
              'hidden text-[10px] font-medium md:inline-flex',
              roleBadgeClass,
            )}
          >
            {roleLabel}
          </Badge>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-2 font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-border/60">
              <AvatarFallback className="bg-[hsl(230_25%_16%)] text-xs font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-[11px] font-medium', roleBadgeClass)}>
            {roleLabel}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onSelect={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
