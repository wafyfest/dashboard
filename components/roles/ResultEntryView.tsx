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
  ShieldAlert
} from 'lucide-react';
import { Item, Registration } from '@/lib/types/fest';

interface ScoreRow {
  code_letter: string;
  reg_id: string;
  criteria_a: number; // e.g. Technique / Skill (Max 40)
  criteria_b: number; // e.g. Presentation / Expression (Max 40)
  criteria_c: number; // e.g. Stage Presence & Time (Max 20)
  total: number;
}

export function ResultEntryView() {
  const { triggerRefresh } = useFest();
  const items = festService.getItems();
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || 'itm-101');

  const selectedItem = items.find(i => i.id === selectedItemId);
  const registrations = festService.getRegistrations().filter(r => r.item_id === selectedItemId);
  const results = festService.getResults();
  const existingResult = results.find(r => r.item_id === selectedItemId);

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
    const itemRegs = festService.getRegistrations().filter(r => r.item_id === itemId);
    const currentRes = festService.getResults().find(r => r.item_id === itemId);

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
                WRITE-ONCE SCORE ENTRY
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#132238] mt-0.5">Fast Tabular Scoring Console</h2>
            <p className="text-xs text-slate-500">
              Enter marks strictly according to anonymous code letters. Submitted marks are write-once locked.
            </p>
          </div>
        </div>

        {/* Event Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Select Event:</span>
          <select
            value={selectedItemId}
            onChange={e => handleItemChange(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#132238]/20 text-[#132238]"
          >
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.code}: {item.name} ({item.category})
              </option>
            ))}
          </select>
        </div>
      </div>

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
  );
}
