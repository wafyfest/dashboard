'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  LogOut,
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { ImportantNoticeModal } from '@/components/common/ImportantNoticeModal';
import { TilePattern } from '@/components/fest/FestPattern';
import { Header } from '@/components/layout/Header';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: string | number;
  group?: string;
}

export interface DashboardLayoutProps {
  // Existing portal props
  portalTitle?: string;
  roleBadge?: string;
  navItems?: NavItem[];
  activeItemId?: string;
  onSelectNavItem?: (id: string) => void;
  // PROJECT.md Contract Aliases (100% backwards-compatible)
  roleTitle?: string;
  currentRole?: string;
  navigationTabs?: NavItem[];
  currentTab?: string;
  onTabChange?: (id: string) => void;
  children: React.ReactNode;
}

export function DashboardLayout({
  portalTitle,
  roleTitle,
  roleBadge,
  currentRole,
  navItems,
  navigationTabs,
  activeItemId,
  currentTab,
  onSelectNavItem,
  onTabChange,
  children,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { signOut, currentRole: contextRole } = useFest();

  // Canonical resolution of props ensuring 100% contract compliance
  const effectivePortalTitle = portalTitle || roleTitle || 'Fest Dashboard';
  const effectiveRoleBadge = roleBadge || (currentRole ? currentRole.replace('_', ' ') : undefined);
  const effectiveNavItems = navItems || navigationTabs || [];
  const effectiveActiveItemId = activeItemId || currentTab || (effectiveNavItems[0]?.id ?? '');

  const handleNavClick = (item: NavItem) => {
    if (onSelectNavItem) {
      onSelectNavItem(item.id);
    }
    if (onTabChange) {
      onTabChange(item.id);
    }
    if (item.href) {
      router.push(item.href);
    }
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    const isStudent = (currentRole || contextRole) === 'student';
    await signOut();
    router.push(isStudent ? '/student-login' : '/login');
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-page)] text-[var(--text-primary)] font-sans antialiased relative selection:bg-[var(--f-saffron)]/30 selection:text-[var(--text-primary)]">
      {/* Subtle atmospheric ambient glow for editorial depth */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-40 dark:opacity-25 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[130px]" />
        <div className="absolute top-[40%] -right-[15%] w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[160px]" />
      </div>

      {/* Realtime Important News & Targeted Emergency Bulletins Modal */}
      <ImportantNoticeModal />

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation backdrop"
        />
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col h-screen h-dvh sticky top-0 w-64 bg-[var(--bg-subtle)]/80 backdrop-blur-xl border-r border-[var(--border-subtle)] p-4 shrink-0 select-none font-heading z-20 overflow-hidden shadow-[var(--glass-highlight)]">
        {/* Faint Islamic Khatam star pattern watermark */}
        <TilePattern id="sidebar-desktop-khatam" className="opacity-[0.025] dark:opacity-[0.035] text-[var(--text-primary)]" />

        {/* Sidebar Header & Brand Signature */}
        <div className="flex items-center gap-3 px-2 py-3 mb-4 shrink-0 relative z-10 border-b border-[var(--border-subtle)]/60 pb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-[#090d1a] flex items-center justify-center font-heading font-extrabold text-sm shadow-md shadow-amber-500/20 border border-amber-300/40 shrink-0 select-none">
            14
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-heading font-extrabold text-sm text-[var(--text-primary)] tracking-tight">
                WAFY
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)] animate-pulse" />
              <span className="font-heading font-extrabold text-sm text-[var(--f-saffron-text)] tracking-tight">
                FEST
              </span>
            </div>
            <span className="text-[11px] font-medium text-[var(--text-muted)] truncate mt-1">
              {effectivePortalTitle}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto min-h-0 relative z-10 pr-1" aria-label="Portal Navigation">
          {(() => {
            let lastGroup: string | undefined = undefined;
            return effectiveNavItems.map(item => {
              const Icon = item.icon;
              const isActive = effectiveActiveItemId === item.id;
              const showGroupHeader = item.group && item.group !== lastGroup;
              if (item.group) lastGroup = item.group;

              return (
                <React.Fragment key={item.id}>
                  {showGroupHeader && (
                    <div className="pt-3 pb-1 px-3 text-[10px] font-heading font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {item.group}
                    </div>
                  )}
                  <button
                    onClick={() => handleNavClick(item)}
                    className={`w-full group font-nav relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none ${isActive
                      ? 'bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-md shadow-amber-500/25 border border-amber-400/40'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                      }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isActive ? 'text-[#090d1a]' : 'text-[var(--text-muted)] group-hover:text-[var(--f-saffron)]'
                        }`}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${isActive ? 'bg-[#090d1a]/20 text-[#090d1a]' : 'bg-amber-500/10 text-[var(--f-saffron-text)]'
                          }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-[#090d1a]/70 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </React.Fragment>
              );
            });
          })()}
        </nav>

        {/* Pinned Bottom Sign Out */}
        <div className="pt-3 mt-auto border-t border-[var(--border-subtle)] shrink-0 relative z-10">
          <button
            onClick={handleSignOut}
            className="w-full group font-nav flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 bg-transparent hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
          >
            <LogOut className="w-4 h-4 shrink-0 text-[var(--text-muted)] group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all duration-200" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-out Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[var(--bg-subtle)]/95 backdrop-blur-xl border-r border-[var(--border-subtle)] p-5 flex flex-col overflow-hidden transform transition-transform duration-300 ease-out md:hidden shadow-2xl ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <TilePattern id="sidebar-mobile-khatam" className="opacity-[0.03] text-[var(--text-primary)]" />

        {/* Mobile Drawer Header */}
        <div className="flex items-center justify-between px-1 py-2 mb-4 shrink-0 relative z-10 border-b border-[var(--border-subtle)]/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-[#090d1a] flex items-center justify-center font-heading font-extrabold text-xs shadow-md shadow-amber-500/20 border border-amber-300/40 shrink-0 select-none">
              14
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-heading font-extrabold text-sm text-[var(--text-primary)] tracking-tight">
                  WAFY
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)] animate-pulse" />
                <span className="font-heading font-extrabold text-sm text-[var(--f-saffron-text)] tracking-tight">
                  FEST
                </span>
              </div>
              <span className="text-[10px] font-medium text-[var(--text-muted)] mt-1 truncate">
                {effectivePortalTitle}
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto min-h-0 relative z-10" aria-label="Mobile Portal Navigation">
          {(() => {
            let lastGroup: string | undefined = undefined;
            return effectiveNavItems.map(item => {
              const Icon = item.icon;
              const isActive = effectiveActiveItemId === item.id;
              const showGroupHeader = item.group && item.group !== lastGroup;
              if (item.group) lastGroup = item.group;

              return (
                <React.Fragment key={item.id}>
                  {showGroupHeader && (
                    <div className="pt-3 pb-1 px-3 text-[10px] font-heading font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {item.group}
                    </div>
                  )}
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={`w-full group font-nav relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none ${isActive
                      ? 'bg-[var(--f-saffron)] text-[#090d1a] font-bold shadow-md shadow-amber-500/25 border border-amber-400/40'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                      }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isActive ? 'text-[#090d1a]' : 'text-[var(--text-muted)] group-hover:text-[var(--f-saffron)]'
                        }`}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${isActive ? 'bg-[#090d1a]/20 text-[#090d1a]' : 'bg-amber-500/10 text-[var(--f-saffron-text)]'
                          }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-[#090d1a]/70 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </React.Fragment>
              );
            });
          })()}
        </nav>

        {/* Pinned Mobile Sign Out */}
        <div className="pt-3 mt-auto border-t border-[var(--border-subtle)] shrink-0 relative z-10">
          <button
            onClick={handleSignOut}
            className="w-full group font-nav flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 bg-transparent hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
          >
            <LogOut className="w-4 h-4 shrink-0 text-[var(--text-muted)] group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all duration-200" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-clip relative z-10">
        {/* Top Header Bar */}
        <Header
          portalTitle={effectivePortalTitle}
          roleBadge={effectiveRoleBadge}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
