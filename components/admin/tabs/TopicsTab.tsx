'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { Badge, CategoryBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useThemedAlert } from '@/components/ui';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  RefreshCw,
  Layers,
  Lock,
  Unlock,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Topic, Item, isTopicOuted, formatStudentCategory } from '@/lib/types/fest';
import { festService } from '@/lib/services/festService';
import { formatIstDisplay } from '@/lib/utils/istDate';

interface TopicsTabProps {
  onRefresh?: () => void;
}

export function TopicsTab({ onRefresh }: TopicsTabProps) {
  const { showConfirm } = useThemedAlert();
  const [topics, setTopics] = useState<Topic[]>(() => festService.getTopics());
  const [items, setItems] = useState<Item[]>(() => festService.getItems());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'released' | 'scheduled' | 'hidden'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  // Form State
  const [formItemId, setFormItemId] = useState<string>('');
  const [formOutingTime, setFormOutingTime] = useState<string>('');
  const [formHide, setFormHide] = useState<boolean>(false);
  const [formTopic, setFormTopic] = useState<string>('');
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-updating live clock every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch topics and catalog items
  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    setItems(festService.getItems());
    try {
      const freshTopics = await festService.fetchAllTopics();
      setTopics(freshTopics);
    } catch (err) {
      console.warn('Failed to refresh topics:', err);
    } finally {
      if (showIndicator) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingTopic(null);
    setFormItemId(items.length > 0 ? String(items[0].item_id) : '');
    // Default outing time: current local time rounded to minute
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setFormOutingTime(now.toISOString().slice(0, 16));
    setFormHide(false);
    setFormTopic('');
    setItemSearchQuery('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (topic: Topic) => {
    setEditingTopic(topic);
    setFormItemId(String(topic.item_id));
    // Format to datetime-local format
    try {
      const d = new Date(topic.outing_time);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setFormOutingTime(d.toISOString().slice(0, 16));
    } catch {
      setFormOutingTime('');
    }
    setFormHide(Boolean(topic.hide));
    setFormTopic(topic.topic || '');
    setItemSearchQuery('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Helper for relative time badge
  const getOutingStatus = (topic: Topic) => {
    if (topic.hide) {
      return {
        label: 'Hidden',
        variant: 'destructive' as const,
        icon: EyeOff,
        description: 'Concealed from colleges regardless of time'
      };
    }
    const outing = new Date(topic.outing_time);
    const now = currentTime;
    if (isNaN(outing.getTime())) {
      return {
        label: 'Invalid Time',
        variant: 'outline' as const,
        icon: AlertTriangle,
        description: 'Invalid date/time set'
      };
    }
    if (outing.getTime() <= now.getTime()) {
      return {
        label: 'Released',
        variant: 'success' as const,
        icon: CheckCircle2,
        description: 'Live & visible in college portal'
      };
    }
    // Calculate remaining time
    const diffMs = outing.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const remMins = diffMins % 60;
    const timeText = diffHours > 0 ? `${diffHours}h ${remMins}m` : `${diffMins}m`;
    return {
      label: `Scheduled (in ${timeText})`,
      variant: 'secondary' as const,
      icon: Clock,
      description: `Releases automatically in ${timeText}`
    };
  };

  // Handle Form Submit (Create / Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const itemIdNum = Number(formItemId);
    if (!itemIdNum || Number.isNaN(itemIdNum)) {
      setFormError('Please select a valid subject/event.');
      return;
    }

    if (!formOutingTime) {
      setFormError('Please provide an outing schedule date & time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const outingDate = new Date(formOutingTime);
      if (isNaN(outingDate.getTime())) {
        setFormError('Invalid date/time selected.');
        setIsSubmitting(false);
        return;
      }

      if (editingTopic) {
        // Update existing
        const res = await festService.updateTopic(editingTopic.id, {
          item_id: itemIdNum,
          outing_time: outingDate.toISOString(),
          hide: formHide,
          topic: formTopic.trim() || null
        });

        if (!res.success) {
          setFormError(res.error || 'Failed to update topic');
          return;
        }
      } else {
        // Create new
        const res = await festService.createTopic({
          item_id: itemIdNum,
          outing_time: outingDate.toISOString(),
          hide: formHide,
          topic: formTopic.trim() || null
        });

        if (!res.success) {
          setFormError(res.error || 'Failed to create topic');
          return;
        }
      }

      setIsModalOpen(false);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Toggle Hide
  const handleToggleHide = async (topic: Topic) => {
    const newHide = !topic.hide;
    try {
      const res = await festService.toggleTopicHide(topic.id, newHide);
      if (res.success) {
        await loadData();
        if (onRefresh) onRefresh();
      } else {
        alert(res.error || 'Failed to update topic visibility');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update topic visibility');
    }
  };

  // Delete Topic
  const handleDelete = async (topic: Topic) => {
    const itemName = topic.item?.name_eng || `Subject #${topic.item_id}`;
    const confirmed = await showConfirm({
      title: 'Delete Topic Schedule?',
      message: `Are you sure you want to delete the topic configuration for "${itemName}"? This cannot be undone.`,
      confirmText: 'Delete Topic',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (!confirmed) return;

    try {
      const res = await festService.deleteTopic(topic.id);
      if (res.success) {
        await loadData();
        if (onRefresh) onRefresh();
      } else {
        alert(res.error || 'Failed to delete topic');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete topic');
    }
  };

  // Preset time buttons helper
  const applyPresetTime = (minutesFromNow: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutesFromNow);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setFormOutingTime(d.toISOString().slice(0, 16));
  };

  // Apply tomorrow morning 09:00 AM
  const applyTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setFormOutingTime(d.toISOString().slice(0, 16));
  };

  // Filtered Items for dropdown search
  const filteredEventsForSelect = useMemo(() => {
    if (!itemSearchQuery.trim()) return items;
    const q = itemSearchQuery.toLowerCase();
    return items.filter(it =>
      (it.name_eng || '').toLowerCase().includes(q) ||
      (it.name_mal || '').toLowerCase().includes(q) ||
      (it.item_code || '').toLowerCase().includes(q) ||
      (it.category || '').toLowerCase().includes(q)
    );
  }, [items, itemSearchQuery]);

  // Unique categories for filtering
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(it => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered Topics Table
  const filteredTopics = useMemo(() => {
    return topics.filter(t => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const itemNameEng = (t.item?.name_eng || '').toLowerCase();
        const itemNameMal = (t.item?.name_mal || '').toLowerCase();
        const itemCode = (t.item?.item_code || '').toLowerCase();
        const topicTxt = (t.topic || '').toLowerCase();
        const matches =
          itemNameEng.includes(q) ||
          itemNameMal.includes(q) ||
          itemCode.includes(q) ||
          topicTxt.includes(q) ||
          String(t.item_id).includes(q);
        if (!matches) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        const cat = t.item?.category || '';
        if (cat.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const isOuted = isTopicOuted(t, currentTime);
        if (statusFilter === 'hidden' && !t.hide) return false;
        if (statusFilter === 'released' && (!isOuted || t.hide)) return false;
        if (statusFilter === 'scheduled' && (isOuted || t.hide)) return false;
      }

      return true;
    });
  }, [topics, searchQuery, categoryFilter, statusFilter, currentTime]);

  // Metrics Counts
  const metrics = useMemo(() => {
    let released = 0;
    let scheduled = 0;
    let hidden = 0;
    topics.forEach(t => {
      if (t.hide) {
        hidden++;
      } else if (isTopicOuted(t, currentTime)) {
        released++;
      } else {
        scheduled++;
      }
    });
    return { total: topics.length, released, scheduled, hidden };
  }, [topics, currentTime]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[var(--f-saffron)] shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-heading font-extrabold text-[var(--text-primary)]">
                Subject Topics &amp; Outing Control
              </h2>
              <Badge variant="saffron" size="sm">
                Live Session
              </Badge>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto-Synced (5s)
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">
              Schedule when competition topics are outed to college logins. Topics are automatically released to colleges when their allocated time arrives and hide is disabled.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isSyncing}
            className="text-xs"
            title="Refresh Live Topics"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin text-[var(--f-saffron)]' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Live Sync'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            className="text-xs shadow-md"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add New Topic
          </Button>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Topics */}
        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-heading font-bold uppercase tracking-wider">
              Total Topics
            </span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-[var(--text-primary)] mt-2 font-mono">
            {metrics.total}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Configured festival subjects</p>
        </Card>

        {/* Released Topics */}
        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-heading font-bold uppercase tracking-wider">
              Live &amp; Outed
            </span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {metrics.released}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Visible in college portal</p>
        </Card>

        {/* Scheduled Topics */}
        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-xs font-heading font-bold uppercase tracking-wider">
              Scheduled
            </span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-amber-500 mt-2 font-mono">
            {metrics.scheduled}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Awaiting allocated outing time</p>
        </Card>

        {/* Hidden Topics */}
        <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl">
          <div className="flex items-center justify-between text-rose-500">
            <span className="text-xs font-heading font-bold uppercase tracking-wider">
              Concealed (Hide = true)
            </span>
            <EyeOff className="w-4 h-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-rose-500 mt-2 font-mono">
            {metrics.hidden}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Manually locked by admin</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by subject name, code, or topic..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)]"
              >
                <option value="all">All Statuses ({topics.length})</option>
                <option value="released">Released ({metrics.released})</option>
                <option value="scheduled">Scheduled ({metrics.scheduled})</option>
                <option value="hidden">Hidden ({metrics.hidden})</option>
              </select>
            </div>

            {/* Category Filter */}
            {availableCategories.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <span>Category:</span>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)]"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {formatStudentCategory(cat)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Topics Table */}
      <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-[var(--border-subtle)]/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading font-bold text-base text-[var(--text-primary)]">
                Configured Subject Topics
              </CardTitle>
              <CardDescription className="text-xs text-[var(--text-muted)] font-sans">
                Showing {filteredTopics.length} of {topics.length} subjects
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[750px]">
            <TableHeader className="bg-[var(--bg-subtle)]">
              <TableRow>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)] min-w-[200px]">
                  Subject / Competition
                </TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)] min-w-[200px]">
                  Topic Prompt / Description
                </TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)] min-w-[170px]">
                  Allocated Outing Time
                </TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)] min-w-[130px]">
                  Visibility &amp; Status
                </TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)] text-right min-w-[120px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTopics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-xs text-[var(--text-muted)] italic font-sans">
                    {topics.length === 0
                      ? 'No topics configured yet. Click "+ Add New Topic" above to schedule an event topic.'
                      : 'No topics match the selected search or filter criteria.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTopics.map(topic => {
                  const status = getOutingStatus(topic);
                  const StatusIcon = status.icon;
                  const item = topic.item;

                  return (
                    <TableRow key={topic.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      {/* Subject / Item Details */}
                      <TableCell className="align-top py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                              {item?.item_code || `ITM-${topic.item_id}`}
                            </span>
                            {item?.category && (
                              <CategoryBadge category={item.category} size="sm" />
                            )}
                            {item?.mode && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                {item.mode}
                              </span>
                            )}
                          </div>
                          <div className="font-heading font-semibold text-sm text-[var(--text-primary)]">
                            {item?.name_eng || `Subject ID: ${topic.item_id}`}
                          </div>
                          {item?.name_mal && (
                            <div className="text-xs text-[var(--text-muted)] font-malayalam">
                              {item.name_mal}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Topic Prompt / Content */}
                      <TableCell className="align-top py-3.5">
                        {topic.topic ? (
                          <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-sans whitespace-pre-wrap max-h-24 overflow-y-auto">
                            {topic.topic}
                          </div>
                        ) : (
                          <div className="text-xs text-[var(--text-muted)] italic">
                            No custom text prompt (Subject release mode)
                          </div>
                        )}
                      </TableCell>

                      {/* Allocated Outing Time */}
                      <TableCell className="align-top py-3.5">
                        <div className="space-y-1">
                          <div className="text-xs font-mono font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--f-saffron)] shrink-0" />
                            {formatIstDisplay(topic.outing_time, { includeTzLabel: false })}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {status.description}
                          </div>
                        </div>
                      </TableCell>

                      {/* Live Visibility & Status Badge */}
                      <TableCell className="align-top py-3.5">
                        <div className="space-y-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              topic.hide
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : status.variant === 'success'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>

                          <div>
                            <button
                              type="button"
                              onClick={() => handleToggleHide(topic)}
                              className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
                                topic.hide
                                  ? 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400'
                                  : 'text-[var(--text-muted)] hover:text-rose-500'
                              }`}
                              title={topic.hide ? 'Click to unhide from colleges' : 'Click to hide from colleges'}
                            >
                              {topic.hide ? (
                                <>
                                  <Eye className="w-3 h-3" />
                                  <span>Unhide</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  <span>Set Hide</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="align-top py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(topic)}
                            className="h-8 w-8 p-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            title="Edit Topic"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(topic)}
                            className="h-8 w-8 p-0 text-[var(--text-muted)] hover:text-rose-500"
                            title="Delete Topic"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Topic Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => !isSubmitting && setIsModalOpen(false)}
          title={editingTopic ? 'Edit Topic Configuration' : 'Add New Topic Outing'}
          description="Configure the subject, scheduled release time, and visibility."
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Subject Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-heading font-bold text-[var(--text-primary)]">
                Select Subject / Competition <span className="text-rose-500">*</span>
              </label>

              {/* Subject search bar if many items */}
              {items.length > 8 && (
                <div className="relative mb-1.5">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Filter subjects by code or name..."
                    value={itemSearchQuery}
                    onChange={e => setItemSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)]"
                  />
                </div>
              )}

              <select
                value={formItemId}
                onChange={e => setFormItemId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)]"
              >
                <option value="" disabled>-- Select a Subject --</option>
                {filteredEventsForSelect.map(it => (
                  <option key={it.item_id} value={it.item_id}>
                    [{it.item_code}] {it.name_eng} {it.category ? `(${it.category})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Outing Time Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-heading font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>
                  Allocated Outing Time <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-normal">
                  Local / IST Time
                </span>
              </label>
              <input
                type="datetime-local"
                value={formOutingTime}
                onChange={e => setFormOutingTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] font-mono"
              />

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-[var(--text-muted)]">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPresetTime(0)}
                  className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                >
                  Now
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTime(15)}
                  className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                >
                  +15 Mins
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTime(60)}
                  className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                >
                  +1 Hour
                </button>
                <button
                  type="button"
                  onClick={applyTomorrowMorning}
                  className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                >
                  Tomorrow 9:00 AM
                </button>
              </div>
            </div>

            {/* Hide Toggle */}
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formHide}
                  onChange={e => setFormHide(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--f-saffron)] focus:ring-[var(--f-saffron)] border-[var(--border-subtle)]"
                />
                <span className="text-xs font-heading font-bold text-[var(--text-primary)]">
                  Hide from College Portal (hide = true)
                </span>
              </label>
              <p className="text-[11px] text-[var(--text-muted)] pl-6">
                When enabled, colleges will not be able to see this topic even after the allocated outing time has arrived.
              </p>
            </div>

            {/* Optional Topic Text / Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-heading font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>Topic Title / Prompt (Optional)</span>
                <span className="text-[10px] text-[var(--text-muted)] font-normal">
                  Displayed to participants
                </span>
              </label>
              <textarea
                rows={3}
                placeholder="Enter competition prompt, theme, or instructions (e.g. 'The Role of Modern Technology in Spiritual Well-being')..."
                value={formTopic}
                onChange={e => setFormTopic(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)] font-sans"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : editingTopic ? 'Update Topic' : 'Add Topic'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
