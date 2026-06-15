import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import UserProfileMenu from './UserProfileMenu';
import DevModeBadge from '@/components/DevModeBadge';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          collapsed ? 'ml-[68px]' : 'ml-[240px]',
        )}
      >
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center justify-end px-4 py-3 sm:px-6 lg:px-8">
            <UserProfileMenu />
          </div>
        </header>
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
          <DevModeBadge />
          <RoleProtectedRoute>
            <Outlet />
          </RoleProtectedRoute>
        </div>
      </main>
    </div>
  );
}