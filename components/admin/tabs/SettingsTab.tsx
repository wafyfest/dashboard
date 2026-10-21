'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, ItemModeBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Item } from '@/lib/types/fest';
import {
  formatToIstInput,
  parseIstInputToIso,
  formatIstDisplay,
  addHoursToIstInput,
  getDeadlineStatus
} from '@/lib/utils/istDate';
import {
  Calendar,
  Clock,
  BookOpen,
  AlertTriangle,
  Settings,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Layers,
  ArrowRight,
  Info,
  CalendarPlus,
  HelpCircle
} from 'lucide-react';

export function SettingsTab() {
  const { festSettings, refreshKey, triggerRefresh } = useFest();
  const [isPending, startTransition] = useTransition();

  // Toast / Status Message State
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Global Settings Form State (in IST)
  const [globalForm, setGlobalForm] = useState({
    fest_name: festSettings.fest_name,
    reg_deadline_ist: formatToIstInput(festSettings.reg_deadline),
    fine_deadline_ist: formatToIstInput(festSettings.fine_deadline),
    rulebook_url: festSettings.rulebook_url || ''
  });

  const [isSavingGlobal, setIsSavingGlobal] = useState(false);
  const [globalFormDirty, setGlobalFormDirty] = useState(false);

  // Sync form when festSettings changes from context / Realtime
  useEffect(() => {
    setGlobalForm({
      fest_name: festSettings.fest_name,
      reg_deadline_ist: formatToIstInput(festSettings.reg_deadline),
      fine_deadline_ist: formatToIstInput(festSettings.fine_deadline),
      rulebook_url: festSettings.rulebook_url || ''
    });
    setGlobalFormDirty(false);
  }, [festSettings]);

  // Current Live Time in IST
  const [currentIstTime, setCurrentIstTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      setCurrentIstTime(formatIstDisplay(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Items / Events for Per-Event Deadline Extensions
  const items = useMemo(() => {
    return festService.getItems();
  }, [refreshKey]);

  // Per-Event Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'extended' | 'default' | 'onstage' | 'offstage' | 'submission'>('all');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

  // Single Event Extension Modal State
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [eventExtensionForm, setEventExtensionForm] = useState({
    reg_deadline_ist: '',
    fine_deadline_ist: ''
  });
  const [isSavingExtension, setIsSavingExtension] = useState(false);

  // Bulk Extension Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    reg_deadline_ist: '',
    fine_deadline_ist: ''
  });
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Danger Zone Confirmation Modal
  const [dangerModalOpen, setDangerModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Filtered Events
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Phase match
      if (selectedPhase !== 'all' && item.phase !== selectedPhase) return false;

      // Mode / Extension filter match
      const hasCustomExtension = Boolean(item.reg_deadline || item.fine_deadline);
      if (filterMode === 'extended' && !hasCustomExtension) return false;
      if (filterMode === 'default' && hasCustomExtension) return false;
      if (filterMode === 'onstage' && item.mode !== 'onstage') return false;
      if (filterMode === 'offstage' && item.mode !== 'offstage') return false;
      if (filterMode === 'submission' && item.mode !== 'submission') return false;

      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (item.item_code || item.code || '').toLowerCase();
        const eng = (item.name_eng || item.name || '').toLowerCase();
        const mal = (item.name_mal || '').toLowerCase();
        return code.includes(q) || eng.includes(q) || mal.includes(q);
      }

      return true;
    });
  }, [items, filterMode, selectedPhase, searchQuery]);

  // Unique phases for phase filter
  const phases = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.phase) set.add(i.phase);
    });
    return Array.from(set);
  }, [items]);

  // Metrics
  const metrics = useMemo(() => {
    const total = items.length;
    let customCount = 0;
    let openCount = 0;
    let fineCount = 0;
    let closedCount = 0;

    const now = Date.now();

    items.forEach(i => {
      if (i.reg_deadline || i.fine_deadline) customCount++;

      const reg = i.reg_deadline ? new Date(i.reg_deadline).getTime() : new Date(festSettings.reg_deadline).getTime();
      const fine = i.fine_deadline ? new Date(i.fine_deadline).getTime() : new Date(festSettings.fine_deadline).getTime();

      if (now <= reg) openCount++;
      else if (now <= fine) fineCount++;
      else closedCount++;
    });

    return { total, customCount, openCount, fineCount, closedCount };
  }, [items, festSettings]);

  // Global Deadline Validation
  const globalValidation = useMemo(() => {
    if (!globalForm.reg_deadline_ist || !globalForm.fine_deadline_ist) {
      return { isValid: false, error: 'Both regular and fine deadlines are required' };
    }
    const regIso = parseIstInputToIso(globalForm.reg_deadline_ist);
    const fineIso = parseIstInputToIso(globalForm.fine_deadline_ist);

    if (new Date(fineIso).getTime() < new Date(regIso).getTime()) {
      return {
        isValid: false,
        error: 'Fine period deadline cannot be earlier than regular registration deadline'
      };
    }
    return { isValid: true, error: null };
  }, [globalForm.reg_deadline_ist, globalForm.fine_deadline_ist]);

  // Save Global Settings
  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalValidation.isValid) return;

    setIsSavingGlobal(true);
    setToast(null);

    try {
      const regIso = parseIstInputToIso(globalForm.reg_deadline_ist);
      const fineIso = parseIstInputToIso(globalForm.fine_deadline_ist);

      await festService.updateFestSettings({
        fest_name: globalForm.fest_name.trim(),
        reg_deadline: regIso,
        fine_deadline: fineIso,
        rulebook_url: globalForm.rulebook_url.trim() || null
      });

      triggerRefresh();
      setGlobalFormDirty(false);
      setToast({
        type: 'success',
        message: 'Global festival deadlines and configuration successfully saved in IST!'
      });
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      console.error('Failed to update fest settings:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to save fest settings. Please try again.'
      });
    } finally {
      setIsSavingGlobal(false);
    }
  };

  // Open Extension Modal for Single Event
  const handleOpenExtensionModal = (item: Item) => {
    setEditingItem(item);
    setEventExtensionForm({
      reg_deadline_ist: formatToIstInput(item.reg_deadline || festSettings.reg_deadline),
      fine_deadline_ist: formatToIstInput(item.fine_deadline || festSettings.fine_deadline)
    });
    setExtensionModalOpen(true);
  };

  // Save Single Event Extension
  const handleSaveItemExtension = async () => {
    if (!editingItem) return;
    setIsSavingExtension(true);

    try {
      const regIso = eventExtensionForm.reg_deadline_ist
        ? parseIstInputToIso(eventExtensionForm.reg_deadline_ist)
        : null;
      const fineIso = eventExtensionForm.fine_deadline_ist
        ? parseIstInputToIso(eventExtensionForm.fine_deadline_ist)
        : null;

      const res = await festService.updateItemDeadlines(editingItem.item_id, regIso, fineIso);

      if (!res.success) {
        throw new Error(res.error || 'Failed to update event deadline');
      }

      triggerRefresh();
      setExtensionModalOpen(false);
      setToast({
        type: 'success',
        message: `Custom registration deadline extended for ${editingItem.item_code} (${editingItem.name_eng}) in IST.`
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Error updating event deadline' });
    } finally {
      setIsSavingExtension(false);
    }
  };

  // Reset Single Event to Global
  const handleResetItemToGlobal = async (itemId: number, itemCode: string) => {
    try {
      const res = await festService.updateItemDeadlines(itemId, null, null);
      if (!res.success) throw new Error(res.error);
      triggerRefresh();
      setToast({
        type: 'info',
        message: `Reset ${itemCode} to inherit global festival registration deadlines.`
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to reset event deadline' });
    }
  };

  // Bulk Extension Save
  const handleSaveBulkExtension = async () => {
    if (selectedItemIds.length === 0) return;
    setIsSavingBulk(true);

    try {
      const regIso = bulkForm.reg_deadline_ist ? parseIstInputToIso(bulkForm.reg_deadline_ist) : null;
      const fineIso = bulkForm.fine_deadline_ist ? parseIstInputToIso(bulkForm.fine_deadline_ist) : null;

      const res = await festService.batchUpdateItemDeadlines(selectedItemIds, regIso, fineIso);

      if (!res.success) throw new Error(res.error);

      triggerRefresh();
      setBulkModalOpen(false);
      setSelectedItemIds([]);
      setToast({
        type: 'success',
        message: `Successfully updated registration deadlines for ${res.count} events in IST.`
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to batch update event deadlines' });
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Bulk Reset to Global
  const handleResetSelectedToGlobal = async () => {
    if (selectedItemIds.length === 0) return;
    try {
      const res = await festService.resetItemDeadlines(selectedItemIds);
      if (!res.success) throw new Error(res.error);
      triggerRefresh();
      setSelectedItemIds([]);
      setToast({
        type: 'info',
        message: `Reverted ${res.count} selected events to global festival deadlines.`
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to reset events' });
    }
  };

  // Quick Preset Handlers for Global Form
  const applyGlobalQuickPreset = (field: 'reg' | 'fine', hours: number) => {
    setGlobalForm(prev => {
      const targetVal = field === 'reg' ? prev.reg_deadline_ist : prev.fine_deadline_ist;
      const updated = addHoursToIstInput(targetVal, hours);
      return {
        ...prev,
        [field === 'reg' ? 'reg_deadline_ist' : 'fine_deadline_ist']: updated
      };
    });
    setGlobalFormDirty(true);
  };

  // Quick Preset Handlers for Event Form
  const applyEventQuickPreset = (field: 'reg' | 'fine', hours: number) => {
    setEventExtensionForm(prev => {
      const targetVal = field === 'reg' ? prev.reg_deadline_ist : prev.fine_deadline_ist;
      const updated = addHoursToIstInput(targetVal, hours);
      return {
        ...prev,
        [field === 'reg' ? 'reg_deadline_ist' : 'fine_deadline_ist']: updated
      };
    });
  };

  // Select All Checkbox Handler
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItemIds(filteredItems.map(i => i.item_id));
    } else {
      setSelectedItemIds([]);
    }
  };

  const isAllSelected = filteredItems.length > 0 && selectedItemIds.length === filteredItems.length;

  return (
    <div className="space-y-8 max-w-6xl pb-12 font-sans">
      {/* Toast Feedback */}
      {toast && (
        <div
          role="alert"
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-medium shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : toast.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-800 dark:text-sky-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs opacity-70 hover:opacity-100 underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner & IST Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-sky-500/5 to-purple-500/10 border border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Deadlines, Fines & Event Extensions
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Centralized management for registration cutoffs, late fine windows, and per-event time extensions in IST.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-medium)] flex items-center gap-2 shadow-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-right">
              <div className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
                Active Timezone
              </div>
              <div className="text-xs font-mono font-bold text-[var(--text-primary)] flex items-center gap-1">
                <span>🇮🇳 IST (UTC+05:30)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          1. GLOBAL REGISTRATION DEADLINES & BRANDING
      ======================================================== */}
      <Card className="border-[var(--border-subtle)] shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-500" />
                Global Registration Deadlines (Festival-Wide)
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Sets default registration cutoffs for all institutions across all events, unless extended individually below.
              </CardDescription>
            </div>

            {globalFormDirty && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px]">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSaveGlobalSettings} className="space-y-6">
            {/* Global Deadlines Two-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Regular Deadline (Without Fine) */}
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-sky-500/20 hover:border-sky-500/40 transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-sky-500" />
                    Registration Deadline (Without Fine)
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20">
                    Normal Entry
                  </span>
                </div>

                <p className="text-[11px] text-[var(--text-muted)]">
                  Institutions can freely submit participant rosters without penalty until this cutoff date & time.
                </p>

                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      id="global-reg-deadline-input"
                      type="datetime-local"
                      value={globalForm.reg_deadline_ist}
                      onChange={e => {
                        setGlobalForm({ ...globalForm, reg_deadline_ist: e.target.value });
                        setGlobalFormDirty(true);
                      }}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono pt-1">
                    <span>Configured:</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {formatIstDisplay(parseIstInputToIso(globalForm.reg_deadline_ist))}
                    </span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-[var(--text-muted)] font-medium mr-1">Quick Extend:</span>
                  {[
                    { label: '+6 Hours', hours: 6 },
                    { label: '+12 Hours', hours: 12 },
                    { label: '+24h (1 Day)', hours: 24 },
                    { label: '+48h (2 Days)', hours: 48 }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyGlobalQuickPreset('reg', preset.hours)}
                      className="px-2 py-1 text-[10px] rounded-md bg-[var(--bg-subtle)] hover:bg-sky-500/10 hover:text-sky-600 border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fine Period Deadline (With Fine) */}
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-amber-500/20 hover:border-amber-500/40 transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    Late Registration Deadline (With Fine)
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                    Fine Window
                  </span>
                </div>

                <p className="text-[11px] text-[var(--text-muted)]">
                  Late entries are allowed with fine penalty between regular cutoff and this final cutoff.
                </p>

                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      id="global-fine-deadline-input"
                      type="datetime-local"
                      value={globalForm.fine_deadline_ist}
                      onChange={e => {
                        setGlobalForm({ ...globalForm, fine_deadline_ist: e.target.value });
                        setGlobalFormDirty(true);
                      }}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono pt-1">
                    <span>Configured:</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {formatIstDisplay(parseIstInputToIso(globalForm.fine_deadline_ist))}
                    </span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-[var(--text-muted)] font-medium mr-1">Quick Extend:</span>
                  {[
                    { label: '+6 Hours', hours: 6 },
                    { label: '+12 Hours', hours: 12 },
                    { label: '+24h (1 Day)', hours: 24 },
                    { label: '+48h (2 Days)', hours: 48 }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyGlobalQuickPreset('fine', preset.hours)}
                      className="px-2 py-1 text-[10px] rounded-md bg-[var(--bg-subtle)] hover:bg-amber-500/10 hover:text-amber-600 border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Validation Notice */}
            {!globalValidation.isValid && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{globalValidation.error}</span>
              </div>
            )}

            {/* Fest Branding & Rulebook */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)]">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Festival Official Title
                </label>
                <input
                  id="fest-name-input"
                  type="text"
                  value={globalForm.fest_name}
                  onChange={e => {
                    setGlobalForm({ ...globalForm, fest_name: e.target.value });
                    setGlobalFormDirty(true);
                  }}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    Rulebook / Guidelines Document Link
                  </span>
                  {globalForm.rulebook_url && (
                    <a
                      href={globalForm.rulebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-purple-500 hover:underline flex items-center gap-0.5"
                    >
                      Preview <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </label>
                <input
                  id="rulebook-url-input"
                  type="url"
                  value={globalForm.rulebook_url}
                  onChange={e => {
                    setGlobalForm({ ...globalForm, rulebook_url: e.target.value });
                    setGlobalFormDirty(true);
                  }}
                  placeholder="https://drive.google.com/... or https://..."
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-500" />
                Saves automatically to Supabase database in IST timezone
              </div>

              <div className="flex items-center gap-2">
                {globalFormDirty && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setGlobalForm({
                        fest_name: festSettings.fest_name,
                        reg_deadline_ist: formatToIstInput(festSettings.reg_deadline),
                        fine_deadline_ist: formatToIstInput(festSettings.fine_deadline),
                        rulebook_url: festSettings.rulebook_url || ''
                      });
                      setGlobalFormDirty(false);
                    }}
                  >
                    Discard Changes
                  </Button>
                )}
                <Button
                  id="save-global-settings-button"
                  type="submit"
                  size="sm"
                  disabled={isSavingGlobal || !globalValidation.isValid}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {isSavingGlobal ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving Global Deadlines...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Save Global Configuration
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ========================================================
          2. PER-EVENT DEADLINE EXTENSIONS (PRIMARY REQUIREMENT)
      ======================================================== */}
      <Card className="border-[var(--border-subtle)] shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarPlus className="w-4 h-4 text-sky-500" />
                  Per-Event Registration Deadline Extensions
                </CardTitle>
                {metrics.customCount > 0 && (
                  <Badge variant="secondary" className="bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold border-sky-500/30 text-[11px]">
                    {metrics.customCount} Custom Extended
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-1">
                Extend registration time for specific events (e.g. off-stage essays, painting, delayed categories) beyond global festival cutoffs.
              </CardDescription>
            </div>

            {/* Quick Extension Counters */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)]">
                Total: <strong className="text-[var(--text-primary)]">{metrics.total}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Open: <strong>{metrics.openCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                In Fine Window: <strong>{metrics.fineCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                Closed: <strong>{metrics.closedCount}</strong>
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controls: Search, Phase, Mode, Selection Actions */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="event-deadline-search-input"
                  type="text"
                  placeholder="Search by event code, English or Malayalam name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Phase Filter */}
              <select
                id="event-phase-filter-select"
                value={selectedPhase}
                onChange={e => setSelectedPhase(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="all">All Phases</option>
                {phases.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All Events' },
                { id: 'extended', label: `Extended (${metrics.customCount})` },
                { id: 'onstage', label: 'On-Stage' },
                { id: 'offstage', label: 'Off-Stage' },
                { id: 'submission', label: 'Submission' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterMode(tab.id as any)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    filterMode === tab.id
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Selection Action Bar (Visible when events are checked) */}
          {selectedItemIds.length > 0 && (
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between flex-wrap gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span className="text-xs font-bold text-sky-900 dark:text-sky-200">
                  {selectedItemIds.length} event{selectedItemIds.length > 1 ? 's' : ''} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  id="bulk-extend-button"
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setBulkForm({
                      reg_deadline_ist: globalForm.reg_deadline_ist,
                      fine_deadline_ist: globalForm.fine_deadline_ist
                    });
                    setBulkModalOpen(true);
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8"
                >
                  <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                  Extend Deadlines for Selected
                </Button>

                <Button
                  id="bulk-reset-button"
                  size="sm"
                  variant="outline"
                  onClick={handleResetSelectedToGlobal}
                  className="text-xs h-8 text-[var(--text-secondary)] hover:text-rose-600"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset to Global Deadlines
                </Button>
              </div>
            </div>
          )}

          {/* Events Deadline Table */}
          <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-surface)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)]">
                  <TableHead className="w-10 text-center">
                    <input
                      id="select-all-events-checkbox"
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="rounded border-[var(--border-medium)] text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-bold">Event Code & Name</TableHead>
                  <TableHead className="text-xs font-bold">Phase & Mode</TableHead>
                  <TableHead className="text-xs font-bold">Registration Deadline (No Fine)</TableHead>
                  <TableHead className="text-xs font-bold">Late Deadline (With Fine)</TableHead>
                  <TableHead className="text-xs font-bold">Live Status</TableHead>
                  <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-[var(--text-muted)]">
                      No events found matching current filter or search criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map(item => {
                    const isCustom = Boolean(item.reg_deadline || item.fine_deadline);
                    const effectiveReg = item.reg_deadline || festSettings.reg_deadline;
                    const effectiveFine = item.fine_deadline || festSettings.fine_deadline;
                    const deadlineStatus = getDeadlineStatus(effectiveReg, effectiveFine);
                    const isSelected = selectedItemIds.includes(item.item_id);

                    return (
                      <TableRow
                        key={item.item_id}
                        className={`hover:bg-[var(--bg-subtle)]/60 transition-colors ${
                          isSelected ? 'bg-sky-500/5' : ''
                        }`}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedItemIds([...selectedItemIds, item.item_id]);
                              } else {
                                setSelectedItemIds(selectedItemIds.filter(id => id !== item.item_id));
                              }
                            }}
                            className="rounded border-[var(--border-medium)] text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                              {item.item_code || item.code}
                              {isCustom && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                  Extended
                                </span>
                              )}
                            </span>
                            <span className="text-xs font-medium text-[var(--text-primary)]">
                              {item.name_eng || item.name}
                            </span>
                            {item.name_mal && (
                              <span className="text-[11px] text-[var(--text-muted)] font-malayalam">
                                {item.name_mal}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="outline" size="sm" className="text-[10px]">
                              {item.phase}
                            </Badge>
                            <ItemModeBadge mode={item.mode} />
                          </div>
                        </TableCell>

                        {/* Regular Deadline */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-[var(--text-primary)] font-medium">
                              {formatIstDisplay(effectiveReg)}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {item.reg_deadline ? (
                                <span className="text-sky-600 font-medium">⚡ Custom Extended</span>
                              ) : (
                                <span>Default Global</span>
                              )}
                            </span>
                          </div>
                        </TableCell>

                        {/* Fine Deadline */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-[var(--text-primary)] font-medium">
                              {formatIstDisplay(effectiveFine)}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {item.fine_deadline ? (
                                <span className="text-amber-600 font-medium">⚡ Custom Extended</span>
                              ) : (
                                <span>Default Global</span>
                              )}
                            </span>
                          </div>
                        </TableCell>

                        {/* Live Status */}
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${deadlineStatus.badgeClass}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                deadlineStatus.status === 'open'
                                  ? 'bg-emerald-500'
                                  : deadlineStatus.status === 'fine'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            {deadlineStatus.label}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              id={`extend-item-${item.item_id}-btn`}
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenExtensionModal(item)}
                              className="text-xs h-7 px-2.5 font-medium border-[var(--border-subtle)] hover:border-sky-500 hover:text-sky-600"
                            >
                              <CalendarPlus className="w-3 h-3 mr-1" />
                              {isCustom ? 'Adjust' : 'Extend'}
                            </Button>

                            {isCustom && (
                              <Button
                                id={`reset-item-${item.item_id}-btn`}
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetItemToGlobal(item.item_id, item.item_code || item.code || '')}
                                title="Reset to global fest deadline"
                                className="text-xs h-7 w-7 p-0 text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </Button>
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
        </CardContent>
      </Card>

      {/* ========================================================
          3. DANGER ZONE / CACHE MANAGEMENT
      ======================================================== */}
      <Card className="border-rose-500/20 bg-rose-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" size="sm">
              <AlertTriangle className="w-3 h-3 mr-1" /> System Reset & Danger Zone
            </Badge>
          </div>
          <CardTitle className="text-rose-700 dark:text-rose-400 mt-1">System Reset & Cache Management</CardTitle>
          <CardDescription className="text-xs">
            Administrative controls to reset cached festival records and re-fetch clean database state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">Reset Local Database to Defaults</h4>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Clears browser caches and re-initializes colleges, events, and empty registration rosters.
              </p>
            </div>
            <Button
              id="reset-system-state-button"
              variant="outline"
              size="sm"
              className="text-rose-600 border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
              onClick={() => setDangerModalOpen(true)}
            >
              Reset System State
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================
          MODAL: SINGLE EVENT EXTENSION
      ======================================================== */}
      <Modal
        isOpen={extensionModalOpen}
        onClose={() => setExtensionModalOpen(false)}
        title={`Extend Registration Deadline: ${editingItem?.item_code || ''}`}
        description={`${editingItem?.name_eng || ''} (${editingItem?.phase || ''} • ${editingItem?.mode || ''})`}
        maxWidth="lg"
      >
        {editingItem && (
          <div className="space-y-4 font-sans text-xs">
            <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Current Global Default (For Reference):
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px]">Global Normal:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatIstDisplay(festSettings.reg_deadline)}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px]">Global Late (Fine):</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatIstDisplay(festSettings.fine_deadline)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Event Normal Deadline Input */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1 flex items-center justify-between">
                  <span>Extended Registration Deadline (Without Fine)</span>
                  <span className="text-[10px] text-sky-600 font-mono">IST</span>
                </label>
                <input
                  id="event-reg-deadline-modal-input"
                  type="datetime-local"
                  value={eventExtensionForm.reg_deadline_ist}
                  onChange={e =>
                    setEventExtensionForm({ ...eventExtensionForm, reg_deadline_ist: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-[var(--text-muted)]">Presets:</span>
                  {[
                    { label: '+12h', hours: 12 },
                    { label: '+24h (1 Day)', hours: 24 },
                    { label: '+48h (2 Days)', hours: 48 },
                    { label: '+72h (3 Days)', hours: 72 }
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyEventQuickPreset('reg', p.hours)}
                      className="px-2 py-0.5 text-[10px] rounded bg-[var(--bg-subtle)] hover:bg-sky-500/10 hover:text-sky-600 border border-[var(--border-subtle)] cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Fine Deadline Input */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1 flex items-center justify-between">
                  <span>Extended Late Registration Deadline (With Fine)</span>
                  <span className="text-[10px] text-amber-600 font-mono">IST</span>
                </label>
                <input
                  id="event-fine-deadline-modal-input"
                  type="datetime-local"
                  value={eventExtensionForm.fine_deadline_ist}
                  onChange={e =>
                    setEventExtensionForm({ ...eventExtensionForm, fine_deadline_ist: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-[var(--text-muted)]">Presets:</span>
                  {[
                    { label: '+12h', hours: 12 },
                    { label: '+24h (1 Day)', hours: 24 },
                    { label: '+48h (2 Days)', hours: 48 },
                    { label: '+72h (3 Days)', hours: 72 }
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyEventQuickPreset('fine', p.hours)}
                      className="px-2 py-0.5 text-[10px] rounded bg-[var(--bg-subtle)] hover:bg-amber-500/10 hover:text-amber-600 border border-[var(--border-subtle)] cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExtensionModalOpen(false)}
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {(editingItem.reg_deadline || editingItem.fine_deadline) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await handleResetItemToGlobal(editingItem.item_id, editingItem.item_code || '');
                      setExtensionModalOpen(false);
                    }}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  >
                    Reset to Global
                  </Button>
                )}
                <Button
                  id="save-event-extension-btn"
                  size="sm"
                  disabled={isSavingExtension}
                  onClick={handleSaveItemExtension}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                >
                  {isSavingExtension ? 'Saving...' : 'Save Extension (IST)'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================
          MODAL: BULK EVENT EXTENSION
      ======================================================== */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={`Batch Extend Deadlines (${selectedItemIds.length} Events)`}
        description="Set unified registration cutoffs in IST for all currently selected events."
        maxWidth="lg"
      >
        <div className="space-y-4 font-sans text-xs">
          <p className="text-xs text-[var(--text-secondary)]">
            You are extending the registration window for <strong className="text-[var(--text-primary)]">{selectedItemIds.length} events</strong> simultaneously.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Extended Regular Deadline (Without Fine) - IST
              </label>
              <input
                id="bulk-reg-deadline-input"
                type="datetime-local"
                value={bulkForm.reg_deadline_ist}
                onChange={e => setBulkForm({ ...bulkForm, reg_deadline_ist: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Extended Fine Period Deadline (With Fine) - IST
              </label>
              <input
                id="bulk-fine-deadline-input"
                type="datetime-local"
                value={bulkForm.fine_deadline_ist}
                onChange={e => setBulkForm({ ...bulkForm, fine_deadline_ist: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
            <Button variant="ghost" size="sm" onClick={() => setBulkModalOpen(false)}>
              Cancel
            </Button>
            <Button
              id="confirm-bulk-extend-btn"
              size="sm"
              disabled={isSavingBulk || !bulkForm.reg_deadline_ist}
              onClick={handleSaveBulkExtension}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold"
            >
              {isSavingBulk ? 'Applying...' : `Apply Extension to ${selectedItemIds.length} Events`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================
          MODAL: DANGER ZONE RESET CONFIRMATION
      ======================================================== */}
      <Modal
        isOpen={dangerModalOpen}
        onClose={() => setDangerModalOpen(false)}
        title="Reset Local Database State?"
        description="This will clear browser cache and re-initialize from Supabase."
        maxWidth="md"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Caution: Local Cache Reset
            </p>
            <p className="text-[11px] mt-1">
              This action clears all cached local records (fest settings, colleges, items, entry locks) and triggers a fresh synchronization with Supabase.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setDangerModalOpen(false)}>
              Cancel
            </Button>
            <Button
              id="confirm-reset-system-btn"
              variant="destructive"
              size="sm"
              disabled={isResetting}
              onClick={async () => {
                setIsResetting(true);
                await festService.clearCacheAndRefetch();
                triggerRefresh();
                setIsResetting(false);
                setDangerModalOpen(false);
                setToast({
                  type: 'info',
                  message: 'Festival cache reset to clean database state.'
                });
                setTimeout(() => setToast(null), 4000);
              }}
            >
              {isResetting ? 'Resetting...' : 'Confirm Reset'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
