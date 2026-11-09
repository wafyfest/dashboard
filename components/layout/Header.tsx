'use client';

import React, { useState, useEffect } from 'react';
import {
  Menu,
  Sun,
  Moon,
  User,
  Bell,
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';

export interface HeaderProps {
  portalTitle?: string;
  roleBadge?: string;
  onOpenMobileMenu?: () => void;
  className?: string;
}

export function Header({
  portalTitle,
  roleBadge,
  onOpenMobileMenu,
  className = '',
}: HeaderProps) {
  const { festSettings, theme, toggleTheme, currentRole, currentCollegeAfflNo } = useFest();
  const [bulletinCount, setBulletinCount] = useState<number>(0);

  useEffect(() => {
    // Listen for live counts calculated by ImportantNoticeModal (which enforces role and session filtering)
    const handleCount = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      if (customEvent.detail && typeof customEvent.detail.count === 'number') {
        setBulletinCount(customEvent.detail.count);
      }
    };
    window.addEventListener('wsf_notices_count', handleCount);

    return () => {
      window.removeEventListener('wsf_notices_count', handleCount);
    };
  }, []);

  const handleOpenBulletins = () => {
    window.dispatchEvent(new CustomEvent('wsf_open_notices'));
  };

  return (
    <header
      className={`h-16 px-4 sm:px-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-30 transition-colors font-heading shadow-xs ${className}`}
    >
      {/* Left: Mobile Drawer Trigger & Fest Branding */}
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="md:hidden p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5 min-w-0">
          {/* Brand Signature with Illuminated Saffron Micro-Dot */}
          <div className="flex items-center tracking-tight leading-none shrink-0">
            <span className="font-heading font-extrabold text-sm sm:text-base text-[var(--text-primary)]">
              WAFY
            </span>
            <span
              className="inline-block w-2 h-2 rounded-full bg-[var(--f-saffron)] mx-1.5 shadow-[0_0_8px_var(--f-saffron)] animate-pulse"
              aria-hidden="true"
            />
            <span className="font-heading font-extrabold text-sm sm:text-base text-[var(--f-saffron-text)] hidden xs:inline">
              FEST
            </span>
          </div>

          <span className="text-[var(--border-medium)] hidden sm:inline select-none" aria-hidden="true">
            /
          </span>

          {/* Portal Title */}
          <span className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] truncate">
            {portalTitle || festSettings.fest_name}
          </span>

          {/* Saffron & Amber Role Pill */}
          {roleBadge && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold font-mono tracking-wide uppercase shadow-[0_0_10px_rgba(245,158,11,0.08)] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--f-saffron)] shadow-[0_0_6px_var(--f-saffron)] animate-pulse" />
              {roleBadge}
            </span>
          )}
        </div>
      </div>

      {/* Right: Notification Bell, Theme Switcher & User Identity */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Bulletins & Broadcast Notifications Trigger */}
        <button
          onClick={handleOpenBulletins}
          aria-label={`Festival Bulletins (${bulletinCount} active)`}
          title={`Festival Bulletins (${bulletinCount} active)`}
          className="group relative p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-amber-500/40 hover:bg-[var(--bg-hover)] transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none shadow-xs"
        >
          <span className="sr-only">Festival Bulletins</span>
          <div className="relative w-4 h-4 flex items-center justify-center">
            <Bell className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--f-saffron)] transition-colors" />
            {bulletinCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-mono font-bold text-white shadow-[0_0_6px_rgba(244,63,94,0.6)] animate-pulse leading-none">
                {bulletinCount}
              </span>
            )}
          </div>
        </button>

        {/* Rotational Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          className="group relative p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-amber-500/40 hover:bg-[var(--bg-hover)] transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none shadow-xs"
        >
          <span className="sr-only">Toggle theme</span>
          <div className="relative w-4 h-4 flex items-center justify-center transition-transform duration-500 ease-out group-hover:rotate-45 group-active:scale-90">
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-[var(--text-secondary)] transition-colors" />
            ) : (
              <Sun className="w-4 h-4 text-[var(--f-saffron)] drop-shadow-[0_0_6px_rgba(245,158,11,0.6)] transition-colors" />
            )}
          </div>
        </button>

        {/* User Identity Chip */}
        <div className="flex items-center gap-2.5 pl-2.5 sm:pl-3 border-l border-[var(--border-subtle)]">
          <div className="relative group cursor-pointer" title={`Active Role: ${currentRole}`}>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[var(--f-saffron)] flex items-center justify-center font-bold text-xs shadow-xs transition-transform duration-200 hover:scale-105 hover:border-amber-500/60">
              <User className="w-4 h-4 text-[var(--f-saffron)]" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface)] shadow-[0_0_4px_#10b981]" />
            </div>
          </div>

          {/* User metadata label on desktop screens */}
          <div className="hidden xl:flex flex-col text-left leading-tight">
            <span className="text-xs font-semibold text-[var(--text-primary)] font-heading">
              {currentRole ? currentRole.replace('_', ' ').toUpperCase() : 'USER'}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              {currentRole === 'college' && currentCollegeAfflNo ? `AFFL #${currentCollegeAfflNo}` : 'ONLINE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
