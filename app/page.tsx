'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFest } from '@/lib/context/FestContext';

export default function RootPage() {
  const router = useRouter();
  const { currentRole, isAuthenticated, isLoadingAuth } = useFest();

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    switch (currentRole) {
      case 'college':
        router.replace('/college');
        break;
      case 'admin':
        router.replace('/admin');
        break;
      case 'student':
        router.replace('/student');
        break;
      case 'stage_controller':
        router.replace('/stage-controller');
        break;
      case 'result_entry':
        router.replace('/result-entry');
        break;
      default:
        router.replace('/login');
        break;
    }
  }, [currentRole, isAuthenticated, isLoadingAuth, router]);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-3 border-[var(--border-medium)] border-t-emerald-500 rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium text-[var(--text-muted)]">Redirecting to designated portal...</p>
      </div>
    </div>
  );
}