'use client';

import React, { useState } from 'react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  ClipboardPen,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Trophy,
  ShieldAlert,
  BookOpen,
  FileText,
  Award
} from 'lucide-react';
import { Item, Registration, Result } from '@/lib/types/fest';

export type ResultEntryTab = 'scoring' | 'published' | 'rubrics';

interface ScoreRow {
  code_letter: string;
  reg_id: string;
  criteria_a: number; // e.g. Technique / Skill (Max 40)
  criteria_b: number; // e.g. Presentation / Expression (Max 40)
  criteria_c: number; // e.g. Stage Presence & Time (Max 20)
  total: number;
}

interface ResultEntryViewProps {
  activeTab?: ResultEntryTab;
  onTabChange?: (tab: ResultEntryTab) => void;
}

export function ResultEntryView({ activeTab: controlledTab, onTabChange }: ResultEntryViewProps = {}) {
  const { triggerRefresh } = useFest();
  const items = festService.getItems();
  const [internalTab, setInternalTab] = useState<ResultEntryTab>('scoring');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: ResultEntryTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const [selectedItemId, setSelectedItemId] = useState<string>(items[0] ? String(items[0].item_id || items[0].id) : '101');

  const selectedItem = items.find(i => String(i.item_id) === selectedItemId || i.id === selectedItemId);
  const registrations = festService.getRegistrations().filter(r => String(r.item_id) === selectedItemId);
  const results = festService.getResults();
  const existingResult = results.find(r => String(r.item_id) === selectedItemId);

  // Initialize scoring table from registrations that have code letters assigned
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>(() => {
    return registrations
      .filter(r => !!r.code_letter)
      .map(r => ({
        code_letter: r.code_letter || '',
        reg_id: r.id,
        criteria_a: 30,
        criteria_b: 30,
        criteria_c: 15,
        total: 75
      }));
  });

  // Keep scoreRows in sync when selected item changes
  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const itemRegs = festService.getRegistrations().filter(r => String(r.item_id) === itemId);
    const currentRes = festService.getResults().find(r => String(r.item_id) === itemId);

    if (currentRes && currentRes.scores_breakdown) {
      setScoreRows(
        currentRes.scores_breakdown.map(s => ({
          code_letter: s.code_letter,
          reg_id: s.reg_id || '',
          criteria_a: s.criteria_a,
          criteria_b: s.criteria_b,
          criteria_c: s.criteria_c,
          total: s.total
        }))
      );
    } else {
      setScoreRows(
        itemRegs.map(r => ({
          code_letter: r.code_letter || '?',
          reg_id: r.id,
          criteria_a: 32,
          criteria_b: 30,
          criteria_c: 16,
          total: 78
        }))
      );
    }
  };

  const isLocked = existingResult ? existingResult.published : false;

  const handleScoreChange = (
    index: number,
    field: 'criteria_a' | 'criteria_b' | 'criteria_c',
    val: number
  ) => {
    if (isLocked) return;
    const updated = [...scoreRows];
    updated[index][field] = val;
    updated[index].total =
      (updated[index].criteria_a || 0) +
      (updated[index].criteria_b || 0) +
      (updated[index].criteria_c || 0);
    setScoreRows(updated);
  };

  const handleSubmitScores = () => {
    if (scoreRows.length === 0) {
      alert('No registrations with blind code letters found for this event.');
      return;
    }

    try {
      festService.submitResultEntry(selectedItemId, scoreRows);
      triggerRefresh();
      alert('Tabulation marks successfully locked and submitted to the Chief Tabulation Officer!');
    } catch (err: any) {
      alert(err.message || 'Error submitting scores');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg">
            <ClipboardPen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-widest text-amber-600 font-bold">
                TABULATION DIVISION
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono">
                {activeTab === 'scoring' ? 'WRITE-ONCE SCORE ENTRY' : activeTab === 'published' ? 'FINALIZED STANDINGS' : 'JUDGING RUBRICS'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#132238] mt-0.5">
              {activeTab === 'scoring' ? 'Fast Tabular Scoring Console' : activeTab === 'published' ? 'Finalized & Published Standings' : 'Judging Rubrics & Regulations'}
            </h2>
            <p className="text-xs text-slate-500">
              {activeTab === 'scoring'
                ? 'Enter marks strictly according to anonymous code letters. Submitted marks are write-once locked.'
                : activeTab === 'published'
                ? 'Official results published by the Chief Tabulation Officer. All scores are write-locked.'
                : 'Standard evaluation guidelines, criteria weights, and blind scoring compliance standards.'}
            </p>
          </div>
        </div>

        {/* Event Selector Dropdown (Shown in scoring tab) */}
        {activeTab === 'scoring' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Select Event:</span>
            <select
              value={selectedItemId}
              onChange={e => handleItemChange(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#132238]/20 text-[#132238]"
            >
              {items.map(item => (
                <option key={item.id} value={item.item_id ? String(item.item_id) : item.id}>
                  {item.item_code || item.code}: {item.name_eng || item.name} ({item.phase || item.category})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 1. SCORING TAB */}
      {activeTab === 'scoring' && (
        <div className="space-y-6">
          {/* Lock Notice or Write-Once Alert */}
          {isLocked ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Scores Finalized & Published (Locked)</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    This result has been published to the official board. Any revisions require Fest Admin clearance.
                  </p>
                </div>
              </div>
              <Badge variant="destructive">Write-Protected</Badge>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Blind Judging Protocol Active</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Evaluator score cards are indexed solely by Code Letters (A, B, C...). Institution identities are masked.
                  </p>
                </div>
              </div>
              <Badge variant="warning">Draft Tabulation</Badge>
            </div>
          )}

          {/* Score Entry Table */}
          <Card>
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>{selectedItem?.name}</CardTitle>
                  <span className="font-mono text-xs text-slate-500 font-bold">{selectedItem?.code}</span>
                </div>
                <CardDescription>
                  Criteria: Technique (Max 40) | Expression / Execution (Max 40) | Stage Adherence (Max 20) = 100 Total
                </CardDescription>
              </div>
              {!isLocked && (
                <Button size="sm" onClick={handleSubmitScores}>
                  <Send className="w-3.5 h-3.5" /> Submit & Lock Tabulation
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Blind Code</TableHead>
                    <TableHead>Criteria 1: Technique (40)</TableHead>
                    <TableHead>Criteria 2: Expression (40)</TableHead>
                    <TableHead>Criteria 3: Stage Adherence (20)</TableHead>
                    <TableHead>Total Score (/100)</TableHead>
                    <TableHead className="text-right">Projected Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoreRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        No participants or blind codes allocated yet by Stage Controller.
                      </TableCell>
                    </TableRow>
                  ) : (
                    scoreRows
                      .slice()
                      .sort((a, b) => b.total - a.total)
                      .map((row, index) => {
                        const originalIndex = scoreRows.findIndex(r => r.code_letter === row.code_letter);

                        return (
                          <TableRow key={row.code_letter}>
                            <TableCell>
                              <div className="w-9 h-9 rounded-xl bg-[#132238] text-white flex items-center justify-center font-black text-base shadow-sm">
                                {row.code_letter}
                              </div>
                            </TableCell>
                            <TableCell>
                              <input
                                type="number"
                                min={0}
                                max={40}
                                disabled={isLocked}
                                value={row.criteria_a}
                                onChange={e =>
                                  handleScoreChange(originalIndex, 'criteria_a', parseInt(e.target.value) || 0)
                                }
                                className="w-24 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#132238]/20 disabled:bg-slate-100"
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                type="number"
                                min={0}
                                max={40}
                                disabled={isLocked}
                                value={row.criteria_b}
                                onChange={e =>
                                  handleScoreChange(originalIndex, 'criteria_b', parseInt(e.target.value) || 0)
                                }
                                className="w-24 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#132238]/20 disabled:bg-slate-100"
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                type="number"
                                min={0}
                                max={20}
                                disabled={isLocked}
                                value={row.criteria_c}
                                onChange={e =>
                                  handleScoreChange(originalIndex, 'criteria_c', parseInt(e.target.value) || 0)
                                }
                                className="w-24 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#132238]/20 disabled:bg-slate-100"
                              />
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-base font-black text-[#132238]">
                                {row.total}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">/ 100</span>
                            </TableCell>
                            <TableCell className="text-right">
                              {index === 0 ? (
                                <Badge variant="amber" className="font-bold">
                                  🥇 1st Place (5 pts)
                                </Badge>
                              ) : index === 1 ? (
                                <Badge variant="default" className="font-bold">
                                  🥈 2nd Place (3 pts)
                                </Badge>
                              ) : index === 2 ? (
                                <Badge variant="secondary" className="font-bold">
                                  🥉 3rd Place (1 pt)
                                </Badge>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs">Rank {index + 1}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. PUBLISHED RESULTS TAB */}
      {activeTab === 'published' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Official Published Results Registry</CardTitle>
                <CardDescription>
                  Write-locked scores and verified rank standings ready for the public leaderboard
                </CardDescription>
              </div>
              <Badge variant="navy">
                <Lock className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                {results.filter(r => r.published).length} Published / {results.length} Total
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Code & Name</TableHead>
                    <TableHead>1st Place (5 Pts)</TableHead>
                    <TableHead>2nd Place (3 Pts)</TableHead>
                    <TableHead>3rd Place (1 Pt)</TableHead>
                    <TableHead>Lock Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                        No results entered or published yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map(res => (
                      <TableRow key={res.id}>
                        <TableCell>
                          <div className="font-mono text-xs font-bold text-slate-500">{res.item?.code}</div>
                          <div className="font-bold text-sm text-[#132238]">{res.item?.name}</div>
                          <span className="text-[11px] text-slate-500">{res.item?.category}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-emerald-700">
                            {res.first_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ') || '—'}
                          </div>
                          <span className="text-xs text-slate-500">
                            {res.first_reg?.college?.name || res.first_reg?.college?.code || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-800">
                            {res.second_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ') || '—'}
                          </div>
                          <span className="text-xs text-slate-500">
                            {res.second_reg?.college?.name || res.second_reg?.college?.code || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-800">
                            {res.third_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ') || '—'}
                          </div>
                          <span className="text-xs text-slate-500">
                            {res.third_reg?.college?.name || res.third_reg?.college?.code || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {res.published ? (
                            <Badge variant="success">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Published
                            </Badge>
                          ) : (
                            <Badge variant="warning">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Pending Publish
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedItemId(String(res.item_id));
                              setActiveTab('scoring');
                            }}
                          >
                            Inspect Scores
                          </Button>
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

      {/* 3. RUBRICS & RULES TAB */}
      {activeTab === 'rubrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-blue-50/50 border-blue-200/70">
              <div className="w-10 h-10 rounded-xl bg-[#132238] text-white flex items-center justify-center font-bold mb-4">
                40%
              </div>
              <h3 className="font-bold text-[#132238] text-base">Criteria 1: Technique & Core Skill</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Evaluates foundational artistry, technical execution, rhythm, vocal precision, syntax, and mastery of the designated art form. Max 40 points.
              </p>
            </Card>

            <Card className="p-6 bg-indigo-50/50 border-indigo-200/70">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold mb-4">
                40%
              </div>
              <h3 className="font-bold text-[#132238] text-base">Criteria 2: Expression & Presentation</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Evaluates emotional depth, interpretive creativity, body language, facial expression, modulation, and audience engagement. Max 40 points.
              </p>
            </Card>

            <Card className="p-6 bg-emerald-50/50 border-emerald-200/70">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold mb-4">
                20%
              </div>
              <h3 className="font-bold text-[#132238] text-base">Criteria 3: Adherence & Timing</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Evaluates strict adherence to festival guidelines, stage discipline, costume decorum, and compliance with the allocated time limit. Max 20 points.
              </p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Tabulation & Fair Judging Charter</CardTitle>
                <CardDescription>Rules enforced automatically by the festival system</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-slate-700">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Strict Blind Judging Security</h4>
                  <p className="mt-1 leading-relaxed">
                    Evaluators and tabulation operators only record marks against randomly generated Code Letters (A, B, C...). Institution identities, college codes, and participant chest numbers are fully masked in this portal to prevent any unconscious bias.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Write-Once Cryptographic Locking</h4>
                  <p className="mt-1 leading-relaxed">
                    Once tabulation scores are submitted, they enter a write-protected state. Any post-submission dispute or correction requires an official Appeal filed by the College Coordinator and signed off by the Executive Festival Admin.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Championship Points Allotment</h4>
                  <p className="mt-1 leading-relaxed">
                    Points are automatically credited to the college championship tally upon result publishing: 1st Place = 5 points, 2nd Place = 3 points, 3rd Place = 1 point.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
