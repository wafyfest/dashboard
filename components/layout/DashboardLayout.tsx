'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  User,
  Sparkles
} from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}

interface DashboardLayoutProps {
  portalTitle?: string;
  roleBadge?: string;
  navItems: NavItem[];
  activeItemId: string;
  onSelectNavItem?: (id: string) => void;
  children: React.ReactNode;
}

export function DashboardLayout({
  portalTitle = 'Fest Dashboard',
  roleBadge,
  navItems,
  activeItemId,
  onSelectNavItem,
  children
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { festSettings, theme, toggleTheme, signOut } = useFest();

  const handleNavClick = (item: NavItem) => {
    if (onSelectNavItem) {
      onSelectNavItem(item.id);
    }
    if (item.href) {
      router.push(item.href);
    }
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-page)] text-[var(--text-primary)] font-sans antialiased">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[var(--bg-subtle)] border-r border-[var(--border-subtle)] p-5 shrink-0 select-none">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-sm shadow-xs border border-slate-700/30">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-bold text-sm text-[var(--text-primary)] tracking-tight">
            {portalTitle}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeItemId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--brand-navy)] text-white shadow-xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom: Sign Out */}
        <div className="pt-4 border-t border-[var(--border-subtle)] mt-auto">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-out Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[var(--bg-subtle)] border-r border-[var(--border-subtle)] p-5 flex flex-col transform transition-transform duration-200 ease-in-out md:hidden shadow-xl ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-2 py-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-sm shadow-xs border border-slate-700/30">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-bold text-sm text-[var(--text-primary)]">{portalTitle}</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeItemId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--brand-navy)] text-white shadow-xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-[var(--border-subtle)] mt-auto">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-4 sm:px-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-xs flex items-center justify-between gap-4 sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] md:hidden transition-colors cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight truncate" suppressHydrationWarning>
              {festSettings.fest_name}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {roleBadge && (
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                {roleBadge}
              </span>
            )}

            {/* Accessible Dual Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Profile Avatar Link */}
            <Link
              href="/login"
              className="w-8 h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors shadow-2xs"
              title="Switch Role or Account"
              aria-label="Switch Role or Account"
            >
              <User className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
