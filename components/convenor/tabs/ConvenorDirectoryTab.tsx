'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { College } from '@/lib/types/fest';
import {
  Building2,
  Search,
  X,
  Phone,
  MessageCircle,
  MapPin,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Users,
  UserCheck,
  GraduationCap,
  Check,
} from 'lucide-react';
import { getTelLink, getWhatsAppLink } from '@/lib/utils/contactLinks';

export type ConvenorTab = 'all' | 'coordinator' | 'manager' | 'asst_manager' | 'stage_monitor';
export type SortType = 'affl_asc' | 'affl_desc' | 'name_asc' | 'name_desc';

interface ConvenorDirectoryTabProps {
  activeTab: 'all' | 'coordinator' | 'manager' | 'asst_manager';
  onTabChange: (tab: ConvenorTab) => void;
  stats: {
    totalColleges: number;
    totalCoordinators: number;
    totalManagers: number;
    totalAsstManagers: number;
  };
  filteredColleges: College[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: SortType;
  setSortBy: (sort: SortType) => void;
  expandedCollegeIds: Set<number>;
  toggleCollegeExpand: (afflNo: number) => void;
  isAllExpanded: boolean;
  toggleExpandAll: () => void;
  copiedKey: string | null;
  handleCopy: (text: string, key: string, e: React.MouseEvent) => void;
}

export function ClickableNumber({
  number,
  copyKey,
  type = 'phone',
  copiedKey,
  onCopy,
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
      className={`group font-mono font-bold text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none ${isCopied
          ? 'bg-amber-500/20 text-[var(--f-saffron-text)] border border-amber-500/40 shadow-2xs'
          : type === 'phone'
            ? 'text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 hover:text-sky-500 border border-transparent hover:border-sky-500/20'
            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-500 border border-transparent hover:border-emerald-500/20'
        }`}
    >
      <span>{number}</span>
      {isCopied && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-sans font-semibold text-[var(--f-saffron-text)]">
          <Check className="w-3 h-3 text-[var(--f-saffron)]" /> Copied!
        </span>
      )}
    </button>
  );
}

