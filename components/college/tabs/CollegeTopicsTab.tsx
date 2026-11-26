'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { Badge, CategoryBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Layers,
  Info
} from 'lucide-react';
import { Topic, Item, isTopicOuted, formatStudentCategory } from '@/lib/types/fest';
import { festService } from '@/lib/services/festService';
import { formatIstDisplay } from '@/lib/utils/istDate';
import { useFest } from '@/lib/context/FestContext';

export function CollegeTopicsTab() {
  const { timeTick } = useFest();
  const [topics, setTopics] = useState<Topic[]>(() => festService.getTopics());
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  // Clock tick every 3 seconds to ensure instant release the moment outing_time arrives
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Fetch topics from API or service
  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    try {
      const freshTopics = await festService.fetchAllTopics();
      setTopics(freshTopics);
    } catch (err) {
      console.warn('Failed to fetch topics in college portal:', err);
    } finally {
      if (showIndicator) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, timeTick]);

  // Copy topic text to clipboard
  const handleCopyTopic = (topic: Topic) => {
    const textToCopy = topic.topic || topic.item?.name_eng || `Subject #${topic.item_id}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(topic.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Strictly filter only outed topics: hide === false AND outing_time <= currentTime
  const outedTopics = useMemo(() => {
    return topics.filter(t => isTopicOuted(t, currentTime));
  }, [topics, currentTime]);

  // Unique phases available among outed topics
  const availablePhases = useMemo(() => {
    const set = new Set<string>();
    outedTopics.forEach(t => {
      if (t.item?.phase) {
        set.add(t.item.phase);
      }
    });
    return Array.from(set).sort();
  }, [outedTopics]);

  // Filtered topics based on search and dropdown filters
  const filteredTopics = useMemo(() => {
    return outedTopics.filter(t => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameEng = (t.item?.name_eng || '').toLowerCase();
        const nameMal = (t.item?.name_mal || '').toLowerCase();
        const itemCode = (t.item?.item_code || '').toLowerCase();
        const topicText = (t.topic || '').toLowerCase();
        const phaseText = (t.item?.phase || '').toLowerCase();
        const modeText = (t.item?.mode || '').toLowerCase();
        const matches =
          nameEng.includes(q) ||
          nameMal.includes(q) ||
          itemCode.includes(q) ||
          topicText.includes(q) ||
          phaseText.includes(q) ||
          modeText.includes(q) ||
          String(t.item_id).includes(q);
        if (!matches) return false;
      }

      // Phase filter (strictly filtering by phase)
      if (phaseFilter !== 'all') {
        const p = t.item?.phase || '';
        if (p.toLowerCase() !== phaseFilter.toLowerCase()) return false;
      }

      // Mode filter
      if (modeFilter !== 'all') {
        const mode = (t.item?.mode || '').toLowerCase();
        if (mode !== modeFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [outedTopics, searchQuery, phaseFilter, modeFilter]);

  return (
    <div className="space-y-6">
      {/* College Topics Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)]">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[var(--f-saffron)] shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-heading font-extrabold text-[var(--text-primary)]">
                Competition Topics &amp; Themes
              </h2>
              <Badge variant="saffron" size="sm">
                View Only
              </Badge>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Auto-Release
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">
              Official topics released by the festival committee. Topics automatically appear here the moment their scheduled outing time arrives.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isSyncing}
            className="text-xs"
            title="Refresh Topics"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin text-[var(--f-saffron)]' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search outed topics by subject name, code, or prompt..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Phase Filter */}
            {availablePhases.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Filter className="w-3.5 h-3.5" />
                <span>Phase:</span>
                <select
                  value={phaseFilter}
                  onChange={e => setPhaseFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)]"
                >
                  <option value="all">All Phases ({outedTopics.length})</option>
                  {availablePhases.map(phase => (
                    <option key={phase} value={phase}>
                      {phase}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span>Mode:</span>
              <select
                value={modeFilter}
                onChange={e => setModeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--f-saffron)]"
              >
                <option value="all">All Modes</option>
                <option value="onstage">On-Stage</option>
                <option value="offstage">Off-Stage</option>
                <option value="submission">Submission</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Topics Display Grid */}
      {filteredTopics.length === 0 ? (
        <Card className="p-12 text-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[var(--f-saffron)] flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-heading font-bold text-[var(--text-primary)]">
              {outedTopics.length === 0
                ? 'No Topics Released Yet'
                : 'No Outed Topics Match Your Filter'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
              {outedTopics.length === 0
                ? 'Topics for fest competitions will automatically appear here as soon as their allocated outing time arrives and hide is removed by fest administration. Please check back at the scheduled competition time.'
                : 'Try adjusting your search keywords or resetting your category and mode filters to view available topics.'}
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                <Clock className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
                Live System Clock: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTopics.map(topic => {
            const item = topic.item;
            const isCopied = copiedId === topic.id;

            return (
              <Card
                key={topic.id}
                className="group relative overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl hover:border-[var(--f-saffron)]/40 transition-all duration-300 p-5 flex flex-col justify-between"
              >
                {/* Accent top stripe */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--f-saffron)]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-4">
                  {/* Top badges & Release Timestamp */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                        {item?.item_code || `ITM-${topic.item_id}`}
                      </span>
                      {(item?.phase || item?.category) && (
                        <CategoryBadge category={item.phase || item.category} size="sm" />
                      )}
                      {item?.mode && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
                          {item.mode}
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Released
                    </span>
                  </div>

                  {/* Subject Name */}
                  <div>
                    <h3 className="text-base font-heading font-bold text-[var(--text-primary)]">
                      {item?.name_eng || `Subject ID: ${topic.item_id}`}
                    </h3>
                    {item?.name_mal && (
                      <p className="text-xs text-[var(--text-muted)] font-malayalam mt-0.5">
                        {item.name_mal}
                      </p>
                    )}
                  </div>

                  {/* Topic Box */}
                  <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-heading font-bold text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
                        Official Topic / Theme:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyTopic(topic)}
                        className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        title="Copy Topic"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-sm font-heading font-medium text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      {topic.topic || item?.name_eng || 'Official Competition Theme Released'}
                    </div>
                  </div>
                </div>

                {/* Footer Outing Date */}
                <div className="pt-4 mt-4 border-t border-[var(--border-subtle)]/70 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
                    Outed: {formatIstDisplay(topic.outing_time, { includeTzLabel: false })}
                  </span>
                  <span className="text-[10px]">
                    ..
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
