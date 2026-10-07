'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { StageStatusBadge } from '@/components/ui/badge';
import { Schedule, Registration } from '@/lib/types/fest';
import { Calendar } from 'lucide-react';

interface CollegeScheduleTabProps {
  schedules: Schedule[];
  registrations: Registration[];
}

export function CollegeScheduleTab({ schedules, registrations }: CollegeScheduleTabProps) {
  const registeredItemIds = new Set(registrations.map(r => r.item_id));
  const filteredSchedules = schedules.filter(sch => registeredItemIds.has(sch.item_id));

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>College Event Stage Schedule</CardTitle>
          <CardDescription>Scheduled stages and starting times for enrolled events</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
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
                <TableCell colSpan={5} className="text-center py-8 text-[var(--text-muted)] text-xs">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  No schedules announced for your enrolled events yet.
                </TableCell>
              </TableRow>
            ) : (
              filteredSchedules.map(sch => {
                const reg = registrations.find(r => r.item_id === sch.item_id);
                return (
                  <TableRow key={sch.id}>
                    <TableCell>
                      <div className="font-bold text-[var(--text-primary)]">{sch.item?.name || sch.item?.name_eng}</div>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">{sch.item?.code || sch.item?.item_code}</span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-[var(--text-primary)]">{sch.stage?.name}</div>
                      <span className="text-[11px] text-[var(--text-secondary)]">{sch.stage?.location}</span>
                    </TableCell>
                    <TableCell className="font-mono text-[var(--text-secondary)]">
                      {new Date(sch.scheduled_start || sch.starting || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <StageStatusBadge status={sch.status} />
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)]">
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
