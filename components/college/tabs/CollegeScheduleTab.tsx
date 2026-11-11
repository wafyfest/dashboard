'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { StageStatusBadge, ItemModeBadge } from '@/components/ui/badge';
import { Schedule, Registration, isSubmissionEvent, isScreeningEvent } from '@/lib/types/fest';
import { Calendar } from 'lucide-react';

interface CollegeScheduleTabProps {
  schedules: Schedule[];
  registrations: Registration[];
}

export function CollegeScheduleTab({ schedules, registrations }: CollegeScheduleTabProps) {
  const registeredItemIds = new Set(registrations.map(r => r.item_id));
  const filteredSchedules = schedules.filter(sch => registeredItemIds.has(sch.item_id));

  return (
    <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)]">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
            </span>
            <CardTitle className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]">
              College Event Stage Schedule
            </CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-sans">
            Scheduled stages and starting times for enrolled events
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Table containerClassName="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Stage / Venue</TableHead>
              <TableHead>Scheduled Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Participants</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-[var(--text-muted)] text-xs">
                  <div className="max-w-md mx-auto space-y-2">
                    <Calendar className="w-8 h-8 mx-auto opacity-40 text-[var(--text-muted)]" />
                    <p className="font-heading font-semibold text-[var(--text-secondary)]">
                      No schedules announced for your enrolled events yet.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredSchedules.map(sch => {
                const reg = registrations.find(r => r.item_id === sch.item_id);
                return (
                  <TableRow key={sch.id}>
                    <TableCell>
                      <div className="font-heading font-bold text-[var(--text-primary)] text-xs sm:text-sm">
                        {sch.item?.name || sch.item?.name_eng}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)] font-mono font-semibold">
                          {sch.item?.code || sch.item?.item_code}
                        </span>
                        {sch.item?.mode && <ItemModeBadge mode={sch.item.mode} isSubmission={isSubmissionEvent(sch.item)} isScreening={isScreeningEvent(sch.item)} size="sm" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-heading font-semibold text-[var(--text-primary)] text-xs sm:text-sm">
                        {sch.stage?.name}
                      </div>
                      <span className="text-[11px] font-sans text-[var(--text-secondary)]">
                        {sch.stage?.location}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-[var(--text-secondary)] text-xs sm:text-sm tabular-nums">
                      {new Date(sch.scheduled_start || sch.starting || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <StageStatusBadge status={sch.status} />
                    </TableCell>
                    <TableCell className="text-xs font-sans text-[var(--text-secondary)]">
                      {reg?.participants?.map(p => p.full_name || p.name).join(', ') || 'No roster'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
