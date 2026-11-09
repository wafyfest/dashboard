'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CategoryBadge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';
import { Item, StageStatus, Schedule, Stage } from '@/lib/types/fest';

interface EventStatusItem {
  item: Item;
  schedule?: Schedule;
  stage?: Stage;
  status: StageStatus;
}

interface EventStatusTabProps {
  events: EventStatusItem[];
  onUpdateStatus: (itemId: number, status: StageStatus) => void;
  formatDate: (dateStr?: string | null) => string;
  formatTime: (dateStr?: string | null) => string;
}

export function EventStatusTab({
  events,
  onUpdateStatus,
  formatDate,
  formatTime,
}: EventStatusTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Radio className="w-4 h-4 text-[var(--f-saffron-text)]" />
            Events Status Timetable
          </CardTitle>
          <CardDescription className="text-xs text-[var(--text-secondary)]">
            Inspect schedule and update live event status. Only the status dropdown is editable.
          </CardDescription>
        </div>
        <span className="text-xs font-mono text-[var(--text-muted)]">
          Showing {events.length} Events
        </span>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Event Code</TableHead>
              <TableHead>Event Name</TableHead>
              <TableHead>Phase / Category</TableHead>
              <TableHead>Stage Venue</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time Start - End</TableHead>
              <TableHead className="w-44">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-[var(--text-muted)] text-sm">
                  No events match the search or filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              events.map(({ item, schedule, stage, status }, idx) => (
                <TableRow key={item.id} className="hover:bg-[var(--bg-hover)]">
                  <TableCell className="text-center font-medium text-[var(--text-muted)] text-xs">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-xs text-[var(--text-primary)]">
                    {item.item_code || item.code}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-[var(--text-primary)]">
                      {item.name_eng || item.name}
                    </div>
                    {item.name_mal && (
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {item.name_mal}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={item.phase || item.category || 'General'} />
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)]">
                    {stage?.name || (schedule?.stage_number ? `Stage ${schedule.stage_number}` : 'TBD')}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
                    {formatDate(schedule?.starting)}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-[var(--text-secondary)] whitespace-nowrap">
                    {formatTime(schedule?.starting)} - {formatTime(schedule?.ending)}
                  </TableCell>
                  <TableCell>
                    <select
                      value={status}
                      onChange={e => onUpdateStatus(Number(item.item_id), e.target.value as StageStatus)}
                      aria-label={`Status for ${item.name_eng || item.name}`}
                      className="text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[var(--border-subtle)] focus:border-amber-500/50 bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Starting_Soon">Starting Soon</option>
                      <option value="Next_Item">Next Event</option>
                      <option value="On_Going">On Going (Live)</option>
                      <option value="Ended">Ended</option>
                    </select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
