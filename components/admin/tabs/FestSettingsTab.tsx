'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';
import {
  SlidersHorizontal,
  Lock,
  Unlock,
  FileText,
  ExternalLink,
  Save,
  Loader2,
  RefreshCw,
  Check
} from 'lucide-react';

export function FestSettingsTab() {
  const { refreshKey, triggerRefresh } = useFest();
  const [isPending, startTransition] = useTransition();

  const [festName, setFestName] = useState('');
  const [rulebookUrl, setRulebookUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [togglingLock, setTogglingLock] = useState<'hall_ticket' | 'volunteer' | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const settings = festService.getFestSettings();
  const isHallTicketUnlocked = Boolean(settings.hall_ticket_download_enabled);
  const isVolunteerLocked = Boolean(settings.volunteer_reg_locked);

  useEffect(() => {
    setFestName(settings.fest_name || '');
    setRulebookUrl(settings.rulebook_url || '');
  }, [settings.fest_name, settings.rulebook_url, refreshKey]);

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await festService.updateFestSettings({
        fest_name: festName.trim().toUpperCase(),
        rulebook_url: rulebookUrl.trim() || null,
      });

      startTransition(() => {
        triggerRefresh();
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update fest identity settings:', err);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleHallTicket = async () => {
    const nextState = !isHallTicketUnlocked;
    const msg = nextState
      ? 'Unlock Hall Ticket generation for all colleges?'
      : 'Lock Hall Ticket generation for all colleges?';

    const confirmed = await ((window as any).showThemedConfirm?.({
      title: nextState ? 'Unlock Hall Tickets' : 'Lock Hall Tickets',
      message: msg,
      type: nextState ? 'info' : 'warning',
      confirmText: nextState ? 'Unlock' : 'Lock',
    }) ?? window.confirm(msg));

    if (!confirmed) return;

    try {
      setTogglingLock('hall_ticket');
      await festService.setHallTicketDownloadEnabled(nextState);
      startTransition(() => {
        triggerRefresh();
      });
    } catch (err) {
      console.error('Failed to toggle hall ticket lock:', err);
    } finally {
      setTogglingLock(null);
    }
  };

  const handleToggleVolunteer = async () => {
    const nextState = !isVolunteerLocked;
    const msg = nextState
      ? 'Lock volunteer registration for all colleges?'
      : 'Unlock volunteer registration for all colleges?';

    const confirmed = await ((window as any).showThemedConfirm?.({
      title: nextState ? 'Lock Volunteers' : 'Unlock Volunteers',
      message: msg,
      type: nextState ? 'warning' : 'info',
      confirmText: nextState ? 'Lock' : 'Unlock',
    }) ?? window.confirm(msg));

    if (!confirmed) return;

    try {
      setTogglingLock('volunteer');
      await festService.setVolunteerRegistrationLocked(nextState);
      startTransition(() => {
        triggerRefresh();
      });
    } catch (err) {
      console.error('Failed to toggle volunteer lock:', err);
    } finally {
      setTogglingLock(null);
    }
  };

  const handleForceSync = async () => {
    try {
      setSyncSuccess(false);
      await festService.updateFestSettings({});
      startTransition(() => {
        triggerRefresh();
      });
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to broadcast sync:', err);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Page Title */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-[var(--text-primary)] tracking-tight">
            Fest Settings
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
            Operational master switches and festival configuration.
          </p>
        </div>

        <Button
          variant="outline"
          size="xs"
          onClick={handleForceSync}
          className="text-xs font-heading font-bold border-[var(--border-subtle)]"
          title="Force Realtime sync to all open college and judge tabs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
          <span>{syncSuccess ? 'Synced!' : 'Broadcast Sync'}</span>
        </Button>
      </div>

      {/* Operational Switches Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Hall Ticket Switch */}
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 rounded-2xl flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-heading font-bold text-[var(--text-primary)]">
                  Hall Ticket Downloads
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    isHallTicketUnlocked
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isHallTicketUnlocked ? 'Unlocked' : 'Locked'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Controls student &amp; college PDF hall ticket downloads.
              </p>
            </div>
          </div>

          <Button
            variant={isHallTicketUnlocked ? 'destructive' : 'saffron'}
            size="sm"
            disabled={togglingLock === 'hall_ticket'}
            onClick={handleToggleHallTicket}
            className="w-full font-heading font-bold text-xs"
          >
            {togglingLock === 'hall_ticket' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : isHallTicketUnlocked ? (
              <Lock className="w-3.5 h-3.5 mr-1.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span>{isHallTicketUnlocked ? 'Lock Downloads' : 'Unlock Downloads'}</span>
          </Button>
        </Card>

        {/* Volunteer Lock Switch */}
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 rounded-2xl flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-heading font-bold text-[var(--text-primary)]">
                  Volunteer Registration
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    !isVolunteerLocked
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {!isVolunteerLocked ? 'Open' : 'Locked'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Controls college volunteer force submissions and edits.
              </p>
            </div>
          </div>

          <Button
            variant={!isVolunteerLocked ? 'destructive' : 'saffron'}
            size="sm"
            disabled={togglingLock === 'volunteer'}
            onClick={handleToggleVolunteer}
            className="w-full font-heading font-bold text-xs"
          >
            {togglingLock === 'volunteer' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : !isVolunteerLocked ? (
              <Lock className="w-3.5 h-3.5 mr-1.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span>{!isVolunteerLocked ? 'Lock Volunteers' : 'Unlock Volunteers'}</span>
          </Button>
        </Card>
      </div>

      {/* Fest Identity & Rulebook */}
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 rounded-2xl">
        <h2 className="text-sm font-heading font-bold text-[var(--text-primary)] mb-4">
          Festival Identity
        </h2>

        <form onSubmit={handleSaveIdentity} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
              Fest Name / Title
            </label>
            <input
              type="text"
              value={festName}
              onChange={(e) => setFestName(e.target.value)}
              placeholder="e.g. 14TH WAFY ARTS FEST"
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-medium)] focus:border-[var(--f-saffron)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] font-heading font-bold focus:outline-none uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
              Official Rulebook URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={rulebookUrl}
                onChange={(e) => setRulebookUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border-medium)] focus:border-[var(--f-saffron)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] font-mono focus:outline-none"
              />
              {rulebookUrl && (
                <a
                  href={rulebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                  title="Test link in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              variant="saffron"
              size="sm"
              disabled={isSaving}
              className="font-heading font-bold text-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  <span>Save Settings</span>
                </>
              )}
            </Button>

            {saveSuccess && (
              <span className="text-xs font-heading font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
