'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AppealStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';

interface AppealsTabProps {
  onRefresh?: () => void;
}

export function AppealsTab({ onRefresh }: AppealsTabProps) {
  const { refreshKey, triggerRefresh } = useFest();
  const appeals = React.useMemo(() => festService.getAppeals(), [refreshKey]);
  const [appealRemarks, setAppealRemarks] = useState<{ [id: string]: string }>({});

  const handleReview = (appealId: string, status: 'Approved' | 'Rejected', defaultRemark: string) => {
    festService.reviewAppeal(
      appealId,
      status,
      appealRemarks[appealId] || defaultRemark
    );
    if (onRefresh) onRefresh();
    else triggerRefresh();
  };

  return (
    <div className="space-y-6">
      <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-[var(--border-subtle)]/60">
          <div>
            <CardTitle className="font-heading font-bold text-base text-[var(--text-primary)]">
              Event Result Appeals &amp; Grievances
            </CardTitle>
            <CardDescription className="text-xs text-[var(--text-muted)] font-sans">
              Review contested decisions, technical glitches, and jury disputes with payment proofs
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader className="bg-[var(--bg-subtle)]">
              <TableRow>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">College</TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Event</TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Reason / Complaint</TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Receipt</TableHead>
                <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Status</TableHead>
                <TableHead className="text-right font-heading font-bold text-xs text-[var(--text-secondary)]">Admin Adjudication</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appeals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-[var(--text-muted)] font-sans">
                    No appeals submitted
                  </TableCell>
                </TableRow>
              ) : (
                appeals.map(appeal => (
                  <TableRow key={appeal.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <TableCell className="font-heading font-semibold text-[var(--text-primary)]">{appeal.college?.name}</TableCell>
                    <TableCell className="font-heading font-medium text-[var(--text-primary)]">{appeal.item?.name}</TableCell>
                    <TableCell className="max-w-xs text-xs text-[var(--text-secondary)] font-sans">
                      {appeal.reason}
                      {appeal.admin_remarks && (
                        <div className="mt-1 text-[11px] bg-[var(--bg-subtle)] p-1.5 rounded-lg text-[var(--text-primary)] border border-[var(--border-subtle)] font-sans">
                          <strong>Remarks:</strong> {appeal.admin_remarks}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {appeal.fee_receipt_url ? (
                        <a
                          href={appeal.fee_receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] hover:underline text-xs flex items-center gap-1 font-medium font-sans"
                        >
                          <FileText className="w-3 h-3" /> View Fee
                        </a>
                      ) : (
                        <span className="text-[var(--text-muted)] text-xs font-sans">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <AppealStatusBadge status={appeal.status || appeal.current_status || 'Pending'} />
                    </TableCell>
                    <TableCell className="text-right space-y-1">
                      {appeal.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="text"
                            placeholder="Admin remarks..."
                            value={appealRemarks[appeal.id] || ''}
                            onChange={e =>
                              setAppealRemarks({ ...appealRemarks, [appeal.id]: e.target.value })
                            }
                            className="px-2.5 py-1 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-1 focus:ring-amber-500/30 font-sans w-36"
                          />
                          <Button
                            size="xs"
                            variant="success"
                            onClick={() => handleReview(appeal.id, 'Approved', 'Approved by Executive Committee')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="xs"
                            variant="destructive"
                            onClick={() => handleReview(appeal.id, 'Rejected', 'Rejected after jury re-evaluation')}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] font-sans">Adjudicated</span>
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
