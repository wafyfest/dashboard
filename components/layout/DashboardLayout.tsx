'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  LogOut,
  Sun,
  User,
  Sparkles,
  ChevronRight,
  ShieldCheck
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
  const { festSettings } = useFest();

  const handleNavClick = (item: NavItem) => {
    if (onSelectNavItem) {
      onSelectNavItem(item.id);
    }
    if (item.href) {
      router.push(item.href);
    }
    setMobileMenuOpen(false);
  };

  const handleSignOut = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#0D1117] text-[#E6EDF5] font-sans antialiased">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#121720] border-r border-[#26303F] p-5 shrink-0 select-none">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-8 h-8 rounded-xl bg-[#1A2E4A] text-white flex items-center justify-center font-black text-sm border border-[#2E476B]/50 shadow-sm">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-extrabold text-base text-white tracking-tight">
            {portalTitle}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeItemId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#1E2C40] text-white shadow-sm font-bold border border-[#2E476B]/50'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#1A2333]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom: Sign Out */}
        <div className="pt-4 border-t border-[#26303F] mt-auto">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-out Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#121720] border-r border-[#26303F] p-5 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-2 py-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1A2E4A] text-white flex items-center justify-center font-black text-sm border border-[#2E476B]/50">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-extrabold text-base text-white">{portalTitle}</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-[#1A2333]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeItemId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#1E2C40] text-white font-bold shadow-sm border border-[#2E476B]/50'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#1A2333]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-[#26303F] mt-auto">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-4 sm:px-8 border-b border-[#26303F] bg-[#121720]/95 backdrop-blur-sm flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-[#1A2333] md:hidden transition-colors"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {festSettings.fest_name}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {roleBadge && (
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#1A2638] text-slate-200 border border-[#26303F]">
                {roleBadge}
              </span>
            )}

            {/* Dark Mode Icon Indicator */}
            <button
              className="w-8 h-8 rounded-lg border border-[#26303F] bg-[#161C24] text-slate-400 hover:text-slate-200 hover:bg-[#1C2535] flex items-center justify-center transition-colors shadow-2xs"
              title="Theme Toggle"
            >
              <Sun className="w-4 h-4" />
            </button>

            {/* Profile Avatar Icon */}
            <Link
              href="/login"
              className="w-8 h-8 rounded-lg border border-[#26303F] bg-[#1A2638] text-slate-300 hover:bg-[#23334A] flex items-center justify-center transition-colors shadow-2xs"
              title="Switch Role or Account"
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
