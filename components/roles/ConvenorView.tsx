'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { College } from '@/lib/types/fest';
import {
  Building2,
  Search,
  X,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Users,
  UserCheck,
  GraduationCap,
  Copy,
  Check,
  PhoneCall,
  Megaphone,
  Radio
} from 'lucide-react';
import { LiveStageProgressWidget } from './LiveStageProgressWidget';
import { ConvenorBroadcastModal } from './ConvenorBroadcastModal';

export type ConvenorTab = 'all' | 'coordinator' | 'manager' | 'asst_manager' | 'stage_monitor';
type SortType = 'affl_asc' | 'affl_desc' | 'name_asc' | 'name_desc';

interface ConvenorViewProps {
  activeTab?: ConvenorTab;
  onTabChange?: (tab: ConvenorTab) => void;
}

// Helper: Sanitize phone number for tel: links
export function getTelLink(phone?: string | null): string {
  if (!phone) return '#';
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `tel:${cleaned}`;
}

// Helper: Sanitize whatsapp number for https://wa.me/ links
export function getWhatsAppLink(phone?: string | null): string {
  if (!phone) return '#';
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`; // Default to India country code
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  }
  return `https://wa.me/${digits}`;
}

// Component for clickable phone / whatsapp number that copies to clipboard
function ClickableNumber({
  number,
  copyKey,
  type = 'phone',
  copiedKey,
  onCopy
}: {
  number?: string | null;
  copyKey: string;
  type?: 'phone' | 'whatsapp';
  copiedKey: string | null;
  onCopy: (text: string, key: string, e: React.MouseEvent) => void;
}) {
  if (!number) {
    return <span className="text-[var(--text-muted)] font-mono text-[11px]">—</span>;
  }

  const isCopied = copiedKey === copyKey;

  return (
    <button
      type="button"
      onClick={e => onCopy(number, copyKey, e)}
      title="Click number to copy to clipboard"
      className={`group font-mono font-bold text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-pointer ${
        isCopied
          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-2xs'
          : type === 'phone'
          ? 'text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 hover:text-sky-500 border border-transparent hover:border-sky-500/20'
          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-500 border border-transparent hover:border-emerald-500/20'
      }`}
    >
      <span>{number}</span>
      {isCopied ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-sans font-semibold text-emerald-600 dark:text-emerald-400">
          <Check className="w-3 h-3 text-emerald-500" /> Copied!
        </span>
      ) : ("")
      //   <Copy className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
      // )
      }
    </button>
  );
}

