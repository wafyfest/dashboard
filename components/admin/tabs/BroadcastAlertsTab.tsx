'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BellRing,
  Send,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Building2,
  GraduationCap,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Radio,
  Layers,
  ShieldCheck,
  Clock
} from 'lucide-react';
import {
  Announcement,
  College,
  Student,
  NoticePriority,
  NoticeTargetType
} from '@/lib/types/fest';
import { festService } from '@/lib/services/festService';

interface BroadcastAlertsTabProps {
  colleges: College[];
  students: Student[];
  refreshKey?: number;
  onRefresh?: () => void;
}

export function BroadcastAlertsTab({
  colleges,
  students,
  refreshKey,
  onRefresh
}: BroadcastAlertsTabProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    festService.getAnnouncements()
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Composer Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<NoticePriority>('urgent');
  const [targetType, setTargetType] = useState<NoticeTargetType>('global');
  const [targetRole, setTargetRole] = useState<string>('college');
  const [targetCollegeAffl, setTargetCollegeAffl] = useState<number>(
    colleges[0]?.affl_no || 11
  );
  const [targetChestNo, setTargetChestNo] = useState<string>('');
  const [targetStageId, setTargetStageId] = useState<number>(1);
  const [actionUrl, setActionUrl] = useState<string>('');
  const [actionLabel, setActionLabel] = useState<string>('View Details');
  const [requireAck, setRequireAck] = useState<boolean>(false);

  // Sync announcements
  const syncData = React.useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    const cached = festService.getAnnouncements();
    setAnnouncements(cached);

    try {
      const fresh = await festService.fetchAllAnnouncements();
      if (fresh) setAnnouncements(fresh);
    } finally {
      if (showIndicator) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    syncData();
  }, [refreshKey, syncData]);

  // Handle Form Submit
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please provide both an announcement title and message content.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await festService.createAnnouncement({
        title: title.trim(),
        message: message.trim(),
        priority,
        target_type: targetType,
        target_role: targetType === 'role' ? targetRole : null,
        target_college_affl_no: targetType === 'college' ? targetCollegeAffl : null,
        target_chest_no: targetType === 'student' ? targetChestNo.trim().toUpperCase() : null,
        target_stage_id: targetType === 'stage' ? targetStageId : null,
        action_url: actionUrl.trim() || null,
        action_label: actionLabel.trim() || 'View Details',
        require_ack: requireAck
      });

      if (res.success) {
        // Reset form
        setTitle('');
        setMessage('');
        setActionUrl('');
        setRequireAck(false);
        syncData();
        onRefresh?.();
        alert('⚡ Important News broadcast published live across connected clients!');
      } else {
        alert(res.error || 'Failed to broadcast announcement');
      }
    } catch (err: any) {
      alert(err.message || 'Error publishing broadcast');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete / Revoke
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to stop and delete this broadcast notification? It will disappear from all screens.')) {
      return;
    }

    const res = await festService.deleteAnnouncement(id);
    if (res.success) {
      syncData();
      onRefresh?.();
    } else {
      alert(res.error || 'Failed to delete announcement');
    }
  };

  // Quick Preset Sample Broadcast
  const handlePopulatePreset = (type: 'rain' | 'appeal' | 'stage') => {
    if (type === 'rain') {
      setTitle('Stage Schedule Advisory: Weather Delay');
      setMessage('Due to brief weather disruptions, outdoor events at Stage 3 & 4 are paused for 25 minutes. Reporting times are automatically adjusted by 30 minutes.');
      setPriority('warning');
      setTargetType('global');
      setRequireAck(false);
    } else if (type === 'appeal') {
      setTitle('Official Review: Appeal Verification Required');
      setMessage('Your submitted appeal for Elocution (Item #104) has been accepted for hearing. Please ensure your Team Manager reports to Office Cabin 2 immediately.');
      setPriority('urgent');
      setTargetType('college');
      setTargetCollegeAffl(colleges[0]?.affl_no || 11);
      setActionUrl('/college?tab=appeals');
      setActionLabel('Open Appeals Tab');
      setRequireAck(true);
    } else if (type === 'stage') {
      setTitle('Urgent Call: Stage 1 Reporting');
      setMessage('Please report to Green Room 1 backstage immediately for Code Letter draw and audio mic check.');
      setPriority('urgent');
      setTargetType('student');
      setTargetChestNo(students[0]?.chest_no || 'A-101');
      setRequireAck(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-card">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#132238] dark:bg-[#1A2E4A] text-white flex items-center justify-center shrink-0 shadow-xs border border-[#1E3558] dark:border-[#2E476B]/60">
            <Radio className="w-5 h-5 animate-pulse text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Live Broadcast Console & Important News
              </h3>
              <Badge variant="navy" size="sm">
                Live Bulletin Center
              </Badge>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Realtime Active
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Send instant high-priority popup notifications to all logins, or laser-target a specific college, scholar, or stage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncData(true)}
            disabled={isSyncing}
            className="text-xs"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin text-rose-500' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Live Sync'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Composer Form (Left 7 Cols) */}
        <div className="lg:col-span-7">
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card">
            <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2 font-bold text-[var(--text-primary)]">
                    <Send className="w-4 h-4 text-[#132238] dark:text-slate-300" />
                    Compose Broadcast Bulletin
                  </CardTitle>
                  <CardDescription className="text-xs text-[var(--text-secondary)]">
                    Publishes an immediate popup on screens matching your targeting criteria.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handlePopulatePreset('rain')}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors"
                  >
                    Weather
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePopulatePreset('appeal')}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors"
                  >
                    College Appeal
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePopulatePreset('stage')}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors"
                  >
                    Scholar Call
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleBroadcastSubmit} className="space-y-4">
                {/* 1. Targeting Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                      Target Scope
                    </label>
                    <select
                      value={targetType}
                      onChange={e => setTargetType(e.target.value as NoticeTargetType)}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238] dark:focus:ring-slate-500 font-medium cursor-pointer"
                    >
                      <option value="global">🌐 Global Fest Broadcast (All Logins)</option>
                      <option value="role">👥 Role-Wide (All Colleges, Students, etc.)</option>
                      <option value="college">🏫 Specific College (Single Institution)</option>
                      <option value="student">🎓 Specific Scholar / Student (Chest / CIC)</option>
                      <option value="stage">🎪 Specific Stage (Stage Crew & Items)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as NoticePriority)}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238] dark:focus:ring-slate-500 font-semibold cursor-pointer"
                    >
                      <option value="urgent">🔴 Urgent / Critical (Red Alert)</option>
                      <option value="warning">🟡 Important Warning (Amber Alert)</option>
                      <option value="info">🔵 General Announcement (Indigo/Blue)</option>
                      <option value="success">🟢 Official Update / Success (Green)</option>
                    </select>
                  </div>
                </div>

                {/* Granular Target Value Specifics */}
                {targetType === 'role' && (
                  <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                      Select Target Role
                    </label>
                    <select
                      value={targetRole}
                      onChange={e => setTargetRole(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238]"
                    >
                      <option value="college">All 25 Registered Colleges</option>
                      <option value="student">All Students / Participants</option>
                      <option value="stage_controller">Stage Controllers & Judges</option>
                      <option value="result_entry">Result Entry Officials</option>
                      <option value="convenor">Convenors & Directors</option>
                    </select>
                  </div>
                )}

                {targetType === 'college' && (
                  <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                      Choose Specific Target College
                    </label>
                    <select
                      value={targetCollegeAffl}
                      onChange={e => setTargetCollegeAffl(Number(e.target.value))}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238]"
                    >
                      {colleges.map(c => (
                        <option key={c.affl_no} value={c.affl_no}>
                          #{c.affl_no} — {c.short_name || c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'student' && (
                  <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                      Target Student Chest No or CIC No
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. A-104 or CIC 18050"
                      value={targetChestNo}
                      onChange={e => setTargetChestNo(e.target.value)}
                      required
                      className="w-full text-xs h-9 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-mono focus:outline-none focus:ring-1 focus:ring-[#132238]"
                    />
                  </div>
                )}

                {targetType === 'stage' && (
                  <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                      Target Stage Number
                    </label>
                    <select
                      value={targetStageId}
                      onChange={e => setTargetStageId(Number(e.target.value))}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#132238]"
                    >
                      {[1, 2, 3, 4, 5, 6].map(stg => (
                        <option key={stg} value={stg}>
                          Stage #{stg}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Title & Message */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Bulletin Headline / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Stage 3 Schedule Delay: Rain Alert"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    className="w-full text-xs h-9 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#132238] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Announcement Message Body
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide full directives, revised timings, room numbers, or official instructions..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    className="w-full text-xs p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#132238] leading-relaxed font-sans"
                  />
                </div>

                {/* Action Link & Acknowledgment Requirement */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Action URL (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. /college?tab=appeals"
                      value={actionUrl}
                      onChange={e => setActionUrl(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-[#132238]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Action Button Label
                    </label>
                    <input
                      type="text"
                      placeholder="View Details"
                      value={actionLabel}
                      onChange={e => setActionLabel(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#132238]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="requireAck"
                    checked={requireAck}
                    onChange={e => setRequireAck(e.target.checked)}
                    className="rounded border-[var(--border-medium)] text-[#132238] focus:ring-[#132238]/30 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="requireAck" className="text-xs text-[var(--text-secondary)] cursor-pointer select-none">
                    <strong className="text-[var(--text-primary)]">Mandatory Acknowledgment:</strong> User must click "I Understand" to dismiss (disables clicking outside).
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    size="sm"
                    className="font-semibold text-xs h-9 px-5 rounded-lg shadow-xs flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Broadcasting...' : 'Broadcast Live Now'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Active Broadcasts List (Right 5 Cols) */}
        <div className="lg:col-span-5">
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-[var(--border-subtle)] shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2 font-bold text-[var(--text-primary)]">
                    <BellRing className="w-4 h-4 text-rose-500" />
                    Active Live Bulletins
                  </CardTitle>
                  <CardDescription className="text-xs text-[var(--text-secondary)]">
                    {announcements.length} announcement{announcements.length !== 1 ? 's' : ''} currently broadcasting.
                  </CardDescription>
                </div>
                <Badge variant="default" size="sm">
                  {announcements.length} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px]">
              {announcements.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-muted)]">
                  <Radio className="w-8 h-8 mx-auto mb-2 opacity-35 text-[var(--text-muted)]" />
                  <p className="text-xs font-medium text-[var(--text-secondary)]">No active broadcasts currently running.</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">Use the composer to issue a festival-wide bulletin.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {announcements.map(ann => {
                    const priorityBadgeVariant: 'destructive' | 'warning' | 'secondary' | 'success' = {
                      urgent: 'destructive' as const,
                      warning: 'warning' as const,
                      info: 'secondary' as const,
                      success: 'success' as const
                    }[ann.priority] || 'secondary';

                    return (
                      <div key={ann.id} className="p-4 hover:bg-[var(--bg-hover)] transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={priorityBadgeVariant} size="sm" className="uppercase text-[9px] font-bold">
                                {ann.priority}
                              </Badge>
                              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" />
                                {new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-[var(--text-primary)]">
                              {ann.title}
                            </h4>
                          </div>

                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleDelete(ann.id)}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 p-1.5 h-7 w-7 rounded-lg shrink-0"
                            title="Stop & Delete Broadcast"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                          {ann.message}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                          <div>
                            {ann.target_type === 'global' && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">🌐 All Logins</span>}
                            {ann.target_type === 'college' && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                🏫 College #{ann.target_college_affl_no}
                              </span>
                            )}
                            {ann.target_type === 'student' && (
                              <span className="text-sky-600 dark:text-sky-400 font-mono font-medium">
                                🎓 Scholar: {ann.target_chest_no}
                              </span>
                            )}
                            {ann.target_type === 'stage' && (
                              <span className="text-purple-600 dark:text-purple-400 font-medium">
                                🎪 Stage #{ann.target_stage_id}
                              </span>
                            )}
                            {ann.target_type === 'role' && (
                              <span className="text-[var(--text-secondary)] font-medium uppercase">
                                👥 Role: {ann.target_role}
                              </span>
                            )}
                          </div>
                          {ann.require_ack && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[9px] font-semibold">
                              Must Acknowledge
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
