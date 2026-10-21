'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { festService } from '@/lib/services/festService';
import { StageStatus } from '@/lib/types/fest';
import { Radio, Clock, MapPin, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LiveStageProgressWidgetProps {
  refreshKey?: number;
}

export function LiveStageProgressWidget({ refreshKey }: LiveStageProgressWidgetProps) {
  const stages = useMemo(() => festService.getStages(), [refreshKey]);
  const schedules = useMemo(() => festService.getSchedules(), [refreshKey]);

  // Aggregate stage live status
  const stageStatuses = useMemo(() => {
    return stages.map(stage => {
      // Find all schedules assigned to this stage
      const stageScheds = schedules.filter(
        s => s.stage_number === stage.stage_number || s.stage_id === stage.id
      );

      // On_Going item takes priority
      const onGoing = stageScheds.find(s => s.status === 'On_Going');
      // Starting_Soon item
      const startingSoon = stageScheds.find(s => s.status === 'Starting_Soon');
      // Next_Item or upcoming items
      const nextUpcoming = stageScheds
        .filter(s => s.status === 'Upcoming' || s.status === 'Next_Item')
        .sort((a, b) => new Date(a.starting).getTime() - new Date(b.starting).getTime())[0];

      // Total ended items
      const endedCount = stageScheds.filter(s => s.status === 'Ended').length;

      // Identify current primary status
      let overallStatus: StageStatus = 'Upcoming';
      let currentItem = onGoing || startingSoon;
      let nextItem = onGoing ? (startingSoon || nextUpcoming) : nextUpcoming;

      if (onGoing) {
        overallStatus = 'On_Going';
      } else if (startingSoon) {
        overallStatus = 'Starting_Soon';
      } else if (stageScheds.length > 0 && endedCount === stageScheds.length) {
        overallStatus = 'Ended';
      }

      return {
        stage,
        totalItems: stageScheds.length,
        endedCount,
        overallStatus,
        currentItem,
        nextItem
      };
    });
  }, [stages, schedules]);

  const activeRunningCount = stageStatuses.filter(s => s.overallStatus === 'On_Going').length;

  return (
    <Card className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Live Backstage & Schedule Progression
              </h3>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono py-0">
                {activeRunningCount} Stage{activeRunningCount === 1 ? '' : 's'} Active
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Real-time monitoring of stage status, currently running competitions, and lineup transitions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5" />
          <span>Realtime Feed</span>
        </div>
      </div>

      {/* Grid of Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-4">
        {stageStatuses.map(({ stage, totalItems, endedCount, overallStatus, currentItem, nextItem }) => {
          const isOngoing = overallStatus === 'On_Going';
          const isStartingSoon = overallStatus === 'Starting_Soon';
          const isEnded = overallStatus === 'Ended';

          return (
            <div
              key={stage.id}
              className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all ${
                isOngoing
                  ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20'
                  : isStartingSoon
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : isEnded
                  ? 'bg-slate-500/5 border-slate-500/20 opacity-80'
                  : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)]'
              }`}
            >
              {/* Stage Identity */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-mono font-bold flex items-center justify-center">
                      {stage.stage_number}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[140px] sm:max-w-[170px]" title={stage.name}>
                        {stage.name}
                      </h4>
                      {stage.location && (
                        <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 truncate">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{stage.location}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isOngoing ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-mono px-2 py-0.5 animate-pulse">
                      ● ON GOING
                    </Badge>
                  ) : isStartingSoon ? (
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] font-mono px-2 py-0.5">
                      STARTING SOON
                    </Badge>
                  ) : isEnded ? (
                    <Badge variant="outline" className="border-slate-400 text-slate-500 text-[10px] font-mono px-2 py-0.5">
                      ENDED
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-sky-400 text-sky-600 text-[10px] font-mono px-2 py-0.5">
                      UPCOMING
                    </Badge>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono mb-1">
                    <span>Events Completed</span>
                    <span>{endedCount} / {totalItems}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isOngoing ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                      style={{
                        width: `${totalItems > 0 ? (endedCount / totalItems) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* Current Item Box */}
                <div className="mt-3 p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      {isOngoing ? 'Current Item' : 'Next Scheduled'}
                    </span>
                    {currentItem?.status && (
                      <span className="text-[9px] font-mono text-[var(--text-muted)]">
                        {currentItem.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  {currentItem?.item ? (
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)] leading-tight line-clamp-1">
                        #{currentItem.item.item_id} — {currentItem.item.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mt-0.5">
                        <span className="capitalize">{currentItem.item.category || currentItem.item.phase}</span>
                        <span>•</span>
                        <span className="capitalize">{currentItem.item.item_type || currentItem.item.point_type || 'Single'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs italic text-[var(--text-muted)]">
                      {isEnded ? 'All scheduled items concluded' : 'No active item in progress'}
                    </p>
                  )}
                </div>
              </div>

              {/* Next in Queue */}
              {nextItem?.item && (
                <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1 truncate max-w-[70%]">
                    <ArrowRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                    <span className="truncate">Next: #{nextItem.item.item_id} {nextItem.item.name}</span>
                  </span>
                  <span className="font-mono text-[10px] shrink-0 text-slate-500">
                    {nextItem.scheduled_start ? new Date(nextItem.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Upcoming'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
