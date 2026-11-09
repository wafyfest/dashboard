'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Trophy } from 'lucide-react';

interface StudentAllResultsTabProps {
  results: any[];
  leaderboard: Array<{
    college: any;
    points: number;
    gold: number;
    silver: number;
    bronze: number;
  }>;
}

export function StudentAllResultsTab({
  results,
  leaderboard,
}: StudentAllResultsTabProps) {
  const publishedResults = results.filter(r => r.published);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle className="text-base font-heading font-bold text-[var(--text-primary)]">
                Published Event Results
              </CardTitle>
              <CardDescription className="text-xs mt-0.5 font-sans">
                Officially finalized competition rankings & grade points
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-heading font-semibold">Event</TableHead>
                  <TableHead className="font-heading font-semibold">🥇 First Place</TableHead>
                  <TableHead className="font-heading font-semibold">🥈 Second Place</TableHead>
                  <TableHead className="font-heading font-semibold">🥉 Third Place</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publishedResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-[var(--text-muted)] text-xs font-sans">
                      Results will appear here as soon as they are officially ratified.
                    </TableCell>
                  </TableRow>
                ) : (
                  publishedResults.map(res => (
                    <TableRow key={res.id}>
                      <TableCell className="font-heading font-semibold text-[var(--text-primary)]">
                        {res.item?.name}
                      </TableCell>
                      <TableCell>
                        <div className="font-heading font-bold text-amber-700 dark:text-amber-400">
                          {res.first_reg?.college?.code || res.first_reg?.college?.short_name || '-'}
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] font-sans">
                          {res.first_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-heading font-bold text-neutral-700 dark:text-neutral-300">
                          {res.second_reg?.college?.code || res.second_reg?.college?.short_name || '-'}
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] font-sans">
                          {res.second_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ') || ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-heading font-bold text-orange-700 dark:text-orange-400">
                          {res.third_reg?.college?.code || res.third_reg?.college?.short_name || '-'}
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] font-sans">
                          {res.third_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ') || ''}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle className="text-sm font-heading font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[var(--f-saffron)]" />
              <span>College Championship Trophy</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5 font-sans">
              Aggregate leaderboard points table
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-heading font-semibold">Rank & College</TableHead>
                <TableHead className="text-right font-heading font-semibold">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry, idx) => (
                <TableRow key={entry.college.id || idx}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                          idx === 0
                            ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/35'
                            : idx === 1
                            ? 'bg-neutral-500/15 text-neutral-800 dark:text-neutral-200 border border-neutral-500/30'
                            : idx === 2
                            ? 'bg-orange-500/15 text-orange-900 dark:text-orange-300 border border-orange-500/30'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-heading font-bold text-[var(--text-primary)]">
                          {entry.college.code || entry.college.short_name}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[120px] font-sans">
                          {entry.college.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black font-mono text-[var(--text-primary)] text-sm">
                    {entry.points}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

