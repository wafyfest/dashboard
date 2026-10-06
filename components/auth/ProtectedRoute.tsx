'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFest } from '@/lib/context/FestContext';
import { UserRole } from '@/lib/types/fest';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoadingAuth, currentRole } = useFest();

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const isAllowed = allowedRoles.includes(currentRole) || currentRole === 'admin';
      if (!isAllowed) {
        const routeMap: Record<UserRole, string> = {
          college: '/college',
          admin: '/admin',
          student: '/student',
          stage_controller: '/stage-controller',
          result_entry: '/result-entry'
        };
        router.replace(routeMap[currentRole] || '/login');
      }
    }
  }, [isAuthenticated, isLoadingAuth, currentRole, allowedRoles, router]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[var(--border-medium)] border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-[var(--text-muted)]">Verifying authentication status...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentRole) && currentRole !== 'admin') {
    return null;
  }

  return <>{children}</>;
}
