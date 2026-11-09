'use client';

import React, { useState, useMemo } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { ConvenorBroadcastModal } from './ConvenorBroadcastModal';
import {
  ConvenorDirectoryTab,
  ConvenorTab,
  SortType,
} from '../convenor/tabs/ConvenorDirectoryTab';
import { ConvenorStageMonitorTab } from '../convenor/tabs/ConvenorStageMonitorTab';
import { getTelLink, getWhatsAppLink } from '@/lib/utils/contactLinks';
import { TilePattern } from '@/components/fest/FestPattern';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export { getTelLink, getWhatsAppLink };
export type { ConvenorTab, SortType };

interface ConvenorViewProps {
  activeTab?: ConvenorTab;
  onTabChange?: (tab: ConvenorTab) => void;
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
      totalCoordinators: coordCount,
      totalManagers: managerCount,
      totalAsstManagers: asstManagerCount,
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

      {/* Convenor Sub-Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6 [box-shadow:var(--shadow-card),var(--glass-highlight)] backdrop-blur-md">
        <TilePattern id="convenor-hero-pattern" className="opacity-10 text-[var(--f-saffron)]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading font-black text-lg sm:text-xl text-[var(--text-primary)] tracking-tight">
                Fest Convenor Executive Desk
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-[var(--f-saffron-text)] text-[11px] font-mono font-bold uppercase tracking-wider shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--f-saffron)] shadow-[0_0_6px_var(--f-saffron)] animate-pulse" />
                Live Dispatch Active
              </span>
            </div>
            <p className="text-xs font-sans text-[var(--text-secondary)] mt-1.5 max-w-2xl leading-relaxed">
              Real-time multi-stage telemetry, emergency broadcast dispatches to team managers, and verified contact directory across all {colleges.length} participating institutions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="saffron"
              size="sm"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="font-heading font-bold text-xs h-9 px-3.5 shadow-md flex items-center gap-2"
            >
              <Megaphone className="w-4 h-4 animate-bounce" />
              <span>Broadcast Notice</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Dedicated Tab: Stage Progress & Broadcast Bulletins */}
      {activeTab === 'stage_monitor' && (
        <ConvenorStageMonitorTab
          refreshKey={refreshKey}
          onOpenBroadcastModal={() => setIsBroadcastModalOpen(true)}
        />
      )}

      {/* Directory Tabs: All / Coordinator / Manager / Asst Manager */}
      {activeTab !== 'stage_monitor' && (
        <ConvenorDirectoryTab
          activeTab={activeTab}
          onTabChange={setActiveTab}
          stats={stats}
          filteredColleges={filteredColleges}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          expandedCollegeIds={expandedCollegeIds}
          toggleCollegeExpand={toggleExpand}
          isAllExpanded={isAllExpanded}
          toggleExpandAll={toggleExpandAll}
          copiedKey={copiedKey}
          handleCopy={handleCopy}
        />
      )}
    </div>
  );
}
