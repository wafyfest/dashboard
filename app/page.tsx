'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFest } from '@/lib/context/FestContext';

export default function RootPage() {
  const router = useRouter();
  const { currentRole } = useFest();

  useEffect(() => {
    // Route to the active role's dedicated page
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
        router.replace('/college');
        break;
    }
  }, [currentRole, router]);

  return (
    <div className="min-h-screen bg-[#EEF2F6] flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 border-4 border-[#132238] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Redirecting to designated portal...</p>
      </div>
    </div>
  );
}