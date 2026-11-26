'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AppealStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';

interface ReplacementsTabProps {
  onRefresh?: () => void;
}

export function ReplacementsTab({ onRefresh }: ReplacementsTabProps) {
  const { refreshKey, triggerRefresh } = useFest();
  const replacements = React.useMemo(() => festService.getReplacements(), [refreshKey]);
  const colleges = React.useMemo(() => festService.getColleges(), [refreshKey]);
  const items = React.useMemo(() => festService.getItems(), [refreshKey]);
  const collegeMap = React.useMemo(() => new Map(colleges.map(c => [Number(c.affl_no), c])), [colleges]);
  const itemMap = React.useMemo(() => new Map(items.map(i => [Number(i.item_id || i.id), i])), [items]);

  const handleReview = async (id: string, status: 'Approved' | 'Rejected') => {
    const res = await festService.reviewReplacement(id, status);
    if (!res.success) {
      alert(res.error || `Failed to ${status.toLowerCase()} substitution`);
    } else {
      if (onRefresh) onRefresh();
      else triggerRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-[var(--border-subtle)]/60">
          <div>
            <CardTitle className="font-heading font-bold text-base text-[var(--text-primary)]">
              Participant Replacement Requests
            </CardTitle>
            <CardDescription className="text-xs text-[var(--text-muted)] font-sans">
              Emergency student substitutions (medical reasons, schedule clashes) requiring administrative approval
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader className="bg-[var(--bg-subtle)]">
              <TableRow>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">College</TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Event</TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Original Participant</TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Replacement Student</TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Reason</TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Status</TableHead>
                <TableHead className="text-right font-heading font-bold text-xs text-[var(--text-secondary)]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {replacements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-[var(--text-muted)] font-sans">
                    No replacement requests
                  </TableCell>
                </TableRow>
              ) : (
                replacements.map(rep => {
                  const itm = (rep.registration?.item) || 
                              (rep.registration?.item_id ? itemMap.get(Number(rep.registration.item_id)) : null);
                  const eventCode = itm?.item_code || itm?.code || (rep.registration?.item as any)?.item_code || (rep.registration?.item as any)?.code || '';
                  const eventName = itm?.name_eng || itm?.name || rep.registration?.item?.name || 'Event';

                  const afflNo = rep.registration?.college_affl_no || 
                                 rep.original_student?.college_affl_no || 
                                 rep.replacement_student?.college_affl_no || 
                                 (rep as any).college_affl_no;
                  const college = afflNo ? collegeMap.get(Number(afflNo)) : null;
                  const collegeName = college?.name || (afflNo ? `College #${afflNo}` : '—');
                  const collegePlace = (college as any)?.place || college?.address || '';

                  return (
                    <TableRow key={rep.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <TableCell>
                        <div className="font-heading font-semibold text-[var(--text-primary)] leading-tight">
                          {collegeName}
                        </div>
                        {afflNo && (
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            Affl #{afflNo}{collegePlace ? ` • ${collegePlace}` : ''}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {eventCode && (
                            <span className="font-mono text-amber-500 font-bold text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                              {eventCode}
                            </span>
                          )}
                          <span className="font-heading font-semibold text-[var(--text-primary)]">
                            {eventName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-heading font-medium text-rose-600 dark:text-rose-400">
                          {rep.original_student?.full_name || rep.original_student?.name}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          CIC: {rep.original_student?.cic_no || rep.original_student?.admission_no || rep.original_student?.chest_no || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-heading font-medium text-emerald-600 dark:text-emerald-400">
                          {rep.replacement_student?.full_name || rep.replacement_student?.name}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          CIC: {rep.replacement_student?.cic_no || rep.replacement_student?.admission_no || rep.replacement_student?.chest_no || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)] font-sans">{rep.reason}</TableCell>
                      <TableCell>
                        <AppealStatusBadge status={rep.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {rep.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="xs"
                              variant="success"
                              onClick={() => handleReview(rep.id, 'Approved')}
                            >
                              Approve Substitution
                            </Button>
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() => handleReview(rep.id, 'Rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)] font-sans">Resolved</span>
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
