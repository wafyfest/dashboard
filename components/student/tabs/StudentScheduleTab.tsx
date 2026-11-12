'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { StageStatusBadge, ScreeningBadge, ScreeningStatusBadge } from '@/components/ui/badge';
import { Calendar, GraduationCap, Clock, MapPin, Radio } from 'lucide-react';
import { Student, Schedule, Registration, isScreeningEvent } from '@/lib/types/fest';

interface StudentScheduleTabProps {
  loggedInStudent: any;
  targetStu: Student | null | undefined;
  studentSchedules: Schedule[];
  studentRegistrations: Registration[];
}

export function StudentScheduleTab({
  loggedInStudent,
  targetStu,
  studentSchedules,
  studentRegistrations,
}: StudentScheduleTabProps) {
  if (!loggedInStudent || !targetStu) {
    return (
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] backdrop-blur-xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
          <Calendar className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-heading font-bold text-[var(--text-primary)]">Personal Schedule Requires Sign In</h3>
          <p className="text-xs font-sans text-[var(--text-muted)] max-w-sm mx-auto">
            Sign in with your student CIC Number to access your personalized stage schedule, reporting slots, and blind chest codes.
          </p>
        </div>
        <div>
          <Link
            href="/student-login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--f-saffron)] hover:bg-[var(--f-saffron-hover)] text-[#090d1a] text-xs font-heading font-bold shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)]"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Sign In with CIC Number</span>
          </Link>
        </div>
      </Card>
    );
  }

  const liveCount = studentSchedules.filter(s => s.status === 'On_Going').length;
  const completedCount = studentSchedules.filter(s => s.status === 'Ended').length;
  const upcomingCount = Math.max(0, studentSchedules.length - liveCount - completedCount);

  return (
    <div className="space-y-4">
      {/* Schedule Summary Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3.5 shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)]">
          <div className="text-[11px] text-[var(--text-muted)] font-sans">Upcoming</div>
          <div className="text-lg font-mono font-extrabold text-[var(--text-primary)] mt-0.5">{upcomingCount}</div>
        </div>
        <div className="rounded-2xl bg-[var(--bg-surface)] border border-emerald-500/25 p-3.5 shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)]">
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-heading font-semibold flex items-center gap-1.5">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Live Now</span>
          </div>
          <div className="text-lg font-mono font-extrabold text-[var(--text-primary)] mt-0.5">{liveCount}</div>
        </div>
        <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3.5 shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)]">
          <div className="text-[11px] text-[var(--text-muted)] font-sans">Completed</div>
          <div className="text-lg font-mono font-extrabold text-[var(--text-primary)] mt-0.5">{completedCount}</div>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="space-y-3 md:hidden">
        {studentSchedules.length === 0 ? (
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center rounded-2xl">
            <p className="text-xs text-[var(--text-muted)] font-sans">No scheduled competitions found for this student.</p>
          </Card>
        ) : (
          studentSchedules.map(sch => {
            const reg = studentRegistrations.find(r => r.item_id === sch.item_id);
            return (
              <Card
                key={sch.id}
                className="border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl p-4 space-y-3 shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-heading font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5 flex-wrap">
                      <span>{sch.item?.name}</span>
                      {isScreeningEvent(sch.item) && <ScreeningBadge size="sm" />}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                      {sch.item?.item_code || sch.item?.code}
                    </div>
                  </div>
                  <StageStatusBadge status={sch.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <MapPin className="w-3.5 h-3.5 text-[var(--f-saffron)] shrink-0" />
                    <span className="truncate font-sans">{sch.stage?.name || 'TBA'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)] font-mono justify-end">
                    <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <span>
                      {new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-[var(--text-muted)] font-sans">Blind Code</span>
                  {reg?.code_letter ? (
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-300 font-mono font-bold border border-amber-500/30">
                      {reg.code_letter}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)] font-sans">Assigned at Stage</span>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle className="text-base font-heading font-bold text-[var(--text-primary)]">
            My Competition Schedule & Venues
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 font-sans">
            Official stage timetable, reporting slots, and blind allotment codes for {targetStu?.full_name || 'your profile'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-heading font-semibold">Event Code & Title</TableHead>
              <TableHead className="font-heading font-semibold">Assigned Venue</TableHead>
              <TableHead className="font-heading font-semibold">Reporting Time</TableHead>
              <TableHead className="font-heading font-semibold">Blind Code</TableHead>
              <TableHead className="font-heading font-semibold">Stage Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studentSchedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[var(--text-muted)] text-xs font-sans">
                  No scheduled competitions found for this student.
                </TableCell>
              </TableRow>
            ) : (
              studentSchedules.map(sch => {
                const reg = studentRegistrations.find(r => r.item_id === sch.item_id);
                return (
                  <TableRow key={sch.id}>
                    <TableCell>
                      <div className="font-heading font-semibold text-[var(--text-primary)] flex items-center gap-1.5 flex-wrap">
                        <span>{sch.item?.name}</span>
                        {isScreeningEvent(sch.item) && <ScreeningBadge size="sm" />}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {sch.item?.item_code || sch.item?.code}
                        </span>
                        {isScreeningEvent(sch.item) && (
                          <ScreeningStatusBadge status={reg?.screening_status} size="sm" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-[var(--text-primary)] font-sans">{sch.stage?.name}</div>
                      <span className="text-[11px] text-[var(--text-muted)] font-sans">{sch.stage?.location}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[var(--text-secondary)]">
                      {new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      {reg?.code_letter ? (
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-300 font-mono font-bold text-xs border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                          {reg.code_letter}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)] text-xs font-sans">Assigned at Stage</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StageStatusBadge status={sch.status} />
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
