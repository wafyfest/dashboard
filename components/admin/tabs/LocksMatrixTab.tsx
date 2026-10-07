'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Lock, Unlock } from 'lucide-react';

export function LocksMatrixTab() {
  const { triggerRefresh } = useFest();
  const colleges = festService.getColleges();
  const items = festService.getItems();
  const locks = festService.getEntryLocks();

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Entry Locks Matrix</CardTitle>
            <Badge variant="navy">2D Permissions Grid</Badge>
          </div>
          <CardDescription>
            Header columns: College Affiliation IDs. First column: Event Details & Row Toggle. Click any cell to open or close registration.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="outline"
            className="text-emerald-400 border-emerald-600 hover:bg-emerald-900/50 hover:text-emerald-300"
            onClick={() => {
              festService.setAllEntryLocks(true);
              triggerRefresh();
            }}
          >
            <Unlock className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Open All
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="text-rose-400 border-rose-600 hover:bg-rose-900/50 hover:text-rose-300"
            onClick={() => {
              festService.setAllEntryLocks(false);
              triggerRefresh();
            }}
          >
            <Lock className="w-3.5 h-3.5 mr-1 text-rose-400" /> Lock All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-80 min-w-[280px] font-semibold">
                Item ID & Event Name
              </TableHead>
              {colleges.map(col => (
                <TableHead key={col.id} className="text-center min-w-[130px] font-semibold">
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      #{col.affl_no}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] truncate max-w-[120px] mt-0.5" title={col.name}>
                      {col.short_name || col.code || col.name}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => {
              const itemCells = colleges.map(col => {
                const cell = locks.find(l => l.item_id === item.item_id && l.college_affl_no === col.affl_no);
                return cell ? cell.is_open : !item.is_locked;
              });
              const allOpen = itemCells.every(open => open);

              return (
                <TableRow key={item.id}>
                  {/* First Column: Item ID, Event Name & Row Lock Toggle */}
                  <TableCell className="font-medium">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            {item.item_id ? String(item.item_id).padStart(2, '0') : item.code}
                          </span>
                          <span className="font-semibold text-sm text-[var(--text-primary)]">
                            {item.name_eng || item.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{item.phase || item.category}</span>
                          <span>•</span>
                          <span className="font-mono">{item.mode}</span>
                          {item.name_mal && (
                            <>
                              <span>•</span>
                              <span className="text-slate-400">{item.name_mal}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Row Lock Toggle Button */}
                      <button
                        type="button"
                        title={allOpen ? 'Lock row for all colleges' : 'Open row for all colleges'}
                        onClick={() => {
                          festService.setEntryLockRow(item.item_id, !allOpen);
                          triggerRefresh();
                        }}
                        className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors ${allOpen
                          ? 'bg-[#1A2638] text-slate-200 border-[#26303F] hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/80'
                          : 'bg-rose-950/40 text-rose-300 border-rose-800/80 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-800/80'
                          }`}
                      >
                        {allOpen ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[10px]">Open</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-rose-600" />
                            <span className="text-[10px]">Locked</span>
                          </>
                        )}
                      </button>
                    </div>
                  </TableCell>

                  {/* College Cells */}
                  {colleges.map(col => {
                    const cell = locks.find(l => l.item_id === item.item_id && l.college_affl_no === col.affl_no);
                    const isOpen = cell ? cell.is_open : !item.is_locked;

                    return (
                      <TableCell key={col.id} className="text-center p-2">
                        <button
                          type="button"
                          onClick={() => {
                            festService.setEntryLockCell(item.item_id, col.affl_no, !isOpen);
                            triggerRefresh();
                          }}
                          className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs border ${isOpen
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                        >
                          {isOpen ? (
                            <>
                              <Unlock className="w-3 h-3 text-emerald-600" />
                              <span>Open</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-rose-600" />
                              <span>Closed</span>
                            </>
                          )}
                        </button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
