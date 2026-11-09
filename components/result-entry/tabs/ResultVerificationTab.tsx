'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge } from '@/components/ui/badge';
import { FileCheck2, Trophy } from 'lucide-react';
import { Item, Result } from '@/lib/types/fest';

export interface EnrichedParticipant extends Result {
  studentName: string;
  collegeName: string;
  collegeCode: string;
  displayChestNo: string;
}

export interface VerificationItemSummary {
  item_id: number;
  item?: Item;
  is_published: boolean;
  totalPoints: number;
  enrichedParticipants: EnrichedParticipant[];
}

interface ResultVerificationTabProps {
  verificationList: VerificationItemSummary[];
}

export function ResultVerificationTab({ verificationList }: ResultVerificationTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <FileCheck2 className="w-4 h-4 text-[var(--f-saffron-text)]" />
              Result Verification & Audit Standings
            </CardTitle>
            <CardDescription className="text-xs text-[var(--text-secondary)]">
              Review finalized standings with resolved candidate names, college affiliations, and awarded points for each scored event.
            </CardDescription>
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {verificationList.length} Events With Scored Results
          </span>
        </CardHeader>
      </Card>

      {verificationList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-[var(--text-muted)] text-sm">
            No updated results found to verify. Enter scores in the Score Entry tab to audit them here.
          </CardContent>
        </Card>
      ) : (
        verificationList.map(agg => {
          const item = agg.item;

          return (
            <Card key={agg.item_id} className="overflow-hidden">
              <div className="bg-[var(--bg-subtle)] px-6 py-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                    <Trophy className="w-4 h-4 text-[var(--f-saffron-text)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--f-saffron-text)]">
                        {item?.item_code || item?.code}
                      </span>
                      <span className="font-bold text-sm text-[var(--text-primary)] font-heading">
                        {item?.name_eng || item?.name}
                      </span>
                      <CategoryBadge category={item?.phase || item?.category || 'General'} />
                    </div>
                    {item?.name_mal && (
                      <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                        {item.name_mal}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-[var(--f-saffron-text)] bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg">
                    Total {agg.totalPoints} Championship Pts
                  </span>
                  {agg.is_published ? (
                    <Badge variant="success" size="sm" className="font-semibold">
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="amber" size="sm" className="font-semibold">
                      Draft
                    </Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">Rank</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>College / Institution</TableHead>
                      <TableHead>Chest No</TableHead>
                      <TableHead className="text-center">Blind Code</TableHead>
                      <TableHead className="text-center">Mark (%)</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-right">Points Got</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agg.enrichedParticipants.map(p => (
                      <TableRow key={p.id || p.code_letter} className="hover:bg-[var(--bg-hover)]">
                        <TableCell className="text-center">
                          {Number(p.rank) === 1 ? (
                            <Badge variant="amber" size="sm" className="font-bold">
                              🥇 1st
                            </Badge>
                          ) : Number(p.rank) === 2 ? (
                            <Badge variant="outline" size="sm" className="font-bold text-[var(--text-secondary)]">
                              🥈 2nd
                            </Badge>
                          ) : Number(p.rank) === 3 ? (
                            <Badge variant="secondary" size="sm" className="font-bold">
                              🥉 3rd
                            </Badge>
                          ) : (
                            <span className="text-xs font-mono text-[var(--text-muted)]">
                              {p.rank ? `Rank ${p.rank}` : '—'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-xs text-[var(--text-primary)]">
                            {p.studentName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-xs text-[var(--text-primary)]">
                            {p.collegeName}
                          </div>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            {p.collegeCode}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-[var(--text-primary)]">
                          {p.displayChestNo}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[var(--f-saffron-text)] font-mono font-extrabold text-xs">
                            {p.code_letter}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-semibold text-[var(--text-primary)]">
                          {p.mark_percentage}%
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-xs text-[var(--text-primary)]">
                            {p.grade || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono font-extrabold text-xs text-[var(--f-saffron-text)] bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                            {p.points} pts
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