export function ConvenorDirectoryTab({
  activeTab,
  onTabChange,
  stats,
  filteredColleges,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  expandedCollegeIds,
  toggleCollegeExpand,
  isAllExpanded,
  toggleExpandAll,
  copiedKey,
  handleCopy,
}: ConvenorDirectoryTabProps) {
  return (
    <>
      {/* 1. TOP SUMMARY TILES (Clickable to switch view modes) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Tile 1: All Participating Colleges */}
        <Card
          onClick={() => onTabChange('all')}
          className={`p-4 cursor-pointer transition-all border [box-shadow:var(--shadow-card),var(--glass-highlight)] ${activeTab === 'all'
              ? 'border-[var(--f-saffron)] bg-amber-500/10 shadow-xs ring-1 ring-amber-500/40'
              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]'
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-heading font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Participating Colleges
              </p>
              <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono tracking-tight">
                {stats.totalColleges}
              </h3>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'all'
                  ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-md shadow-amber-500/20'
                  : 'bg-amber-500/10 text-[var(--f-saffron-text)]'
                }`}
            >
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 font-medium font-sans">
            <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'all' ? 'bg-[var(--f-saffron)] shadow-[0_0_6px_var(--f-saffron)] animate-pulse' : 'bg-[var(--border-strong)]'}`} />
            <span>Full college directory</span>
          </div>
        </Card>

        {/* Tile 2: Staff Co-ordinators */}
        <Card
          onClick={() => onTabChange('coordinator')}
          className={`p-4 cursor-pointer transition-all border [box-shadow:var(--shadow-card),var(--glass-highlight)] ${activeTab === 'coordinator'
              ? 'border-[var(--f-saffron)] bg-amber-500/10 shadow-xs ring-1 ring-amber-500/40'
              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]'
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-heading font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Staff Co-ordinators
              </p>
              <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono tracking-tight">
                {stats.totalCoordinators}
              </h3>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'coordinator'
                  ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-md shadow-amber-500/20'
                  : 'bg-amber-500/10 text-[var(--f-saffron-text)]'
                }`}
            >
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 font-medium font-sans">
            <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'coordinator' ? 'bg-[var(--f-saffron)] shadow-[0_0_6px_var(--f-saffron)] animate-pulse' : 'bg-[var(--border-strong)]'}`} />
            <span>Faculty contacts</span>
          </div>
        </Card>

        {/* Tile 3: Team Managers */}
        <Card
          onClick={() => onTabChange('manager')}
          className={`p-4 cursor-pointer transition-all border [box-shadow:var(--shadow-card),var(--glass-highlight)] ${activeTab === 'manager'
              ? 'border-[var(--f-saffron)] bg-amber-500/10 shadow-xs ring-1 ring-amber-500/40'
              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]'
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-heading font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Team Managers
              </p>
              <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono tracking-tight">
                {stats.totalManagers}
              </h3>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'manager'
                  ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-md shadow-amber-500/20'
                  : 'bg-amber-500/10 text-[var(--f-saffron-text)]'
                }`}
            >
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 font-medium font-sans">
            <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'manager' ? 'bg-[var(--f-saffron)] shadow-[0_0_6px_var(--f-saffron)] animate-pulse' : 'bg-[var(--border-strong)]'}`} />
            <span>Student managers</span>
          </div>
        </Card>

        {/* Tile 4: Asst. Team Managers */}
        <Card
          onClick={() => onTabChange('asst_manager')}
          className={`p-4 cursor-pointer transition-all border [box-shadow:var(--shadow-card),var(--glass-highlight)] ${activeTab === 'asst_manager'
              ? 'border-[var(--f-saffron)] bg-amber-500/10 shadow-xs ring-1 ring-amber-500/40'
              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]'
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-heading font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Asst. Team Managers
              </p>
              <h3 className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono tracking-tight">
                {stats.totalAsstManagers}
              </h3>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'asst_manager'
                  ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-md shadow-amber-500/20'
                  : 'bg-amber-500/10 text-[var(--f-saffron-text)]'
                }`}
            >
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 font-medium font-sans">
            <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'asst_manager' ? 'bg-[var(--f-saffron)] shadow-[0_0_6px_var(--f-saffron)] animate-pulse' : 'bg-[var(--border-strong)]'}`} />
            <span>Asst. team managers</span>
          </div>
        </Card>
      </div>

      {/* 2. SEARCH & CONTROL BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--bg-surface)] p-3 sm:p-3.5 rounded-2xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] backdrop-blur-md">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by college name, affl no, or coordinator..."
            aria-label="Search college directory"
            className="w-full pl-9 pr-9 py-2 text-xs font-sans rounded-xl border border-[var(--border-medium)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 transition-all font-medium placeholder:text-[var(--text-muted)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium font-sans">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortType)}
              aria-label="Sort directory by"
              className="font-heading font-semibold text-xs rounded-xl px-3 py-2 border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="affl_asc">Affiliation No. (Asc)</option>
              <option value="affl_desc">Affiliation No. (Desc)</option>
              <option value="name_asc">College Name (A-Z)</option>
              <option value="name_desc">College Name (Z-A)</option>
            </select>
          </div>

          {/* Expand/Collapse All (Available in 'all' view) */}
          {activeTab === 'all' && filteredColleges.length > 0 && (
            <Button
              size="xs"
              variant="outline"
              onClick={toggleExpandAll}
              className={`h-8 px-3 font-heading font-semibold transition-all text-xs rounded-xl ${isAllExpanded
                  ? 'border-amber-500/50 bg-amber-500/10 text-[var(--f-saffron-text)]'
                  : 'hover:border-[var(--f-saffron)] hover:text-[var(--f-saffron-text)]'
                }`}
              title={isAllExpanded ? 'Collapse all college cards' : 'Expand all college cards'}
            >
              {isAllExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 mr-1 text-[var(--f-saffron)]" />
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
            <div className="text-center py-12 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] text-[var(--text-muted)]">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-[var(--f-saffron)]" />
              <p className="font-heading font-bold text-sm text-[var(--text-primary)]">No institutions found</p>
              <p className="text-xs font-sans mt-1">Try clearing your search query.</p>
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
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden [box-shadow:var(--shadow-card),var(--glass-highlight)] ${isExpanded
                      ? 'border-amber-500/40 bg-[var(--bg-surface)] shadow-md'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-medium)]'
                    }`}
                >
                  {/* Card Header (Always visible) */}
                  <div
                    onClick={() => toggleCollegeExpand(college.affl_no)}
                    className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-2xs">
                        #{college.affl_no}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-heading font-bold text-sm text-[var(--text-primary)] tracking-tight">
                            {college.name}
                          </h4>
                          {college.code && (
                            <Badge variant="outline" size="sm" className="font-mono text-[10px] uppercase font-semibold">
                              {college.code}
                            </Badge>
                          )}
                        </div>
                        {college.address && (
                          <p className="text-xs font-sans text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                            <span>{college.address}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-[11px] font-sans font-medium text-[var(--text-muted)] hidden md:inline">
                        {isExpanded ? 'Click to collapse' : 'Click to inspect leadership'}
                      </span>
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-transform duration-200 ${isExpanded ? 'bg-amber-500/15 text-[var(--f-saffron-text)] border-amber-500/30 rotate-180' : ''
                          }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Body: Leadership Grid */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* 1. Staff Co-ordinator */}
                        <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)] space-y-2">
                          <div className="flex items-center gap-1.5 text-[var(--f-saffron-text)] font-heading font-bold text-xs">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Staff Co-ordinator</span>
                          </div>
                          <div className="text-xs font-sans font-semibold text-[var(--text-primary)]">
                            {staffCoord || <span className="text-[var(--text-muted)] italic font-normal">Not Registered</span>}
                          </div>
                          {staffPhone && (
                            <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)]">
                              <ClickableNumber
                                number={staffPhone}
                                copyKey={`staff-${college.affl_no}`}
                                type="phone"
                                copiedKey={copiedKey}
                                onCopy={handleCopy}
                              />
                              <div className="flex items-center gap-1">
                                <a
                                  href={getTelLink(staffPhone)}
                                  className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 flex items-center justify-center transition-colors"
                                  title="Call phone"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                {staffWhatsapp && (
                                  <a
                                    href={getWhatsAppLink(staffWhatsapp)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                                    title="Open WhatsApp chat"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 2. Team Manager */}
                        <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)] space-y-2">
                          <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-heading font-bold text-xs">
                            <Users className="w-3.5 h-3.5" />
                            <span>Team Manager</span>
                          </div>
                          <div className="text-xs font-sans font-semibold text-[var(--text-primary)]">
                            {teamMgr || <span className="text-[var(--text-muted)] italic font-normal">Not Registered</span>}
                          </div>
                          {teamPhone && (
                            <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)]">
                              <ClickableNumber
                                number={teamPhone}
                                copyKey={`team-${college.affl_no}`}
                                type="phone"
                                copiedKey={copiedKey}
                                onCopy={handleCopy}
                              />
                              <div className="flex items-center gap-1">
                                <a
                                  href={getTelLink(teamPhone)}
                                  className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 flex items-center justify-center transition-colors"
                                  title="Call phone"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                {teamWhatsapp && (
                                  <a
                                    href={getWhatsAppLink(teamWhatsapp)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                                    title="Open WhatsApp chat"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 3. Asst. Team Manager */}
                        <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)] space-y-2">
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-heading font-bold text-xs">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Asst. Team Manager</span>
                          </div>
                          <div className="text-xs font-sans font-semibold text-[var(--text-primary)]">
                            {asstMgr || <span className="text-[var(--text-muted)] italic font-normal">Not Registered</span>}
                          </div>
                          {asstPhone && (
                            <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)]">
                              <ClickableNumber
                                number={asstPhone}
                                copyKey={`asst-${college.affl_no}`}
                                type="phone"
                                copiedKey={copiedKey}
                                onCopy={handleCopy}
                              />
                              <div className="flex items-center gap-1">
                                <a
                                  href={getTelLink(asstPhone)}
                                  className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 flex items-center justify-center transition-colors"
                                  title="Call phone"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                {asstWhatsapp && (
                                  <a
                                    href={getWhatsAppLink(asstWhatsapp)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                                    title="Open WhatsApp chat"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW B: STAFF CO-ORDINATORS ONLY TABLE */}
      {activeTab === 'coordinator' && (
        <div className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden [box-shadow:var(--shadow-card),var(--glass-highlight)]">
          <div className="p-3.5 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
              <UserCheck className="w-4 h-4 text-[var(--f-saffron-text)]" />
              <span className="font-heading font-bold text-xs text-[var(--text-primary)] tracking-tight">
                Staff Co-ordinators Registry ({filteredColleges.length})
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Affl No</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">College Name</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Staff Co-ordinator</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Phone Number</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">WhatsApp</TableHead>
                  <TableHead className="text-right font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColleges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs font-sans text-[var(--text-muted)]">
                      No staff coordinators match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredColleges.map(col => {
                    const name = col.staff_coordinator_name || col.coordinator_name;
                    const phone = col.staff_coordinator_phone || col.coordinator_phone;
                    const wa = col.staff_coordinator_whatsapp || phone;

                    return (
                      <TableRow key={col.affl_no} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">
                          #{col.affl_no}
                        </TableCell>
                        <TableCell>
                          <div className="font-heading font-bold text-xs text-[var(--text-primary)]">{col.name}</div>
                          {col.address && <div className="text-[11px] font-sans text-[var(--text-muted)] mt-0.5">{col.address}</div>}
                        </TableCell>
                        <TableCell className="text-xs font-sans font-medium text-[var(--text-primary)]">
                          {name || <span className="text-[var(--text-muted)] italic">Not Registered</span>}
                        </TableCell>
                        <TableCell>
                          <ClickableNumber
                            number={phone}
                            copyKey={`coord-ph-${col.affl_no}`}
                            type="phone"
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        </TableCell>
                        <TableCell>
                          <ClickableNumber
                            number={wa}
                            copyKey={`coord-wa-${col.affl_no}`}
                            type="whatsapp"
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {phone && (
                              <a
                                href={getTelLink(phone)}
                                className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 flex items-center justify-center transition-colors"
                                title="Call coordinator"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {wa && (
                              <a
                                href={getWhatsAppLink(wa)}
                                target="_blank"
                                rel="noreferrer"
                                className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                                title="Open WhatsApp chat"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
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

      {/* VIEW C: TEAM MANAGERS ONLY TABLE */}
      {activeTab === 'manager' && (
        <div className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden [box-shadow:var(--shadow-card),var(--glass-highlight)]">
          <div className="p-3.5 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_6px_#0ea5e9]" />
              <Users className="w-4 h-4 text-sky-500" />
              <span className="font-heading font-bold text-xs text-[var(--text-primary)] tracking-tight">
                Team Managers Registry ({filteredColleges.length})
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Affl No</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">College Name</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Team Manager</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Phone Number</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">WhatsApp</TableHead>
                  <TableHead className="text-right font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColleges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs font-sans text-[var(--text-muted)]">
                      No team managers match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredColleges.map(col => {
                    const name = col.team_manager_name || col.manager_name;
                    const phone = col.team_manager_phone || col.manager_phone;
                    const wa = col.team_manager_whatsapp || phone;

                    return (
                      <TableRow key={col.affl_no} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">
                          #{col.affl_no}
                        </TableCell>
                        <TableCell>
                          <div className="font-heading font-bold text-xs text-[var(--text-primary)]">{col.name}</div>
                          {col.address && <div className="text-[11px] font-sans text-[var(--text-muted)] mt-0.5">{col.address}</div>}
                        </TableCell>
                        <TableCell className="text-xs font-sans font-medium text-[var(--text-primary)]">
                          {name || <span className="text-[var(--text-muted)] italic">Not Registered</span>}
                        </TableCell>
                        <TableCell>
                          <ClickableNumber
                            number={phone}
                            copyKey={`mgr-ph-${col.affl_no}`}
                            type="phone"
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        </TableCell>
                        <TableCell>
                          <ClickableNumber
                            number={wa}
                            copyKey={`mgr-wa-${col.affl_no}`}
                            type="whatsapp"
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {phone && (
                              <a
                                href={getTelLink(phone)}
                                className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 flex items-center justify-center transition-colors"
                                title="Call manager"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {wa && (
                              <a
                                href={getWhatsAppLink(wa)}
                                target="_blank"
                                rel="noreferrer"
                                className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                                title="Open WhatsApp chat"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
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

      {/* VIEW D: ASST. TEAM MANAGERS ONLY TABLE */}
      {activeTab === 'asst_manager' && (
        <div className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden [box-shadow:var(--shadow-card),var(--glass-highlight)]">
          <div className="p-3.5 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
              <GraduationCap className="w-4 h-4 text-amber-500" />
              <span className="font-heading font-bold text-xs text-[var(--text-primary)] tracking-tight">
                Asst. Team Managers Registry ({filteredColleges.length})
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Affl No</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">College Name</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Asst. Team Manager</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Phone Number</TableHead>
                  <TableHead className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">WhatsApp</TableHead>
                  <TableHead className="text-right font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColleges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs font-sans text-[var(--text-muted)]">
                      No assistant team managers match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredColleges.map(col => {
                    const name = col.asst_team_manager_name || col.asst_manager_name;
                    const phone = col.asst_team_manager_phone || col.asst_manager_phone;
                    const wa = col.asst_team_manager_whatsapp || phone;

                    return (
                      <TableRow key={col.affl_no} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">
                          #{col.affl_no}
                        </TableCell>
                        <TableCell>
                          <div className="font-heading font-bold text-xs text-[var(--text-primary)]">{col.name}</div>
                          {col.address && <div className="text-[11px] font-sans text-[var(--text-muted)] mt-0.5">{col.address}</div>}
                        </TableCell>
                        <TableCell className="text-xs font-sans font-medium text-[var(--text-primary)]">
                          {name || <span className="text-[var(--text-muted)] italic">Not Registered</span>}
                        </TableCell>
                        <TableCell>
                          <ClickableNumber
                            number={phone}
                            copyKey={`asst-ph-${col.affl_no}`}
                            type="phone"
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        </TableCell>
                        <TableCell>
                          <ClickableNumber
                            number={wa}
                            copyKey={`asst-wa-${col.affl_no}`}
                            type="whatsapp"
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {phone && (
                              <a
                                href={getTelLink(phone)}
                                className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 flex items-center justify-center transition-colors"
                                title="Call asst. manager"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {wa && (
                              <a
                                href={getWhatsAppLink(wa)}
                                target="_blank"
                                rel="noreferrer"
                                className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                                title="Open WhatsApp chat"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
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
  );
}
