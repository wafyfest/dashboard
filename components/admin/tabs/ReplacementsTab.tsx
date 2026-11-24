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
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-[var(--text-muted)] font-sans">
                    No replacement requests
                  </TableCell>
                </TableRow>
              ) : (
                replacements.map(rep => (
                  <TableRow key={rep.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <TableCell className="font-heading font-semibold text-[var(--text-primary)]">
                      {rep.registration?.item?.name}
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
