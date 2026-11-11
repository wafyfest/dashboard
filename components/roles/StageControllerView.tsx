'use client';

import React, { useState } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { getCanonicalChestNo } from '@/lib/utils/studentIdentity';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Badge, StageStatusBadge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Radio,
  Shuffle,
  Clock,
  Play,
  CheckCircle2,
  Users,
  AlertCircle,
  Calendar,
  Award
} from 'lucide-react';
import { StageStatus, isScreeningEvent } from '@/lib/types/fest';
import { TilePattern } from '@/components/fest/FestPattern';

export type StageControllerTab = 'relay' | 'blind_allotment' | 'all_schedules';

interface StageControllerViewProps {
  activeTab?: StageControllerTab;
  onTabChange?: (tab: StageControllerTab) => void;
}

export function StageControllerView({ activeTab: controlledTab, onTabChange }: StageControllerViewProps = {}) {
  const { triggerRefresh } = useFest();
  const stages = festService.getStages();
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[0]?.id || 'stg-1');
  const [internalTab, setInternalTab] = useState<StageControllerTab>('relay');

  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: StageControllerTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const allSchedules = festService.getSchedules();
  const currentStage = stages.find(s => s.id === selectedStageId || s.stage_number === Number(selectedStageId));
  const stageSchedules = allSchedules.filter(s =>
    s.stage_id === selectedStageId ||
    (currentStage && s.stage_number === currentStage.stage_number)
  );

  // Active schedule selected for management
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    stageSchedules[0]?.id || ''
  );

  const activeSchedule = stageSchedules.find(s => s.id === selectedScheduleId) || stageSchedules[0];
  const registrations = festService.getRegistrations();
  const activeRegistrations = registrations.filter(
    r =>
      r.item_id === activeSchedule?.item_id &&
      (!isScreeningEvent(activeSchedule?.item) || r.screening_status === 'qualified')
  );

  // Quick Blind Code auto-generator (assigns A, B, C, D... randomly or sequentially)
  const handleAutoAllotCodes = () => {
    if (!activeRegistrations.length) return;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const shuffledLetters = [...letters.slice(0, activeRegistrations.length)].sort(
      () => Math.random() - 0.5
    );

    activeRegistrations.forEach((reg, idx) => {
      festService.assignCodeLetter(reg.id, shuffledLetters[idx]);
    });
    triggerRefresh();
    alert(`Randomized blind judging codes (A-${shuffledLetters[activeRegistrations.length - 1]}) assigned!`);
  };

  const handleUpdateStatus = (status: StageStatus) => {
    if (!activeSchedule) return;
    festService.updateScheduleStatus(activeSchedule.id, status);
    triggerRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Tablet Backstage Header */}
      <div className="relative overflow-hidden bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <TilePattern id="backstage-tablet-pattern" className="opacity-10 text-[var(--f-saffron)]" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-widest text-[var(--f-saffron-text)] font-bold">
                BACKSTAGE TABLET CONSOLE
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-[var(--f-saffron-text)] text-[10px] font-mono border border-amber-500/30">
                {activeTab === 'relay' ? 'LIVE RELAY' : activeTab === 'blind_allotment' ? 'BLIND ALLOTMENT' : 'AUDITORIUM SCHEDULES'}
              </span>
            </div>
            <h2 className="text-xl font-heading font-black text-[var(--text-primary)] mt-1">Stage Controller & Blind Allotment</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Active Stage: <strong className="text-[var(--text-primary)]">{currentStage?.name}</strong> ({currentStage?.location})
            </p>
          </div>
        </div>

        {/* Stage Selector Pills */}
        <div className="flex flex-wrap gap-2 relative z-10">
          {stages.map(stage => {
            const isSelected = stage.id === selectedStageId;
            return (
              <button
                key={stage.id}
                onClick={() => {
                  setSelectedStageId(stage.id);
                  const matching = allSchedules.filter(s => s.stage_id === stage.id);
                  if (matching.length) setSelectedScheduleId(matching[0].id);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${isSelected
                    ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-md shadow-amber-500/20 scale-105'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]'
                  }`}
              >
                {stage.name.split(':')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. RELAY VIEW: Backstage Tablet & Queue */}
      {activeTab === 'relay' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Stage Items Queue & Status Changers */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Stage Queue</CardTitle>
                  <CardDescription>Select event to manage live state</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {stageSchedules.length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-muted)] text-xs">No scheduled events for this stage</div>
                ) : (
                  stageSchedules.map(sch => {
                    const isSelected = activeSchedule?.id === sch.id;
                    return (
                      <div
                        key={sch.id}
                        onClick={() => setSelectedScheduleId(sch.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                            ? 'border-[var(--f-saffron)] bg-amber-500/10 shadow-xs ring-1 ring-amber-500/40'
                            : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-[var(--text-muted)] font-bold">{sch.item?.code}</span>
                          <StageStatusBadge status={sch.status} />
                        </div>
                        <h4 className="font-bold text-sm text-[var(--text-primary)] mt-1 font-heading">{sch.item?.name}</h4>
                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mt-2">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>{sch.item?.item_type} ({sch.item?.category})</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Quick Stage Status Updater for Selected Item */}
            {activeSchedule && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Change Stage Status</CardTitle>
                    <CardDescription>Instant broadcast to public screens</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant={activeSchedule.status === 'Next_Item' ? 'primary' : 'outline'}
                      onClick={() => handleUpdateStatus('Next_Item')}
                    >
                      Next in Queue
                    </Button>
                    <Button
                      size="sm"
                      variant={activeSchedule.status === 'Starting_Soon' ? 'primary' : 'outline'}
                      onClick={() => handleUpdateStatus('Starting_Soon')}
                    >
                      Starting Soon
                    </Button>
                    <Button
                      size="sm"
                      variant={activeSchedule.status === 'On_Going' ? 'success' : 'outline'}
                      className={activeSchedule.status === 'On_Going' ? 'ring-2 ring-emerald-500 animate-pulse' : ''}
                      onClick={() => handleUpdateStatus('On_Going')}
                    >
                      <Play className="w-3.5 h-3.5 mr-1" /> ON STAGE (LIVE)
                    </Button>
                    <Button
                      size="sm"
                      variant={activeSchedule.status === 'Ended' ? 'secondary' : 'outline'}
                      onClick={() => handleUpdateStatus('Ended')}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Ended
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Columns (2 cols): Blind Judging Allotment & Call Sheet */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>Blind Judging Code Allotment</CardTitle>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-[var(--f-saffron-text)] text-[10px] font-bold border border-amber-500/30">
                      FAIR JUDGING SYSTEM
                    </span>
                  </div>
                  <CardDescription>
                    Assign anonymous single-letter codes (A, B, C...) to conceal institution identity from evaluators
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleAutoAllotCodes}>
                  <Shuffle className="w-3.5 h-3.5" /> Randomize & Allot
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Blind Code</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Participant(s) on Call Sheet</TableHead>
                      <TableHead className="text-right">Assign / Edit Code</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeRegistrations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-[var(--text-muted)]">
                          No registrations for this event yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeRegistrations.map(reg => (
                        <TableRow key={reg.id}>
                          <TableCell>
                            {reg.code_letter ? (
                              <div className="w-9 h-9 rounded-xl bg-[var(--f-saffron)] text-[#090d1a] flex items-center justify-center font-black text-base shadow-xs font-mono">
                                {reg.code_letter}
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-[var(--f-saffron-text)] border border-amber-500/30 flex items-center justify-center font-bold text-xs">
                                None
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-[var(--text-primary)]">{reg.college?.code}</div>
                            <span className="text-[11px] text-[var(--text-muted)]">{reg.college?.name}</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-semibold text-[var(--text-primary)]">
                              {reg.participants?.map(p => `${p.full_name || p.name} (${getCanonicalChestNo(p)})`).join(', ') || 'No names'}
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {reg.participants?.length} participant(s) verified
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1 justify-end">
                              {['A', 'B', 'C', 'D', 'E', 'F'].map(letter => (
                                <button
                                  key={letter}
                                  onClick={() => {
                                    festService.assignCodeLetter(reg.id, letter);
                                    triggerRefresh();
                                  }}
                                  className={`w-6 h-6 rounded-lg text-xs font-mono font-bold transition-all ${reg.code_letter === letter
                                      ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs scale-110'
                                      : 'bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                                    }`}
                                >
                                  {letter}
                                </button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Blind Code Handout Card for Tabulation Officer */}
            <div className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded-xl p-4 border border-[var(--border-subtle)] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-[var(--f-saffron-text)] shrink-0" />
                <span>
                  <strong>Judging Protocol:</strong> Judges only see <strong>Blind Code Letters (A, B, C...)</strong> on scoring sheets. College names and chest numbers remain strictly masked.
                </span>
              </div>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Encrypted Allotment</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. BLIND ALLOTMENT DEDICATED VIEW */}
      {activeTab === 'blind_allotment' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Blind Judging Code Allotment Console</CardTitle>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                    Active Event: {activeSchedule?.item?.name} ({activeSchedule?.item?.code})
                  </span>
                </div>
                <CardDescription>
                  Generate or manually adjust anonymous single-letter codes (A, B, C, D...) before stage call.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedScheduleId}
                  onChange={e => setSelectedScheduleId(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500/20"
                >
                  {stageSchedules.map(sch => (
                    <option key={sch.id} value={sch.id}>
                      {sch.item?.code} - {sch.item?.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={handleAutoAllotCodes}>
                  <Shuffle className="w-3.5 h-3.5 mr-1" /> Randomize & Allot
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Blind Code</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Participant(s) & Chest Numbers</TableHead>
                    <TableHead className="text-right">Code Letter Assignment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeRegistrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-[var(--text-muted)]">
                        No registrations for this event yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeRegistrations.map(reg => (
                      <TableRow key={reg.id}>
                        <TableCell>
                          {reg.code_letter ? (
                            <div className="w-10 h-10 rounded-xl bg-[var(--f-saffron)] text-[#090d1a] flex items-center justify-center font-black text-lg shadow-xs font-mono">
                              {reg.code_letter}
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-[var(--f-saffron-text)] border border-amber-500/30 flex items-center justify-center font-bold text-xs">
                              Unset
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-[var(--text-primary)]">{reg.college?.code}</div>
                          <span className="text-xs text-[var(--text-muted)]">{reg.college?.name}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-[var(--text-primary)]">
                            {reg.participants?.map(p => `${p.full_name || p.name} (${getCanonicalChestNo(p)})`).join(', ') || 'No names'}
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {reg.participants?.length} participant(s) verified
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(letter => (
                              <button
                                key={letter}
                                onClick={() => {
                                  festService.assignCodeLetter(reg.id, letter);
                                  triggerRefresh();
                                }}
                                className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${reg.code_letter === letter
                                    ? 'bg-[var(--f-saffron)] text-[#090d1a] shadow-xs scale-110'
                                    : 'bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                                  }`}
                              >
                                {letter}
                              </button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. ALL STAGE SCHEDULES TIMELINE VIEW */}
      {activeTab === 'all_schedules' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Fest Auditorium & Stage Schedules</CardTitle>
                <CardDescription>
                  Complete timeline across all venues and live event statuses
                </CardDescription>
              </div>
              <Badge variant="navy">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                {allSchedules.length} Total Scheduled Events
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage / Venue</TableHead>
                    <TableHead>Event Code & Name</TableHead>
                    <TableHead>Category & Type</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Live Stage Status</TableHead>
                    <TableHead className="text-right">Quick Control</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSchedules.map(sch => {
                    const stage = stages.find(s => s.id === sch.stage_id || s.stage_number === sch.stage_number);
                    const isCurrentStage = sch.stage_id === selectedStageId || sch.stage_number === currentStage?.stage_number;

                    return (
                      <TableRow key={sch.id} className={isCurrentStage ? 'bg-amber-500/5' : ''}>
                        <TableCell>
                          <div className="font-bold text-[var(--text-primary)]">{stage?.name}</div>
                          <span className="text-[11px] text-[var(--text-muted)]">{stage?.location}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs font-bold text-[var(--text-muted)]">{sch.item?.code}</div>
                          <div className="font-bold text-sm text-[var(--text-primary)] font-heading">{sch.item?.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {sch.item?.category}
                          </Badge>
                          <span className="text-xs text-[var(--text-muted)] ml-1.5">{sch.item?.item_type}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 font-mono text-xs text-[var(--text-secondary)]">
                            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            {new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StageStatusBadge status={sch.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (sch.stage_id) setSelectedStageId(sch.stage_id);
                              setSelectedScheduleId(sch.id);
                              setActiveTab('relay');
                            }}
                          >
                            Manage Live
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
