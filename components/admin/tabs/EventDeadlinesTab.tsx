'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  DollarSign,
  ShieldAlert,
  Flame,
  Layers,
  Save,
  Power,
  PowerOff,
  Check,
  X,
  ExternalLink
} from 'lucide-react';
import { festService } from '@/lib/services/festService';
import { useFest } from '@/lib/context/FestContext';
import { EventKind, EventDeadlineSetting } from '@/lib/types/fest';
import {
  formatIstDisplay,
  formatToIstInput,
  parseIstInputToIso,
  evaluateEventDeadlineSetting
} from '@/lib/utils/istDate';

const EVENT_KIND_LABELS: Record<EventKind, { name: string; icon: any; color: string; desc: string }> = {
  screening: { 
    name: 'Screening Events', 
    icon: Sparkles, 
    color: 'text-amber-500',
    desc: 'Audio/Video preliminary screening events governed by Circular WSFWF_26_016.'
  },
  submission: { 
    name: 'Digital Submission Events', 
    icon: Layers, 
    color: 'text-purple-500',
    desc: 'Pre-fest digital submissions (YouTube links, files, manuscript uploads).'
  },
  onstage: { 
    name: 'On-Stage Events', 
    icon: Flame, 
    color: 'text-rose-500',
    desc: 'Live stage performances (Elocution, Song, Debate, Drama, etc.).'
  },
  offstage: { 
    name: 'Off-Stage Events', 
    icon: SlidersHorizontal, 
    color: 'text-indigo-500',
    desc: 'Writing, painting, quiz, and campus competitive events.'
  },
  general: { 
    name: 'General Fest Schedule', 
    icon: Calendar, 
    color: 'text-emerald-500',
    desc: 'Global baseline schedule used across fest registrations and defaults.'
  },
};

