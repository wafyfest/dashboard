'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Announcement, NoticePriority } from '@/lib/types/fest';
import { createClient } from '@/lib/supabase/client';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  ExternalLink,
  BellRing,
  ChevronRight,
  Building2,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ImportantNoticeModal() {
  const { currentRole, currentCollegeAfflNo, refreshKey } = useFest();
  const [isMounted, setIsMounted] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // In-session temporary dismissal state:
  // Resets on every login, refresh, or fresh visit so the bulletin pops up every time
  // until explicitly deleted from the Admin Panel.
  const [sessionDismissedIds, setSessionDismissedIds] = useState<Set<string>>(new Set());

  // Active student identity for student portal
  const [activeStudentId, setActiveStudentId] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const studentChest = localStorage.getItem('student_chest_no') || '';
      setActiveStudentId(studentChest.trim().toUpperCase());

      // Clear any legacy persistent storage so notices always show on fresh sessions
      try {
        localStorage.removeItem('wsf_dismissed_notices');
      } catch (e) { }
    }
  }, [currentRole]);

  // Synchronize announcements callback
  const syncNotices = useCallback(async () => {
    const cached = festService.getAnnouncements();
    setAnnouncements(cached);

    try {
      const fresh = await festService.fetchAllAnnouncements();
      if (fresh) {
        setAnnouncements(fresh.filter(a => a.is_active));
      }
    } catch (e) { }
  }, []);

  // Multi-channel real-time listener (WebSocket + BroadcastChannel + DOM + storage event)
  useEffect(() => {
    syncNotices();

    // 1. Cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('wsf_announcements_sync');
        bc.onmessage = () => {
          syncNotices();
        };
      } catch (e) { }
    }

    // 2. Storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'wsf_announcements' || e.key === 'wsf_announcements_updated') {
        syncNotices();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. In-tab custom DOM event
    const handleCustomChange = () => {
      syncNotices();
    };
    window.addEventListener('wsf_announcements_change', handleCustomChange);

    // 4. Supabase Realtime WebSocket Channel
    let unsubRealtime: (() => void) | null = null;
    const supabase = createClient();
    if (supabase) {
      const channel = supabase
        .channel(`announcements_live_${Math.random().toString(36).substring(2, 7)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'announcements' },
          () => {
            syncNotices();
          }
        )
        .on(
          'broadcast',
          { event: 'announcement_change' },
          () => {
            syncNotices();
          }
        )
        .subscribe();

      unsubRealtime = () => {
        supabase.removeChannel(channel);
      };
    }

    // 5. Active Heartbeat (every 3s)
    const heartbeat = setInterval(() => {
      syncNotices();
    }, 3000);

    return () => {
      bc?.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('wsf_announcements_change', handleCustomChange);
      unsubRealtime?.();
      clearInterval(heartbeat);
    };
  }, [refreshKey, syncNotices]);

  // All eligible active notices matching this user session
  const allEligibleNotices = useMemo(() => {
    const now = Date.now();

    return announcements.filter(notice => {
      if (!notice.is_active) return false;
      if (notice.expires_at && new Date(notice.expires_at).getTime() < now) return false;

      // 1. GLOBAL: Broadcast to everyone across all portals
      if (notice.target_type === 'global') return true;

      // 2. ROLE-BASED: Broadcast to all logins of a specific role
      if (notice.target_type === 'role') {
        if (notice.target_role === 'all') return true;
        if (notice.target_role === currentRole) return true;
        if (currentRole === 'admin') return true;
        return false;
      }

      // 3. SPECIFIC COLLEGE: Targeted only to one specific college affl_no
      if (notice.target_type === 'college') {
        if (
          currentRole === 'college' &&
          notice.target_college_affl_no &&
          Number(currentCollegeAfflNo) === Number(notice.target_college_affl_no)
        ) {
          return true;
        }
        if (currentRole === 'admin') return true;
        return false;
      }

      // 4. SPECIFIC STUDENT: Targeted by Chest No or CIC No
      if (notice.target_type === 'student') {
        if (currentRole === 'student' && notice.target_chest_no) {
          const target = notice.target_chest_no.trim().toUpperCase();
          if (activeStudentId && (activeStudentId === target || activeStudentId.includes(target))) {
            return true;
          }
        }
        if (currentRole === 'admin') return true;
        return false;
      }

      // 5. SPECIFIC STAGE: Targeted to Stage Controller
      if (notice.target_type === 'stage') {
        if (currentRole === 'stage_controller' || currentRole === 'admin') return true;
        return false;
      }

      return false;
    });
  }, [announcements, currentRole, currentCollegeAfflNo, activeStudentId]);

  // Notices that haven't been dismissed in this active window session
  const unacknowledgedNotices = useMemo(() => {
    return allEligibleNotices.filter(notice => !sessionDismissedIds.has(notice.id));
  }, [allEligibleNotices, sessionDismissedIds]);

  // Current active notice in queue
  const activeNotice = unacknowledgedNotices[0] || null;

  // Temporarily dismiss for current session so user can operate
  const handleDismiss = (noticeId: string) => {
    setSessionDismissedIds(prev => {
      const next = new Set(prev);
      next.add(noticeId);
      return next;
    });
  };

  // Re-open all active notices
  const handleReopen = () => {
    setSessionDismissedIds(new Set());
  };

  // Prevent SSR hydration mismatch: render nothing during server pass
  if (!isMounted) return null;

  // If all matching notices have been temporarily acknowledged in this session,
  // display a floating reminder pill so user can easily re-read it anytime until deleted.
  if (!activeNotice) {
    if (allEligibleNotices.length > 0) {
      return (
        <div className="fixed bottom-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <button
            onClick={handleReopen}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-card text-xs font-medium backdrop-blur-md transition-all cursor-pointer"
            title="Click to view active festival announcement"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <BellRing className="w-3.5 h-3.5 text-rose-500" />
            <span>Active Bulletin ({allEligibleNotices.length})</span>
          </button>
        </div>
      );
    }
    return null;
  }

  // Refined Minimalist Priority Tokens
  const config = {
    urgent: {
      badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
      badgeLabel: 'CRITICAL BULLETIN',
      icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
      btnVariant: 'destructive' as const
    },
    warning: {
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
      badgeLabel: 'IMPORTANT NOTICE',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
      btnVariant: 'primary' as const
    },
    info: {
      badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20',
      badgeLabel: 'ANNOUNCEMENT',
      icon: <Info className="w-5 h-5 text-indigo-500 shrink-0" />,
      btnVariant: 'primary' as const
    },
    success: {
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
      badgeLabel: 'OFFICIAL UPDATE',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
      btnVariant: 'success' as const
    }
  }[activeNotice.priority] || {
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20',
    badgeLabel: 'ANNOUNCEMENT',
    icon: <Info className="w-5 h-5 text-slate-500 shrink-0" />,
    btnVariant: 'primary' as const
  };

  // Targeting Meta Badge Label
  const getTargetBadge = () => {
    if (activeNotice.target_type === 'college') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
          <Building2 className="w-3 h-3 text-[var(--text-muted)]" />
          College #{activeNotice.target_college_affl_no}
        </span>
      );
    }
    if (activeNotice.target_type === 'student') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
          <GraduationCap className="w-3 h-3 text-[var(--text-muted)]" />
          Scholar: {activeNotice.target_chest_no}
        </span>
      );
    }
    if (activeNotice.target_type === 'stage') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
          Stage #{activeNotice.target_stage_id || 'All'}
        </span>
      );
    }
    if (activeNotice.target_type === 'role') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] uppercase">
          {activeNotice.target_role}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
        <Sparkles className="w-3 h-3 text-emerald-500" />
        All Logins
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-xl shadow-elevated border border-[var(--border-subtle)] overflow-hidden z-10 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-1 rounded-md bg-[var(--bg-subtle)]">
              {config.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${config.badgeClass}`}>
                  {config.badgeLabel}
                </span>
                {getTargetBadge()}
                {unacknowledgedNotices.length > 1 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-subtle)]">
                    {unacknowledgedNotices.length} active
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] leading-snug">
                {activeNotice.title}
              </h3>
            </div>
          </div>

          {!activeNotice.require_ack && (
            <button
              onClick={() => handleDismiss(activeNotice.id)}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors cursor-pointer shrink-0"
              title="Close for this session"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Message Body */}
        <div className="p-5 sm:p-6 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line max-h-72 overflow-y-auto">
          {activeNotice.message}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[var(--bg-subtle)]/50 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <BellRing className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Official Arts Fest Bulletin</span>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            {activeNotice.action_url && (
              <a
                href={activeNotice.action_url}
                onClick={() => handleDismiss(activeNotice.id)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)] hover:underline px-2 py-1"
              >
                {activeNotice.action_label || 'View Details'}
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
              </a>
            )}

            <Button
              size="sm"
              variant={config.btnVariant}
              onClick={() => handleDismiss(activeNotice.id)}
              className="text-xs h-8 px-4"
            >
              {unacknowledgedNotices.length > 1 ? (
                <>
                  Next ({unacknowledgedNotices.length - 1} more)
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </>
              ) : (
                'close'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
