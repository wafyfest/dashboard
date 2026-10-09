'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import { Calendar, BookOpen, AlertTriangle, Trash2, Settings } from 'lucide-react';

export function SettingsTab() {
  const { festSettings, triggerRefresh } = useFest();
  const registrations = festService.getRegistrations();

  const [settingsForm, setSettingsForm] = useState({
    fest_name: festSettings.fest_name,
    reg_deadline: festSettings.reg_deadline.slice(0, 16),
    fine_deadline: festSettings.fine_deadline.slice(0, 16),
    rulebook_url: festSettings.rulebook_url || ''
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    festService.updateFestSettings({
      fest_name: settingsForm.fest_name,
      reg_deadline: new Date(settingsForm.reg_deadline).toISOString(),
      fine_deadline: new Date(settingsForm.fine_deadline).toISOString(),
      rulebook_url: settingsForm.rulebook_url
    });
    triggerRefresh();
    alert('Fest settings and registration deadlines successfully updated!');
  };

  const handleClearAllFestivalRegistrations = () => {
    if (window.confirm('🚨 DANGER: Are you sure you want to clear ALL registrations across ALL colleges festival-wide? All student enrollments in all events will be permanently deleted.')) {
      const res = festService.clearAllRegistrations();
      triggerRefresh();
      alert(`Successfully cleared all ${res.count} registrations across the festival.`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-500" />
            Global Fest Configuration & Deadlines
          </CardTitle>
          <CardDescription className="text-xs">
            Manage overall event titles, submission deadlines, fine windows, and public rulebooks.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Fest Name / Title
              </label>
              <input
                type="text"
                value={settingsForm.fest_name}
                onChange={e => setSettingsForm({ ...settingsForm, fest_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  Regular Registration Deadline
                </label>
                <input
                  type="datetime-local"
                  value={settingsForm.reg_deadline}
                  onChange={e => setSettingsForm({ ...settingsForm, reg_deadline: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Fine Period Deadline
                </label>
                <input
                  type="datetime-local"
                  value={settingsForm.fine_deadline}
                  onChange={e => setSettingsForm({ ...settingsForm, fine_deadline: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                Rulebook / Guidelines Document URL
              </label>
              <input
                type="url"
                value={settingsForm.rulebook_url}
                onChange={e => setSettingsForm({ ...settingsForm, rulebook_url: e.target.value })}
                placeholder="https://example.com/rulebook.pdf"
                className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Save Global Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone / Data Management Card */}
      <Card className="border-rose-500/20 bg-rose-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" size="sm">
              <AlertTriangle className="w-3 h-3 mr-1" /> System Reset & Danger Zone
            </Badge>
          </div>
          <CardTitle className="text-rose-700 dark:text-rose-400 mt-1">Data Management & Registration Purge</CardTitle>
          <CardDescription className="text-xs">
            Irreversible administrative controls to wipe participant enrollments and reset cached festival records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">Purge All Registrations</h4>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Wipes all {registrations.length} student registrations across all participating institutions. Resets quotas and clears database records.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAllFestivalRegistrations}
              disabled={registrations.length === 0}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Clear All Registrations ({registrations.length})
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">Reset Local Database to Defaults</h4>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Clears local storage caches and re-initializes colleges, events, and empty registration rosters.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              onClick={async () => {
                if (window.confirm('Are you sure you want to reset all local festival data to defaults?')) {
                  await festService.clearCacheAndRefetch();
                  triggerRefresh();
                  alert('Festival cache reset to clean database state.');
                }
              }}
            >
              Reset System State
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
