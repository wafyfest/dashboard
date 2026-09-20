'use client';

import React, { useState } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
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
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { StageStatus } from '@/lib/types/fest';

export function StageControllerView() {
  const { triggerRefresh } = useFest();
  const stages = festService.getStages();
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[0]?.id || 'stg-1');

  const allSchedules = festService.getSchedules();
  const currentStage = stages.find(s => s.id === selectedStageId);
  const stageSchedules = allSchedules.filter(s => s.stage_id === selectedStageId);

  // Active schedule selected for management
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    stageSchedules[0]?.id || ''
  );

  const activeSchedule = stageSchedules.find(s => s.id === selectedScheduleId) || stageSchedules[0];
  const registrations = festService.getRegistrations();
  const activeRegistrations = registrations.filter(r => r.item_id === activeSchedule?.item_id);

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
      <div className="bg-[#132238] text-white p-6 rounded-3xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-widest text-emerald-400 font-bold">
                BACKSTAGE TABLET CONSOLE
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                LIVE RELAY
              </span>
            </div>
            <h2 className="text-xl font-black mt-1">Stage Controller & Blind Allotment</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Current Stage: <strong>{currentStage?.name}</strong> ({currentStage?.location})
            </p>
          </div>
        </div>

        {/* Stage Selector Pills */}
        <div className="flex flex-wrap gap-2">
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
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-white text-[#132238] shadow-sm scale-105'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {stage.name.split(':')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Active Stage Status Controls & Blind Judging Code Allotment */}
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
                <div className="text-center py-6 text-slate-400 text-xs">No scheduled events for this stage</div>
              ) : (
                stageSchedules.map(sch => {
                  const isSelected = activeSchedule?.id === sch.id;
                  return (
                    <div
                      key={sch.id}
                      onClick={() => setSelectedScheduleId(sch.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#132238] bg-slate-50 shadow-sm'
                          : 'border-slate-200 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-slate-500 font-bold">{sch.item?.code}</span>
                        <StageStatusBadge status={sch.status} />
                      </div>
                      <h4 className="font-bold text-sm text-[#132238] mt-1">{sch.item?.name}</h4>
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(sch.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
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
                      <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                        No registrations for this event yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeRegistrations.map(reg => (
                      <TableRow key={reg.id}>
                        <TableCell>
                          {reg.code_letter ? (
                            <div className="w-9 h-9 rounded-xl bg-[#132238] text-white flex items-center justify-center font-black text-base shadow-sm">
                              {reg.code_letter}
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-bold text-xs">
                              None
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-[#132238]">{reg.college?.code}</div>
                          <span className="text-[11px] text-slate-500">{reg.college?.name}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-slate-800">
                            {reg.participants?.map(p => `${p.full_name} (${p.chest_no})`).join(', ') || 'No names'}
                          </div>
                          <span className="text-[10px] text-slate-400">
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
                                className={`w-6 h-6 rounded-lg text-xs font-mono font-bold transition-all ${
                                  reg.code_letter === letter
                                    ? 'bg-[#132238] text-white shadow-sm scale-110'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
          <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 border border-slate-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Judging Protocol:</strong> Judges only see <strong>Blind Code Letters (A, B, C...)</strong> on scoring sheets. College names and chest numbers remain strictly masked.
              </span>
            </div>
            <span className="font-mono text-emerald-400 font-bold">Encrypted Allotment</span>
          </div>
        </div>
      </div>
    </div>
  );
}