export function ConvenorView({ activeTab: controlledTab, onTabChange }: ConvenorViewProps = {}) {
  const { refreshKey } = useFest();
  const [internalTab, setInternalTab] = useState<ConvenorTab>('all');
  const activeTab = controlledTab ?? internalTab;

  const setActiveTab = (tab: ConvenorTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('affl_asc');
  const [expandedCollegeIds, setExpandedCollegeIds] = useState<Set<number>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Colleges reactive from festService
  const colleges = useMemo(() => festService.getColleges(), [refreshKey]);

  // Aggregate metrics
  const stats = useMemo(() => {
    let coordCount = 0;
    let managerCount = 0;
    let asstManagerCount = 0;

    for (const c of colleges) {
      if (c.staff_coordinator_name || c.coordinator_name || c.staff_coordinator_phone) coordCount++;
      if (c.team_manager_name || c.manager_name || c.team_manager_phone) managerCount++;
      if (c.asst_team_manager_name || c.asst_manager_name || c.asst_team_manager_phone) asstManagerCount++;
    }

    return {
      totalColleges: colleges.length,
      coordCount,
      managerCount,
      asstManagerCount
    };
  }, [colleges]);

  // Copy to clipboard handler
  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Toggle single college accordion
  const toggleExpand = (afflNo: number) => {
    setExpandedCollegeIds(prev => {
      const next = new Set(prev);
      if (next.has(afflNo)) {
        next.delete(afflNo);
      } else {
        next.add(afflNo);
      }
      return next;
    });
  };

  // Filtered & Sorted colleges
  const filteredColleges = useMemo(() => {
    let result = [...colleges];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => {
        const affl = c.affl_no?.toString() || '';
        const name = (c.name || '').toLowerCase();
        const shortName = (c.short_name || c.code || '').toLowerCase();
        const coordName = (c.staff_coordinator_name || c.coordinator_name || '').toLowerCase();
        const coordPhone = (c.staff_coordinator_phone || c.coordinator_phone || '').toLowerCase();
        const mgrName = (c.team_manager_name || c.manager_name || '').toLowerCase();
        const mgrPhone = (c.team_manager_phone || c.manager_phone || '').toLowerCase();
        const asstName = (c.asst_team_manager_name || c.asst_manager_name || '').toLowerCase();
        const asstPhone = (c.asst_team_manager_phone || c.asst_manager_phone || '').toLowerCase();
        const address = (c.address || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const union = (c.union_name || '').toLowerCase();

        return (
          affl.includes(q) ||
          name.includes(q) ||
          shortName.includes(q) ||
          coordName.includes(q) ||
          coordPhone.includes(q) ||
          mgrName.includes(q) ||
          mgrPhone.includes(q) ||
          asstName.includes(q) ||
          asstPhone.includes(q) ||
          address.includes(q) ||
          email.includes(q) ||
          union.includes(q)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'affl_asc') {
        return (Number(a.affl_no) || 0) - (Number(b.affl_no) || 0);
      }
      if (sortBy === 'affl_desc') {
        return (Number(b.affl_no) || 0) - (Number(a.affl_no) || 0);
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      return 0;
    });

    return result;
  }, [colleges, searchQuery, sortBy]);

  // Toggle all filtered colleges expand / collapse
  const isAllExpanded = useMemo(() => {
    if (filteredColleges.length === 0) return false;
    return filteredColleges.every(c => expandedCollegeIds.has(c.affl_no));
  }, [filteredColleges, expandedCollegeIds]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedCollegeIds(new Set());
    } else {
      setExpandedCollegeIds(new Set(filteredColleges.map(c => c.affl_no)));
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Broadcast Modal */}
      <ConvenorBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        onSuccess={() => {
          alert('⚡ Flash Announcement successfully broadcasted to Team Managers!');
        }}
      />

      {/* DEDICATED TAB: STAGE PROGRESS & BROADCAST BULLETINS */}
      {activeTab === 'stage_monitor' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Operations Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 rounded-2xl shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <h2 className="text-base font-black text-[var(--text-primary)]">
                  Backstage Operations & Emergency Dispatch Desk
                </h2>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl">
                Real-time multi-stage telemetry monitoring live events, upcoming items, and backstage progress. Trigger instant flash announcements directly to team managers&apos; mobile devices and digital displays.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={() => setIsBroadcastModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Megaphone className="w-4 h-4 animate-bounce" />
                <span>Broadcast Flash Bulletin</span>
              </Button>
            </div>
          </div>

          {/* Live Stage Progress Card */}
          <LiveStageProgressWidget refreshKey={refreshKey} />
        </div>
      )}

      {/* DIRECTORY TABS: ALL / COORDINATOR / MANAGER / ASST_MANAGER */}
      {activeTab !== 'stage_monitor' && (
        <>
          {/* 1. TOP SUMMARY TILES (Clickable to switch view modes) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Tile 1: All Participating Colleges */}
            <Card
              onClick={() => setActiveTab('all')}
              className={`p-4 cursor-pointer transition-all border ${
                activeTab === 'all'
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/40'
                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]'
              }`}
            >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Participating Colleges
              </p>
              <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
                {stats.totalColleges}
              </h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
            <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'all' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>Full college directory</span>
          </div>
        </Card>

        {/* Tile 2: Staff Co-ordinators */}
        <Card
          onClick={() => setActiveTab('coordinator')}
          className={`p-4 cursor-pointer transition-all border ${
            activeTab === 'coordinator'
              ? 'border-indigo-500 bg-indigo-500/10 shadow-xs ring-1 ring-indigo-500/40'
              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Staff Co-ordinators
              </p>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                {stats.coordCount}
              </h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              activeTab === 'coordinator'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
            }`}>
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
            <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'coordinator' ? 'bg-indigo-500' : 'bg-slate-400'}`} />
            <span>Faculty contacts</span>
          </div>
        </Card>

        {/* Tile 3: Team Managers */}
        <Card
          onClick={() => setActiveTab('manager')}
          className={`p-4 cursor-pointer transition-all border ${
            activeTab === 'manager'
              ? 'border-sky-500 bg-sky-500/10 shadow-xs ring-1 ring-sky-500/40'
              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Team Managers
              </p>
              <h3 className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">
                {stats.managerCount}
              </h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              activeTab === 'manager'
                ? 'bg-sky-600 text-white'
                : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
            }`}>
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
            <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'manager' ? 'bg-sky-500' : 'bg-slate-400'}`} />
            <span>Student managers</span>
          </div>
        </Card>

        {/* Tile 4: Assistant Managers */}
        <Card
          onClick={() => setActiveTab('asst_manager')}
          className={`p-4 cursor-pointer transition-all border ${
            activeTab === 'asst_manager'
              ? 'border-amber-500 bg-amber-500/10 shadow-xs ring-1 ring-amber-500/40'
              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Assistant Managers
              </p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                {stats.asstManagerCount}
              </h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              activeTab === 'asst_manager'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}>
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
            <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'asst_manager' ? 'bg-amber-500' : 'bg-slate-400'}`} />
            <span>Asst. team managers</span>
          </div>
        </Card>
      </div>

      {/* 2. SEARCH & CONTROLS TOOLBAR (Cleaned up, no extra view mode or type filtration) */}
      <div className="bg-[var(--bg-surface)] p-3 sm:p-4 rounded-xl border border-[var(--border-subtle)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by college, code, personnel, phone number, address..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right side controls: Sort & Expand/Collapse */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-[var(--bg-canvas)] px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortType)}
              className="bg-transparent text-[var(--text-primary)] font-medium text-xs focus:outline-none cursor-pointer"
            >
              <option value="affl_asc">Affl # Ascending (1 → 25)</option>
              <option value="affl_desc">Affl # Descending (25 → 1)</option>
              <option value="name_asc">College Name (A → Z)</option>
              <option value="name_desc">College Name (Z → A)</option>
            </select>
          </div>

          {/* Single Dynamic Expand / Collapse All Button */}
          {activeTab === 'all' && filteredColleges.length > 0 && (
            <Button
              size="xs"
              variant="outline"
              onClick={toggleExpandAll}
              className={`h-8 px-3 font-medium transition-colors text-xs ${
                isAllExpanded
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : ''
              }`}
              title={isAllExpanded ? 'Collapse all college cards' : 'Expand all college cards'}
            >
              {isAllExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  <span>Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 mr-1" />
                  <span>Expand All</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 3. MAIN CONTENT VIEWS */}

      {/* VIEW A: ALL CONTACTS (EXPANDABLE DIRECTORY) */}
      {activeTab === 'all' && (
        <div className="space-y-3">
          {filteredColleges.length === 0 ? (
            <div className="text-center py-12 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)]">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-sm text-[var(--text-primary)]">No institutions found</p>
              <p className="text-xs mt-1">Try clearing your search query.</p>
            </div>
          ) : (
            filteredColleges.map(college => {
              const isExpanded = expandedCollegeIds.has(college.affl_no);
              const staffCoord = college.staff_coordinator_name || college.coordinator_name;
              const staffPhone = college.staff_coordinator_phone || college.coordinator_phone;
              const staffWhatsapp = college.staff_coordinator_whatsapp || staffPhone;

              const teamMgr = college.team_manager_name || college.manager_name;
              const teamPhone = college.team_manager_phone || college.manager_phone;
              const teamWhatsapp = college.team_manager_whatsapp || teamPhone;

              const asstMgr = college.asst_team_manager_name || college.asst_manager_name;
              const asstPhone = college.asst_team_manager_phone || college.asst_manager_phone;
              const asstWhatsapp = college.asst_team_manager_whatsapp || asstPhone;

              return (
                <div
                  key={college.id || college.affl_no}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'bg-[var(--bg-surface)] border-emerald-500/40 shadow-xs'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)]'
                  }`}
                >
                  {/* Expandable Header Bar */}
                  <div
                    onClick={() => toggleExpand(college.affl_no)}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-[var(--bg-hover)]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Affl Number Badge */}
                      <div className="w-10 h-10 rounded-lg bg-[var(--brand-navy)] text-white flex flex-col items-center justify-center shrink-0 border border-slate-700/30">
                        <span className="text-[9px] font-semibold text-emerald-400 uppercase leading-none">AFFL</span>
                        <span className="text-sm font-black font-mono leading-tight">{college.affl_no}</span>
                      </div>

                      {/* College Name & Short Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                            {college.name}
                          </h3>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                            {college.short_name || college.code}
                          </span>
                        </div>

                        {/* Collapsed Preview Snippet */}
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--text-secondary)] flex-wrap">
                          {staffCoord && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <GraduationCap className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="font-medium truncate">{staffCoord}</span>
                            </span>
                          )}
                          {teamMgr && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <Users className="w-3 h-3 text-sky-500 shrink-0" />
                              <span className="font-medium truncate">{teamMgr}</span>
                            </span>
                          )}
                          {asstMgr && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <UserCheck className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="font-medium truncate">{asstMgr}</span>
                            </span>
                          )}
                          {!staffCoord && !teamMgr && !asstMgr && (
                            <span className="text-[var(--text-muted)] italic">Click to view contacts</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Action Icons & Expand Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Direct Call Button (Redirects to call) */}
                      {(staffPhone || teamPhone || college.contact_no) && (
                        <a
                          href={getTelLink(staffPhone || teamPhone || college.contact_no)}
                          onClick={e => e.stopPropagation()}
                          className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors"
                          title={`Call: ${staffPhone || teamPhone || college.contact_no}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Direct WhatsApp Button (Redirects to WhatsApp) */}
                      {(staffWhatsapp || teamWhatsapp) && (
                        <a
                          href={getWhatsAppLink(staffWhatsapp || teamWhatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          title={`WhatsApp: ${staffWhatsapp || teamWhatsapp}`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Contact Details Area */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 space-y-4">
                      {/* 3 Dedicated Personnel Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* 1. Staff Co-ordinator */}
                        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-indigo-500/20 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5" /> Co-ordinator (Staff)
                            </span>
                            {staffCoord && (
                              <Badge variant="purple" size="sm" className="text-[9px] px-1.5 py-0 font-semibold">
                                Faculty
                              </Badge>
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-xs text-[var(--text-primary)]">
                              {staffCoord || <span className="text-[var(--text-muted)] italic font-normal">Not Provided</span>}
                            </h4>
                          </div>

                          {/* Contact Channels: Clicking number copies to clipboard */}
                          <div className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)] text-xs">
                            {/* Phone */}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                <Phone className="w-3 h-3 text-sky-500" /> Phone:
                              </span>
                              <ClickableNumber
                                number={staffPhone}
                                copyKey={`coord-ph-${college.affl_no}`}
                                type="phone"
                                copiedKey={copiedKey}
                                onCopy={handleCopy}
                              />
                            </div>

                            {/* WhatsApp */}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                <MessageCircle className="w-3 h-3 text-emerald-500" /> WhatsApp:
                              </span>
                              <ClickableNumber
                                number={staffWhatsapp}
                                copyKey={`coord-wa-${college.affl_no}`}
                                type="whatsapp"
                                copiedKey={copiedKey}
                                onCopy={handleCopy}
                              />
                            </div>
                          </div>

                          {/* Direct Action Buttons: Redirects to call or whatsapp */}
                          {(staffPhone || staffWhatsapp) && (
                            <div className="flex items-center gap-1.5 pt-2">
                              {staffPhone && (
                                <a
                                  href={getTelLink(staffPhone)}
                                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center justify-center gap-1.5 hover:bg-sky-100 transition-colors shadow-2xs cursor-pointer"
                                  title="Redirect to Call"
                                >
                                  <PhoneCall className="w-3 h-3" /> Call
                                </a>
                              )}
                              {staffWhatsapp && (
                                <a
                                  href={getWhatsAppLink(staffWhatsapp)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
                                  title="Redirect to WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3" /> WhatsApp
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 2. Team Manager */}
                        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-sky-500/20 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> Team Manager
                            </span>
                            {teamMgr && (
                              <Badge variant="secondary" size="sm" className="text-[9px] px-1.5 py-0 font-semibold">
                                Manager
                              </Badge>
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-xs text-[var(--text-primary)]">
                              {teamMgr || <span className="text-[var(--text-muted)] italic font-normal">Not Provided</span>}
                            </h4>
                          </div>

                          {/* Contact Channels: Clicking number copies to clipboard */}
                          <div className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)] text-xs">
                            {/* Phone */}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                <Phone className="w-3 h-3 text-sky-500" /> Phone:
                              </span>
                              <ClickableNumber
                                number={teamPhone}
                                copyKey={`mgr-ph-${college.affl_no}`}
                                type="phone"
                                copiedKey={copiedKey}
                                onCopy={handleCopy}
                              />
                            </div>

                            {/* WhatsApp */}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                <MessageCircle className="w-3 h-3 text-emerald-500" /> WhatsApp:
                              </span>
                              <ClickableNumber
                                number={teamWhatsapp}
                                copyKey={`mgr-wa-${college.affl_no}`}
                                type="whatsapp"
                                copiedKey={copiedKey}
                                onCopy={handleCopy}
                              />
                            </div>
                          </div>

                          {/* Direct Action Buttons: Redirects to call or whatsapp */}
                          {(teamPhone || teamWhatsapp) && (
                            <div className="flex items-center gap-1.5 pt-2">
                              {teamPhone && (
                                <a
                                  href={getTelLink(teamPhone)}
                                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center justify-center gap-1.5 hover:bg-sky-100 transition-colors shadow-2xs cursor-pointer"
                                  title="Redirect to Call"
                                >
                                  <PhoneCall className="w-3 h-3" /> Call
                                </a>
                              )}
                              {teamWhatsapp && (
                                <a
                                  href={getWhatsAppLink(teamWhatsapp)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
                                  title="Redirect to WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3" /> WhatsApp
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 3. Assistant Manager */}
                        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-amber-500/20 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" /> Asst. Manager
                            </span>
                            {asstMgr && (
                              <Badge variant="amber" size="sm" className="text-[9px] px-1.5 py-0 font-semibold">
                                Asst. Manager
                              </Badge>
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-xs text-[var(--text-primary)]">
                              {asstMgr || <span className="text-[var(--text-muted)] italic font-normal">Not Provided</span>}
                            </h4>
                          </div>

                          {/* Contact Channels: Clicking number copies to clipboard */}
                          <div className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)] text-xs">
                            {/* Phone */}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                <Phone className="w-3 h-3 text-sky-500" /> Phone:
                              </span>
                              <ClickableNumber
                                number={asstPhone}
                                copyKey={`asst-ph-${college.affl_no}`}
                                type="phone"
                                copiedKey={copiedKey}
                                onCopy={handleCopy}
                              />
                            </div>

                            {/* WhatsApp */}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                <MessageCircle className="w-3 h-3 text-emerald-500" /> WhatsApp:
                              </span>
                              <ClickableNumber
                                number={asstWhatsapp}
                                copyKey={`asst-wa-${college.affl_no}`}
                                type="whatsapp"
                                copiedKey={copiedKey}
                                onCopy={handleCopy}
                              />
                            </div>
                          </div>

                          {/* Direct Action Buttons: Redirects to call or whatsapp */}
                          {(asstPhone || asstWhatsapp) && (
                            <div className="flex items-center gap-1.5 pt-2">
                              {asstPhone && (
                                <a
                                  href={getTelLink(asstPhone)}
                                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center justify-center gap-1.5 hover:bg-sky-100 transition-colors shadow-2xs cursor-pointer"
                                  title="Redirect to Call"
                                >
                                  <PhoneCall className="w-3 h-3" /> Call
                                </a>
                              )}
                              {asstWhatsapp && (
                                <a
                                  href={getWhatsAppLink(asstWhatsapp)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
                                  title="Redirect to WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3" /> WhatsApp
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* College Institutional Details & Address */}
                      <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 text-xs">
                            <Building2 className="w-3.5 h-3.5 text-emerald-500" /> College Campus & Office Contacts
                          </h4>
                          <div className="flex items-center gap-3">
                            {college.email && (
                              <a
                                href={`mailto:${college.email}`}
                                className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-mono"
                              >
                                <Mail className="w-3 h-3" /> {college.email}
                              </a>
                            )}
                            {college.contact_no && (
                              <div className="flex items-center gap-1">
                                <ClickableNumber
                                  number={college.contact_no}
                                  copyKey={`col-ph-${college.affl_no}`}
                                  type="phone"
                                  copiedKey={copiedKey}
                                  onCopy={handleCopy}
                                />
                                <a
                                  href={getTelLink(college.contact_no)}
                                  className="p-1 rounded text-sky-600 hover:bg-sky-500/10"
                                  title="Call Office"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {college.address && (
                          <div className="flex items-start gap-1.5 text-[var(--text-secondary)] text-[11px] pt-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <p className="whitespace-pre-line leading-relaxed">{college.address}</p>
                          </div>
                        )}

                        {college.union_name && (
                          <div className="flex items-center gap-3 pt-1 text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] mt-2">
                            <span>Students Union: <strong className="text-[var(--text-secondary)]">{college.union_name}</strong></span>
                            {college.union_email && (
                              <a
                                href={`mailto:${college.union_email}`}
                                className="hover:underline text-sky-500"
                              >
                                {college.union_email}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW B: CO-ORDINATOR (STAFF) ONLY TABLE */}
      {activeTab === 'coordinator' && (
        <div className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
          <div className="p-3 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-xs text-[var(--text-primary)]">
                Staff Co-ordinators Directory ({filteredColleges.length} Institutions)
              </h3>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              Click number to copy • Use buttons to call or message
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table className="w-full text-xs">
              <TableHeader className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20 font-bold text-[var(--text-secondary)] py-2.5 pl-4">Affl #</TableHead>
                  <TableHead className="min-w-[200px] font-bold text-[var(--text-secondary)] py-2.5">Institution</TableHead>
                  <TableHead className="min-w-[180px] font-bold text-[var(--text-secondary)] py-2.5">Staff Co-ordinator Name</TableHead>
                  <TableHead className="min-w-[150px] font-bold text-[var(--text-secondary)] py-2.5">Phone Number (Click to Copy)</TableHead>
                  <TableHead className="min-w-[150px] font-bold text-[var(--text-secondary)] py-2.5">WhatsApp Number (Click to Copy)</TableHead>
                  <TableHead className="w-44 text-right font-bold text-[var(--text-secondary)] py-2.5 pr-4">Direct Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColleges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-[var(--text-muted)]">
                      No matching records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredColleges.map(col => {
                    const name = col.staff_coordinator_name || col.coordinator_name;
                    const phone = col.staff_coordinator_phone || col.coordinator_phone;
                    const whatsapp = col.staff_coordinator_whatsapp || phone;

                    return (
                      <TableRow key={col.id || col.affl_no} className="border-b border-[var(--border-subtle)]/60 hover:bg-[var(--bg-canvas)]/60 transition-colors">
                        <TableCell className="py-2.5 pl-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          #{col.affl_no}
                        </TableCell>
                        <TableCell className="py-2.5 font-medium text-[var(--text-primary)]">
                          <div className="font-bold text-xs">{col.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">{col.short_name || col.code}</div>
                        </TableCell>
                        <TableCell className="py-2.5 font-bold text-[var(--text-primary)]">
                          {name || <span className="text-[var(--text-muted)] italic font-normal">Not Provided</span>}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <ClickableNumber
                            number={phone}
                            copyKey={`tbl-coord-ph-${col.affl_no}`}
                            type="phone"
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        </TableCell>
                        <TableCell className="py-2.5">
                          <ClickableNumber
                            number={whatsapp}
                            copyKey={`tbl-coord-wa-${col.affl_no}`}
                            type="whatsapp"
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        </TableCell>
                        <TableCell className="py-2.5 pr-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {phone && (
                              <a
                                href={getTelLink(phone)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Redirect to Call"
                              >
                                <PhoneCall className="w-3 h-3" /> Call
                              </a>
                            )}
                            {whatsapp && (
                              <a
                                href={getWhatsAppLink(whatsapp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Redirect to WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" /> Message
                              </a>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* VIEW C: MANAGER ONLY TABLE */}
      {activeTab === 'manager' && (
        <div className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
          <div className="p-3 bg-sky-500/10 border-b border-sky-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-500" />
              <h3 className="font-bold text-xs text-[var(--text-primary)]">
                Team Managers Directory ({filteredColleges.length} Institutions)
              </h3>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              Click number to copy • Use buttons to call or message
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table className="w-full text-xs">
              <TableHeader className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20 font-bold text-[var(--text-secondary)] py-2.5 pl-4">Affl #</TableHead>
                  <TableHead className="min-w-[200px] font-bold text-[var(--text-secondary)] py-2.5">Institution</TableHead>
                  <TableHead className="min-w-[180px] font-bold text-[var(--text-secondary)] py-2.5">Team Manager Name</TableHead>
                  <TableHead className="min-w-[150px] font-bold text-[var(--text-secondary)] py-2.5">Phone Number (Click to Copy)</TableHead>
                  <TableHead className="min-w-[150px] font-bold text-[var(--text-secondary)] py-2.5">WhatsApp Number (Click to Copy)</TableHead>
                  <TableHead className="w-44 text-right font-bold text-[var(--text-secondary)] py-2.5 pr-4">Direct Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColleges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-[var(--text-muted)]">
                      No matching records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredColleges.map(col => {
                    const name = col.team_manager_name || col.manager_name;
                    const phone = col.team_manager_phone || col.manager_phone;
                    const whatsapp = col.team_manager_whatsapp || phone;

                    return (
                      <TableRow key={col.id || col.affl_no} className="border-b border-[var(--border-subtle)]/60 hover:bg-[var(--bg-canvas)]/60 transition-colors">
                        <TableCell className="py-2.5 pl-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                          #{col.affl_no}
                        </TableCell>
                        <TableCell className="py-2.5 font-medium text-[var(--text-primary)]">
                          <div className="font-bold text-xs">{col.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">{col.short_name || col.code}</div>
                        </TableCell>
                        <TableCell className="py-2.5 font-bold text-[var(--text-primary)]">
                          {name || <span className="text-[var(--text-muted)] italic font-normal">Not Provided</span>}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <ClickableNumber
                            number={phone}
                            copyKey={`tbl-mgr-ph-${col.affl_no}`}
                            type="phone"
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        </TableCell>
                        <TableCell className="py-2.5">
                          <ClickableNumber
                            number={whatsapp}
                            copyKey={`tbl-mgr-wa-${col.affl_no}`}
                            type="whatsapp"
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        </TableCell>
                        <TableCell className="py-2.5 pr-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {phone && (
                              <a
                                href={getTelLink(phone)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Redirect to Call"
                              >
                                <PhoneCall className="w-3 h-3" /> Call
                              </a>
                            )}
                            {whatsapp && (
                              <a
                                href={getWhatsAppLink(whatsapp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Redirect to WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" /> Message
                              </a>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* VIEW D: ASST. MANAGER ONLY TABLE */}
      {activeTab === 'asst_manager' && (
        <div className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-xs text-[var(--text-primary)]">
                Assistant Managers Directory ({filteredColleges.length} Institutions)
              </h3>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              Click number to copy • Use buttons to call or message
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table className="w-full text-xs">
              <TableHeader className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20 font-bold text-[var(--text-secondary)] py-2.5 pl-4">Affl #</TableHead>
                  <TableHead className="min-w-[200px] font-bold text-[var(--text-secondary)] py-2.5">Institution</TableHead>
                  <TableHead className="min-w-[180px] font-bold text-[var(--text-secondary)] py-2.5">Assistant Manager Name</TableHead>
                  <TableHead className="min-w-[150px] font-bold text-[var(--text-secondary)] py-2.5">Phone Number (Click to Copy)</TableHead>
                  <TableHead className="min-w-[150px] font-bold text-[var(--text-secondary)] py-2.5">WhatsApp Number (Click to Copy)</TableHead>
                  <TableHead className="w-44 text-right font-bold text-[var(--text-secondary)] py-2.5 pr-4">Direct Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColleges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-[var(--text-muted)]">
                      No matching records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredColleges.map(col => {
                    const name = col.asst_team_manager_name || col.asst_manager_name;
                    const phone = col.asst_team_manager_phone || col.asst_manager_phone;
                    const whatsapp = col.asst_team_manager_whatsapp || phone;

                    return (
                      <TableRow key={col.id || col.affl_no} className="border-b border-[var(--border-subtle)]/60 hover:bg-[var(--bg-canvas)]/60 transition-colors">
                        <TableCell className="py-2.5 pl-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                          #{col.affl_no}
                        </TableCell>
                        <TableCell className="py-2.5 font-medium text-[var(--text-primary)]">
                          <div className="font-bold text-xs">{col.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">{col.short_name || col.code}</div>
                        </TableCell>
                        <TableCell className="py-2.5 font-bold text-[var(--text-primary)]">
                          {name || <span className="text-[var(--text-muted)] italic font-normal">Not Provided</span>}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <ClickableNumber
                            number={phone}
                            copyKey={`tbl-asst-ph-${col.affl_no}`}
                            type="phone"
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        </TableCell>
                        <TableCell className="py-2.5">
                          <ClickableNumber
                            number={whatsapp}
                            copyKey={`tbl-asst-wa-${col.affl_no}`}
                            type="whatsapp"
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        </TableCell>
                        <TableCell className="py-2.5 pr-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {phone && (
                              <a
                                href={getTelLink(phone)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Redirect to Call"
                              >
                                <PhoneCall className="w-3 h-3" /> Call
                              </a>
                            )}
                            {whatsapp && (
                              <a
                                href={getWhatsAppLink(whatsapp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Redirect to WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" /> Message
                              </a>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