export function EventDeadlinesTab() {
  const { refreshKey, triggerRefresh } = useFest();
  const [settingsList, setSettingsList] = useState<EventDeadlineSetting[]>(() => festService.getEventDeadlineSettings());
  const [activeTab, setActiveTab] = useState<EventKind>('screening');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state for current selected kind
  const currentSetting = useMemo(() => {
    const found = settingsList.find(s => s.event_kind === activeTab);
    return found || settingsList[0];
  }, [settingsList, activeTab]);

  const [startTime, setStartTime] = useState('');
  const [noFineDeadline, setNoFineDeadline] = useState('');
  const [fineDeadline, setFineDeadline] = useState('');
  const [fineAmount, setFineAmount] = useState<number>(500);
  const [hasSuperFine, setHasSuperFine] = useState<boolean>(false);
  const [superFineDeadline, setSuperFineDeadline] = useState('');
  const [superFineAmount, setSuperFineAmount] = useState<number>(1000);
  const [linkSubmissionDeadline, setLinkSubmissionDeadline] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Sync state when activeTab or currentSetting changes
  useEffect(() => {
    if (!currentSetting) return;
    setStartTime(currentSetting.start_time ? formatToIstInput(currentSetting.start_time) : '');
    setNoFineDeadline(currentSetting.no_fine_deadline ? formatToIstInput(currentSetting.no_fine_deadline) : '');
    setFineDeadline(currentSetting.fine_deadline ? formatToIstInput(currentSetting.fine_deadline) : '');
    setFineAmount(currentSetting.fine_amount ?? 500);
    setHasSuperFine(Boolean(currentSetting.has_super_fine));
    setSuperFineDeadline(currentSetting.super_fine_deadline ? formatToIstInput(currentSetting.super_fine_deadline) : '');
    setSuperFineAmount(currentSetting.super_fine_amount ?? 1000);
    setLinkSubmissionDeadline(currentSetting.link_submission_deadline ? formatToIstInput(currentSetting.link_submission_deadline) : '');
    setIsActive(currentSetting.is_active ?? true);
  }, [currentSetting, activeTab]);

  // Load latest data from API
  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/event-deadlines');
      if (res.ok) {
        const data = await res.json();
        if (data.settings && Array.isArray(data.settings)) {
          setSettingsList(data.settings);
        }
      }
    } catch {
      // Keep cached
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToast(null);

    const payload: Partial<EventDeadlineSetting> = {
      event_kind: activeTab,
      display_name: EVENT_KIND_LABELS[activeTab]?.name || activeTab,
      description: EVENT_KIND_LABELS[activeTab]?.desc,
      start_time: startTime ? parseIstInputToIso(startTime) : new Date().toISOString(),
      no_fine_deadline: noFineDeadline ? parseIstInputToIso(noFineDeadline) : new Date().toISOString(),
      fine_deadline: fineDeadline ? parseIstInputToIso(fineDeadline) : new Date().toISOString(),
      fine_amount: Number(fineAmount) >= 0 ? Number(fineAmount) : 500,
      has_super_fine: hasSuperFine,
      super_fine_deadline: hasSuperFine && superFineDeadline ? parseIstInputToIso(superFineDeadline) : null,
      super_fine_amount: hasSuperFine && Number(superFineAmount) >= 0 ? Number(superFineAmount) : null,
      link_submission_deadline: activeTab === 'screening' && linkSubmissionDeadline ? parseIstInputToIso(linkSubmissionDeadline) : null,
      is_active: isActive,
    };

    const res = await festService.updateEventDeadlineSetting(payload);
    setIsSaving(false);

    if (!res.success) {
      setToast({ type: 'error', message: res.error || 'Failed to update deadlines.' });
    } else {
      setToast({ type: 'success', message: `${EVENT_KIND_LABELS[activeTab].name} deadlines & fine policy saved successfully!` });
      if (res.setting) {
        setSettingsList(prev => {
          const idx = prev.findIndex(s => s.event_kind === activeTab);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = res.setting!;
            return next;
          }
          return [...prev, res.setting!];
        });
      }
      triggerRefresh();
    }
  };

  // Quick toggle active directly
  const handleToggleKindActive = async (kind: EventKind, nextStatus: boolean) => {
    if (activeTab === kind) {
      setIsActive(nextStatus);
    }
    const target = settingsList.find(s => s.event_kind === kind);
    if (target) {
      const updated: EventDeadlineSetting = {
        ...target,
        is_active: nextStatus,
      };
      await festService.updateEventDeadlineSetting(updated);
      setSettingsList(prev => prev.map(s => s.event_kind === kind ? updated : s));
      triggerRefresh();
    }
  };

  // Quick fill for Circular WSFWF_26_016 (Screening)
  const applyOfficialScreeningSchedule = () => {
    setIsActive(true);
    setStartTime('2026-11-15T10:00'); // 15/11/2026, 10:00 AM IST
    setNoFineDeadline('2026-11-22T22:00'); // 22/11/2026, 10:00 PM IST
    setFineDeadline('2026-11-24T22:00'); // 24/11/2026, 10:00 PM IST
    setFineAmount(200); // ₹200
    setHasSuperFine(false); // Circular WSFWF_26_016 has NO super fine!
    setSuperFineDeadline('');
    setSuperFineAmount(0);
    setLinkSubmissionDeadline('2026-11-24T22:00'); // Link submission same as fine deadline
    setToast({
      type: 'success',
      message: 'Applied Circular WSFWF_26_016 preset (Super fine disabled). Click "Save Policy" to persist.',
    });
  };

  // Live evaluation for currently selected kind
  const liveEval = useMemo(() => {
    return evaluateEventDeadlineSetting({
      start_time: startTime ? parseIstInputToIso(startTime) : null,
      no_fine_deadline: noFineDeadline ? parseIstInputToIso(noFineDeadline) : null,
      fine_deadline: fineDeadline ? parseIstInputToIso(fineDeadline) : null,
      fine_amount: fineAmount,
      has_super_fine: hasSuperFine,
      super_fine_deadline: hasSuperFine && superFineDeadline ? parseIstInputToIso(superFineDeadline) : null,
      super_fine_amount: hasSuperFine ? superFineAmount : null,
      is_active: isActive,
    });
  }, [startTime, noFineDeadline, fineDeadline, fineAmount, hasSuperFine, superFineDeadline, superFineAmount, isActive]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-[var(--text-primary)]">
              Master Deadlines & Fine Policy Control
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-sans">
            Centralized deadline schedules, fine setups, and enable/disable toggles for all event categories (Screening, Submissions, On-Stage, Off-Stage, General).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between font-sans ${
            toast.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="font-bold underline ml-3 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Event Kind Selector Tabs with Live Status */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['screening', 'submission', 'onstage', 'offstage', 'general'] as EventKind[]).map((kind) => {
          const info = EVENT_KIND_LABELS[kind];
          const IconComponent = info.icon;
          const isSelected = activeTab === kind;
          const row = settingsList.find(s => s.event_kind === kind);
          const ev = evaluateEventDeadlineSetting(row);
          const isRowActive = row?.is_active ?? true;

          return (
            <button
              key={kind}
              type="button"
              onClick={() => setActiveTab(kind)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-amber-500 text-black border-amber-500 font-extrabold shadow-md'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span>{info.name}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  !isRowActive
                    ? 'bg-rose-500'
                    : ev.tier === 'open'
                    ? 'bg-emerald-500'
                    : ev.tier === 'fine'
                    ? 'bg-amber-500'
                    : ev.tier === 'super_fine'
                    ? 'bg-orange-500'
                    : 'bg-blue-500'
                }`}
                title={!isRowActive ? 'Disabled' : ev.label}
              />
            </button>
          );
        })}
      </div>

      {/* Active Event Kind Configuration Card */}
      <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] [box-shadow:var(--shadow-card)]">
        <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span className={EVENT_KIND_LABELS[activeTab].color}>●</span>
                <span>{EVENT_KIND_LABELS[activeTab].name} Schedule & Fine Setup</span>
              </CardTitle>
              <CardDescription className="text-xs">
                {EVENT_KIND_LABELS[activeTab].desc}
              </CardDescription>
            </div>

            {/* Enable/Disable Button & Real-time Live Badge */}
            <div className="flex items-center gap-3">
              {/* Prominent Enable / Disable Button */}
              <button
                type="button"
                onClick={() => setIsActive(prev => !prev)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
                }`}
                title={`Click to ${isActive ? 'Disable' : 'Enable'} registrations for ${EVENT_KIND_LABELS[activeTab].name}`}
              >
                {isActive ? (
                  <>
                    <Power className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Registration ENABLED</span>
                  </>
                ) : (
                  <>
                    <PowerOff className="w-3.5 h-3.5 text-rose-500" />
                    <span>Registration DISABLED</span>
                  </>
                )}
              </button>

              {/* Status Badge */}
              <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${liveEval.badgeClass}`}>
                {liveEval.label}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 font-sans">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Prominent Disabled Warning Banner */}
            {!isActive && (
              <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-600 dark:text-rose-400 font-sans">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
                  <div>
                    <span className="font-bold">Registrations for {EVENT_KIND_LABELS[activeTab].name} are DISABLED.</span>
                    <p className="text-[11px] text-[var(--text-secondary)] font-normal mt-0.5">
                      Colleges will see "Registration Disabled by Fest Admin" and will not be able to add participants until enabled.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsActive(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Enable Registration
                </Button>
              </div>
            )}

            {/* Quick Action for Screening Circular WSFWF_26_016 */}
            {activeTab === 'screening' && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                <div>
                  <p className="text-xs font-bold text-amber-500">Official Circular WSFWF_26_016 Preset</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    15/11 10:00 AM (Start) → 22/11 10:00 PM (Free) → 24/11 10:00 PM (₹200 Fine) → Closed (No Super Fine)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyOfficialScreeningSchedule}
                  className="bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs cursor-pointer"
                >
                  Apply Circular Preset
                </Button>
              </div>
            )}

            {/* 4-Stage Tier Configuration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* STAGE 1: Start Time */}
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-heading text-[var(--text-primary)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>1. Registration Start Date & Time</span>
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/30">
                    Window Opens
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  The moment when registration opens for colleges in this event category.
                </p>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono"
                  required
                />
              </div>

              {/* STAGE 2: Without Fine Deadline */}
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-heading text-[var(--text-primary)] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>2. Registration Without Fine (Free)</span>
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                    ₹0 Fine
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Deadline for free on-time registration without incurring any late fee.
                </p>
                <input
                  type="datetime-local"
                  value={noFineDeadline}
                  onChange={e => setNoFineDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono"
                  required
                />
              </div>

              {/* STAGE 3: With Fine Deadline */}
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-heading text-[var(--text-primary)] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>3. Registration With Fine</span>
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
                    Late Tier
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                      Cutoff Date & Time (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={fineDeadline}
                      onChange={e => setFineDeadline(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                      Fine Amount (₹ per event)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={fineAmount}
                      onChange={e => setFineAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono font-bold text-amber-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* STAGE 4: With Super Fine Deadline (OPTIONAL) */}
              <div
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  hasSuperFine
                    ? 'border-rose-500/30 bg-[var(--bg-subtle)]/40'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className={`w-3.5 h-3.5 ${hasSuperFine ? 'text-rose-500' : 'text-[var(--text-muted)]'}`} />
                    <h4 className="text-xs font-bold font-heading text-[var(--text-primary)]">
                      4. Registration With Super Fine
                    </h4>
                  </div>

                  {/* Super Fine Optional Toggle Switch */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10.5px] font-medium text-[var(--text-secondary)]">Optional:</span>
                    <button
                      type="button"
                      onClick={() => setHasSuperFine(prev => !prev)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                        hasSuperFine
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm'
                          : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${hasSuperFine ? 'bg-rose-500' : 'bg-slate-400'}`} />
                      <span>{hasSuperFine ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>

                {hasSuperFine ? (
                  <>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Extended grace period after the fine cutoff with higher penalty before final lockout.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                          Super Fine Cutoff (IST)
                        </label>
                        <input
                          type="datetime-local"
                          value={superFineDeadline}
                          onChange={e => setSuperFineDeadline(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono"
                          required={hasSuperFine}
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                          Super Fine Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={superFineAmount}
                          onChange={e => setSuperFineAmount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono font-bold text-rose-500"
                          required={hasSuperFine}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>
                      <strong>Super Fine is OFF.</strong> Registrations will strictly close and lock when the Stage 3 (With Fine) deadline passes. (Matches Circular WSFWF_26_016).
                    </span>
                    <button
                      type="button"
                      onClick={() => setHasSuperFine(true)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold whitespace-nowrap cursor-pointer underline"
                    >
                      + Enable Super Fine
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* STAGE 5: Link Submission Deadline (Screening Only) */}
            {activeTab === 'screening' && (
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-heading text-[var(--text-primary)] flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-500" />
                    <span>5. YouTube / Link Submission Deadline</span>
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-500 border-cyan-500/30">
                    Screening Links
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Separate deadline for colleges to submit their screening video links (YouTube URLs).
                  This is <strong>independent</strong> from the registration deadline — colleges can register participants until the registration cutoff,
                  but must submit the actual video link before this deadline.
                </p>
                <input
                  type="datetime-local"
                  value={linkSubmissionDeadline}
                  onChange={e => setLinkSubmissionDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-cyan-500/30 bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono"
                />
                {!linkSubmissionDeadline && (
                  <p className="text-[10.5px] text-amber-500 italic">
                    No separate link deadline set. Falls back to the Stage 3 (With Fine) cutoff for link submissions.
                  </p>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsActive(prev => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  }`}
                >
                  {isActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>{isActive ? 'Category Enabled' : 'Category Disabled'}</span>
                </button>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {isActive ? 'Active and enrolling participants per schedule' : 'Currently locked for all colleges'}
                </span>
              </div>

              <Button
                type="submit"
                disabled={isSaving}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-6 flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving Policy...' : `Save ${EVENT_KIND_LABELS[activeTab].name} Policy`}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Summary Table of All 5 Categories */}
      <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)]">
        <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-500" />
            <span>All Categories Overview & Master Switches</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Review the status, fine structures, and super fine settings across all event categories at a glance.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="py-2.5 px-4">Event Category</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Registration Window</th>
                  <th className="py-2.5 px-4">Fine Tier</th>
                  <th className="py-2.5 px-4">Super Fine Tier</th>
                  <th className="py-2.5 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                {(['screening', 'submission', 'onstage', 'offstage', 'general'] as EventKind[]).map(kind => {
                  const row = settingsList.find(s => s.event_kind === kind);
                  const isKindActive = row?.is_active ?? true;
                  const kindEval = evaluateEventDeadlineSetting(row);

                  return (
                    <tr key={kind} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className={EVENT_KIND_LABELS[kind].color}>●</span>
                        <span>{EVENT_KIND_LABELS[kind].name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${kindEval.badgeClass}`}>
                          {!isKindActive ? 'Disabled' : kindEval.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[var(--text-secondary)]">
                        <div>Opens: {row?.start_time ? formatIstDisplay(row.start_time) : 'Default'}</div>
                        <div className="text-emerald-500 font-semibold">
                          Free cutoff: {row?.no_fine_deadline ? formatIstDisplay(row.no_fine_deadline) : 'Default'}
                        </div>
                        {kind === 'screening' && row?.link_submission_deadline && (
                          <div className="text-cyan-500 font-semibold mt-0.5">
                            Link deadline: {formatIstDisplay(row.link_submission_deadline)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        <span className="font-bold text-amber-500">₹{row?.fine_amount ?? 500}</span>
                        <div className="text-[10.5px] text-[var(--text-muted)]">
                          until {row?.fine_deadline ? formatIstDisplay(row.fine_deadline) : 'Default'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        {row?.has_super_fine ? (
                          <>
                            <span className="font-bold text-rose-500">₹{row?.super_fine_amount ?? 1000}</span>
                            <div className="text-[10.5px] text-[var(--text-muted)]">
                              until {row?.super_fine_deadline ? formatIstDisplay(row.super_fine_deadline) : 'Default'}
                            </div>
                          </>
                        ) : (
                          <span className="text-[var(--text-muted)] italic">Disabled (No Super Fine)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleKindActive(kind, !isKindActive)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                              isKindActive
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                            }`}
                          >
                            {isKindActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab(kind)}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
