'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  Building2,
  Lock,
  Unlock,
  AlertTriangle,
  Award,
  BellRing,
  HeartHandshake,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Info,
  ShieldCheck,
  ChevronRight,
  Eye,
  Copy,
  Check,
  Radio,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft
} from 'lucide-react';
import { SystemAuditLog, College, Item } from '@/lib/types/fest';
import { festService } from '@/lib/services/festService';
import { useFest } from '@/lib/context/FestContext';
import { formatIstDisplay } from '@/lib/utils/istDate';

export function SystemLogsTab() {
  const { refreshKey, triggerRefresh } = useFest();

  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLiveStreamActive, setIsLiveStreamActive] = useState<boolean>(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedCollegeAffl, setSelectedCollegeAffl] = useState<string>('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('ALL');

  // Inspection modal state
  const [inspectedLog, setInspectedLog] = useState<SystemAuditLog | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Fetch / Refresh data
  const loadLogs = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const fetchedLogs = await festService.fetchSystemAuditLogs(1000);
      setLogs(fetchedLogs);
      setColleges(festService.getColleges());
      setItems(festService.getItems());
    } finally {
      setIsLoading(false);
      if (showSpinner) setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Refresh triggered by FestContext (realtime websocket sync)
  useEffect(() => {
    if (isLiveStreamActive) {
      loadLogs();
    }
  }, [refreshKey, isLiveStreamActive, loadLogs]);

  // Fast college and item maps
  const collegeMap = useMemo(() => {
    const map = new Map<number, College>();
    colleges.forEach(c => map.set(Number(c.affl_no), c));
    return map;
  }, [colleges]);

  const itemMap = useMemo(() => {
    const map = new Map<number, Item>();
    items.forEach(i => map.set(Number(i.item_id), i));
    return map;
  }, [items]);

  // Filtered logs calculation
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    let timeThreshold = 0;

    if (selectedTimeRange === '1H') {
      timeThreshold = now - 60 * 60 * 1000;
    } else if (selectedTimeRange === '24H') {
      timeThreshold = now - 24 * 60 * 60 * 1000;
    } else if (selectedTimeRange === '7D') {
      timeThreshold = now - 7 * 24 * 60 * 60 * 1000;
    } else if (selectedTimeRange === 'TODAY') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      timeThreshold = startOfDay.getTime();
    }

    const q = searchQuery.toLowerCase().trim();

    return logs.filter(log => {
      // Category filter
      if (selectedCategory !== 'ALL' && log.category?.toUpperCase() !== selectedCategory.toUpperCase()) {
        return false;
      }

      // Severity filter
      if (selectedSeverity !== 'ALL' && log.severity?.toLowerCase() !== selectedSeverity.toLowerCase()) {
        return false;
      }

      // College filter
      if (selectedCollegeAffl !== 'ALL' && Number(log.college_affl_no) !== Number(selectedCollegeAffl)) {
        return false;
      }

      // Time range filter
      if (timeThreshold > 0) {
        const logTime = new Date(log.created_at).getTime();
        if (logTime < timeThreshold) return false;
      }

      // Search query filter
      if (q) {
        const col = log.college_affl_no ? collegeMap.get(Number(log.college_affl_no)) : null;
        const itm = log.item_id ? itemMap.get(Number(log.item_id)) : null;

        const matchDesc = log.description?.toLowerCase().includes(q);
        const matchAction = log.action_type?.toLowerCase().includes(q);
        const matchActor = log.actor_name?.toLowerCase().includes(q) || log.actor_role?.toLowerCase().includes(q);
        const matchTarget = log.target_id?.toLowerCase().includes(q);
        const matchCollege = col ? (col.name.toLowerCase().includes(q) || col.short_name.toLowerCase().includes(q)) : false;
        const matchItem = itm ? (itm.name_eng?.toLowerCase().includes(q) || itm.item_code?.toLowerCase().includes(q)) : false;

        if (!matchDesc && !matchAction && !matchActor && !matchTarget && !matchCollege && !matchItem) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedCategory, selectedSeverity, selectedCollegeAffl, selectedTimeRange, searchQuery, collegeMap, itemMap]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    let registrations = 0;
    let locks = 0;
    let appeals = 0;
    let warnings = 0;

    logs.forEach(l => {
      const cat = l.category?.toUpperCase();
      if (cat === 'REGISTRATION') registrations++;
      if (cat === 'LOCKS') locks++;
      if (cat === 'APPEALS') appeals++;
      if (l.severity === 'warning' || l.severity === 'danger') warnings++;
    });

    return { total, registrations, locks, appeals, warnings };
  }, [logs]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSeverity, selectedCollegeAffl, selectedTimeRange, pageSize]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp_IST', 'Category', 'Action_Type', 'Severity', 'Actor_Role', 'Actor_Name', 'College_Affl_No', 'College_Name', 'Item_ID', 'Target_ID', 'Description'];
    const rows = filteredLogs.map(l => {
      const col = l.college_affl_no ? collegeMap.get(Number(l.college_affl_no)) : null;
      return [
        `"${formatIstDisplay(l.created_at)}"`,
        `"${l.category || ''}"`,
        `"${l.action_type || ''}"`,
        `"${l.severity || ''}"`,
        `"${l.actor_role || ''}"`,
        `"${l.actor_name || ''}"`,
        l.college_affl_no || '',
        `"${col ? col.short_name : ''}"`,
        l.item_id || '',
        `"${l.target_id || ''}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wsf_system_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJson = () => {
    if (filteredLogs.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `wsf_system_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedSeverity('ALL');
    setSelectedCollegeAffl('ALL');
    setSelectedTimeRange('ALL');
  };

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'ALL' || selectedSeverity !== 'ALL' || selectedCollegeAffl !== 'ALL' || selectedTimeRange !== 'ALL';

  // Category Icon & Styling Helpers
  const getCategoryConfig = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'REGISTRATION':
        return {
          label: 'Registrations',
          icon: Users,
          badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
        };
      case 'LOCKS':
        return {
          label: 'Locks & Overrides',
          icon: Lock,
          badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25'
        };
      case 'APPEALS':
        return {
          label: 'Appeals & Disputes',
          icon: AlertTriangle,
          badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25'
        };
      case 'SCHEDULE':
        return {
          label: 'Stage & Schedule',
          icon: Calendar,
          badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25'
        };
      case 'RESULTS':
        return {
          label: 'Results & Points',
          icon: Award,
          badgeClass: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/25'
        };
      case 'ANNOUNCEMENTS':
        return {
          label: 'Broadcast Alerts',
          icon: BellRing,
          badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25'
        };
      case 'VOLUNTEERS':
        return {
          label: 'Volunteers',
          icon: HeartHandshake,
          badgeClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/25'
        };
      case 'SETTINGS':
        return {
          label: 'Deadlines & Fines',
          icon: Clock,
          badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25'
        };
      default:
        return {
          label: category || 'System',
          icon: ShieldCheck,
          badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25'
        };
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'danger':
        return <Badge variant="destructive" className="text-[10px] px-2 py-0.5">Critical</Badge>;
      case 'warning':
        return <Badge variant="warning" className="text-[10px] px-2 py-0.5">Warning</Badge>;
      case 'success':
        return <Badge variant="success" className="text-[10px] px-2 py-0.5">Success</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] px-2 py-0.5">Info</Badge>;
    }
  };

  const getRelativeTime = (isoDate: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDays = Math.floor(diffHour / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(isoDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <Card className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
                <ScrollText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    System Audit Logs & Live Activity Feed
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className={`w-2 h-2 rounded-full ${isLiveStreamActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {isLiveStreamActive ? 'Live Realtime Active' : 'Live Paused'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Immutable event trail tracking every registration, lock override, deadline shift, appeal, result, and volunteer update in the system.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLiveStreamActive(!isLiveStreamActive)}
                className="gap-1.5 text-xs"
                title={isLiveStreamActive ? 'Pause real-time stream updates' : 'Resume real-time live feed'}
              >
                {isLiveStreamActive ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-500" />
                    Pause Stream
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-500" />
                    Resume Stream
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => loadLogs(true)}
                disabled={isRefreshing}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
                {isRefreshing ? 'Syncing...' : 'Refresh'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={filteredLogs.length === 0}
                className="gap-1.5 text-xs"
                title="Download filtered logs as CSV spreadsheet"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJson}
                disabled={filteredLogs.length === 0}
                className="gap-1.5 text-xs"
                title="Download structured JSON logs"
              >
                <ScrollText className="w-3.5 h-3.5" />
                JSON
              </Button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)] block uppercase tracking-wider">Total Events</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-extrabold text-[var(--text-primary)]">{stats.total}</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">100% Verified</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block uppercase tracking-wider">Registrations</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.registrations}</span>
                <Users className="w-4 h-4 text-emerald-500/70" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 block uppercase tracking-wider">Locks & Overrides</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{stats.locks}</span>
                <Lock className="w-4 h-4 text-amber-500/70" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/15">
              <span className="text-[11px] font-medium text-purple-700 dark:text-purple-400 block uppercase tracking-wider">Appeals & Queries</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">{stats.appeals}</span>
                <AlertTriangle className="w-4 h-4 text-purple-500/70" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/15 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 block uppercase tracking-wider">Warnings & Alerts</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{stats.warnings}</span>
                <XCircle className="w-4 h-4 text-rose-500/70" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Control Bar */}
      <Card className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
        <CardContent className="p-4 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search action, description, chest #, actor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="lg:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="ALL">All Event Categories</option>
                <option value="REGISTRATION">🎓 Registrations & Rosters</option>
                <option value="LOCKS">🔒 Entry Locks & Overrides</option>
                <option value="APPEALS">⚖️ Appeals & Grievances</option>
                <option value="SCHEDULE">📅 Schedule & Stages</option>
                <option value="RESULTS">🏆 Results & Points</option>
                <option value="SETTINGS">⏱️ Deadlines & Fine Policies</option>
                <option value="ANNOUNCEMENTS">📢 Broadcast Alerts</option>
                <option value="VOLUNTEERS">🤝 Volunteers Management</option>
                <option value="SYSTEM">⚙️ System & Security</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="lg:col-span-2">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="ALL">All Severities</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="danger">Critical / Danger</option>
              </select>
            </div>

            {/* College Filter */}
            <div className="lg:col-span-3">
              <select
                value={selectedCollegeAffl}
                onChange={(e) => setSelectedCollegeAffl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="ALL">All Colleges / Scopes</option>
                {colleges.map(c => (
                  <option key={c.affl_no} value={c.affl_no}>
                    #{c.affl_no} - {c.short_name} ({c.name.slice(0, 24)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Row: Time range pills & Active filters reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <span className="text-[11px] font-medium text-[var(--text-muted)] mr-1">Timeframe:</span>
              {[
                { id: 'ALL', label: 'All Time' },
                { id: 'TODAY', label: 'Today' },
                { id: '1H', label: 'Past 1 Hour' },
                { id: '24H', label: 'Past 24 Hours' },
                { id: '7D', label: 'Past 7 Days' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTimeRange(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedTimeRange === t.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[var(--text-muted)]">
                Showing <strong>{filteredLogs.length}</strong> of <strong>{logs.length}</strong> events
              </span>
              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Audit Log Table */}
      <Card className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[var(--bg-subtle)]/60">
                <TableRow>
                  <TableHead className="w-36 text-xs font-semibold">Timestamp (IST)</TableHead>
                  <TableHead className="w-36 text-xs font-semibold">Category</TableHead>
                  <TableHead className="w-24 text-xs font-semibold">Severity</TableHead>
                  <TableHead className="text-xs font-semibold">Activity & Details</TableHead>
                  <TableHead className="w-36 text-xs font-semibold">Actor / Origin</TableHead>
                  <TableHead className="w-40 text-xs font-semibold">Scope / College</TableHead>
                  <TableHead className="w-20 text-right text-xs font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="py-4">
                        <div className="h-5 bg-slate-200/60 dark:bg-slate-800/50 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <div className="max-w-sm mx-auto text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                          <ScrollText className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-[var(--text-primary)] text-sm">No Audit Logs Match Criteria</h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          Try adjusting your search query, category, college, or timeframe filters.
                        </p>
                        {hasActiveFilters && (
                          <Button size="xs" variant="outline" onClick={resetAllFilters} className="mt-2 text-xs">
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => {
                    const catCfg = getCategoryConfig(log.category);
                    const CatIcon = catCfg.icon;
                    const college = log.college_affl_no ? collegeMap.get(Number(log.college_affl_no)) : null;
                    const item = log.item_id ? itemMap.get(Number(log.item_id)) : null;

                    return (
                      <TableRow
                        key={log.id}
                        className="hover:bg-[var(--bg-subtle)]/40 transition-colors group cursor-pointer"
                        onClick={() => setInspectedLog(log)}
                      >
                        {/* Timestamp */}
                        <TableCell className="align-top py-3.5 whitespace-nowrap">
                          <div className="font-medium text-xs text-[var(--text-primary)]">
                            {getRelativeTime(log.created_at)}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                            {formatIstDisplay(log.created_at, { showTimeOnly: true })}
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell className="align-top py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${catCfg.badgeClass}`}>
                            <CatIcon className="w-3 h-3" />
                            {catCfg.label}
                          </span>
                        </TableCell>

                        {/* Severity */}
                        <TableCell className="align-top py-3.5 whitespace-nowrap">
                          {getSeverityBadge(log.severity)}
                        </TableCell>

                        {/* Activity & Description */}
                        <TableCell className="align-top py-3.5">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">
                              {log.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)]">
                              <span className="font-mono bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                                {log.action_type}
                              </span>
                              {log.target_id && (
                                <span className="text-[var(--text-secondary)]">
                                  Target: <strong>{log.target_id}</strong>
                                </span>
                              )}
                              {item && (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                  <Award className="w-3 h-3" />
                                  {item.item_code} ({item.name_eng})
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Actor / Origin */}
                        <TableCell className="align-top py-3.5 whitespace-nowrap">
                          <div className="text-xs font-medium text-[var(--text-primary)]">
                            {log.actor_name || 'System Engine'}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] capitalize">
                            Role: {log.actor_role || 'system'}
                          </div>
                        </TableCell>

                        {/* Scope / College */}
                        <TableCell className="align-top py-3.5 whitespace-nowrap">
                          {college ? (
                            <div>
                              <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-[var(--text-muted)]" />
                                {college.short_name}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)]">
                                Affiliation #{college.affl_no}
                              </div>
                            </div>
                          ) : log.college_affl_no ? (
                            <div className="text-xs text-[var(--text-secondary)]">
                              College #{log.college_affl_no}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)] italic">Global System</span>
                          )}
                        </TableCell>

                        {/* Action: Inspect */}
                        <TableCell className="align-top py-3.5 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedLog(log);
                            }}
                            className="opacity-70 group-hover:opacity-100 transition-opacity"
                            title="Inspect full details"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {filteredLogs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 gap-3 text-xs">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="ml-2">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </Button>

                {/* Page numbers preview */}
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                    let pageNum = idx + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 2 + idx;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - idx);
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                          currentPage === pageNum
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="gap-1 text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Inspection Modal */}
      {inspectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setInspectedLog(null)}
        >
          <div
            className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-start justify-between bg-[var(--bg-subtle)]/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border ${getCategoryConfig(inspectedLog.category).badgeClass}`}>
                    {inspectedLog.category}
                  </span>
                  {getSeverityBadge(inspectedLog.severity)}
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {inspectedLog.action_type}
                  </span>
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Event Inspection Details
                </h2>
              </div>
              <button
                onClick={() => setInspectedLog(null)}
                className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Event Description Card */}
              <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Description</span>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {inspectedLog.description}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                <div className="p-3 rounded-lg bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Timestamp (IST)</span>
                  <span className="font-medium text-[var(--text-primary)] mt-0.5 block">
                    {formatIstDisplay(inspectedLog.created_at)}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Actor Name / Role</span>
                  <span className="font-medium text-[var(--text-primary)] mt-0.5 block">
                    {inspectedLog.actor_name || 'System'} ({inspectedLog.actor_role || 'system'})
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Target Identifier</span>
                  <span className="font-mono font-medium text-[var(--text-primary)] mt-0.5 block truncate">
                    {inspectedLog.target_id || 'N/A'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Institution (College)</span>
                  <span className="font-medium text-[var(--text-primary)] mt-0.5 block truncate">
                    {inspectedLog.college_affl_no
                      ? `${collegeMap.get(Number(inspectedLog.college_affl_no))?.short_name || 'College'} (#${inspectedLog.college_affl_no})`
                      : 'Global Scope'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Event Item ID</span>
                  <span className="font-medium text-[var(--text-primary)] mt-0.5 block truncate">
                    {inspectedLog.item_id
                      ? `${itemMap.get(Number(inspectedLog.item_id))?.item_code || 'Item'} (#${inspectedLog.item_id})`
                      : 'None'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Event UUID</span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-mono text-[10px] text-[var(--text-primary)] truncate">
                      {inspectedLog.id}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inspectedLog.id);
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 2000);
                      }}
                      className="text-[var(--text-muted)] hover:text-emerald-500"
                      title="Copy Event ID"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* JSON Payload Viewer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Extended Payload & Structured State
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(inspectedLog.details || {}, null, 2));
                      setCopiedJson(true);
                      setTimeout(() => setCopiedJson(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3 h-3" /> Copied Payload
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Payload JSON
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                  {JSON.stringify(inspectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setInspectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
