'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Megaphone } from 'lucide-react';
import { LiveStageProgressWidget } from '@/components/roles/LiveStageProgressWidget';
import { TilePattern } from '@/components/fest/FestPattern';

interface ConvenorStageMonitorTabProps {
  refreshKey: number;
  onOpenBroadcastModal: () => void;
}

export function ConvenorStageMonitorTab({
  refreshKey,
  onOpenBroadcastModal,
}: ConvenorStageMonitorTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Operations Header */}
      <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6 [box-shadow:var(--shadow-card),var(--glass-highlight)] backdrop-blur-md">
        <TilePattern id="convenor-monitor-khatam" className="opacity-10 text-[var(--f-saffron)]" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
              </span>
              <h2 className="font-heading font-black text-base sm:text-lg text-[var(--text-primary)] tracking-tight">
                Backstage Operations & Emergency Dispatch Desk
              </h2>
            </div>
            <p className="font-sans text-xs text-[var(--text-secondary)] mt-1.5 max-w-2xl leading-relaxed">
              Real-time multi-stage telemetry monitoring live events, upcoming items, and backstage progress. Trigger instant flash announcements directly to team managers&apos; mobile devices and digital displays.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={onOpenBroadcastModal}
              className="bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-heading font-bold text-xs h-10 px-4 rounded-xl shadow-md shadow-rose-600/25 flex items-center gap-2 transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Megaphone className="w-4 h-4 animate-bounce" />
              <span>Broadcast Flash Bulletin</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Live Stage Progress Card */}
      <LiveStageProgressWidget refreshKey={refreshKey} />
    </div>
  );
}

