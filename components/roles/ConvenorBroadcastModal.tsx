'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { festService } from '@/lib/services/festService';
import { TilePattern } from '@/components/fest/FestPattern';
import {
  Megaphone,
  Radio,
  Send,
  X,
  AlertTriangle,
  Info,
  Users,
  Sparkles
} from 'lucide-react';

interface ConvenorBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ConvenorBroadcastModal({ isOpen, onClose, onSuccess }: ConvenorBroadcastModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'warning' | 'info'>('urgent');
  const [targetType, setTargetType] = useState<'global' | 'role'>('role');
  const [targetRole, setTargetRole] = useState<'college' | 'all'>('college');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requireAck, setRequireAck] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please provide both an announcement title and message content.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await festService.createAnnouncement({
        title: title.trim(),
        message: message.trim(),
        priority,
        target_type: targetType === 'global' ? 'global' : 'role',
        target_role: targetType === 'role' ? targetRole : null,
        require_ack: requireAck,
        action_label: 'Acknowledge'
      });

      if (res.success) {
        // Reset form
        setTitle('');
        setMessage('');
        setPriority('urgent');
        setRequireAck(false);
        onSuccess?.();
        onClose();
      } else {
        alert(res.error || 'Failed to dispatch broadcast notice');
      }
    } catch (err: any) {
      alert(err.message || 'Error publishing broadcast notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPreset = (presetTitle: string, presetMsg: string, p: 'urgent' | 'warning' | 'info') => {
    setTitle(presetTitle);
    setMessage(presetMsg);
    setPriority(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl [box-shadow:var(--shadow-elevated),var(--glass-highlight)] overflow-hidden animate-in zoom-in-95">
        <TilePattern id="convenor-broadcast-khatam" className="opacity-10 text-rose-500" />

        {/* Header */}
        <div className="relative p-5 bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-transparent border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-rose-500/25 border border-white/20 shrink-0">
              <Megaphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-base text-[var(--text-primary)] tracking-tight">
                  Convenor Flash Broadcast
                </h3>
                <Badge variant="rose" className="font-mono text-[10px] tracking-wider uppercase font-bold py-0.5 px-2">
                  LIVE PUSH
                </Badge>
              </div>
              <p className="text-xs font-sans text-[var(--text-secondary)] mt-0.5">
                Instant popup notification broadcast across Team Managers&apos; devices.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-colors cursor-pointer"
            aria-label="Close broadcast modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 relative z-10">
          {/* Quick Presets */}
          <div>
            <span className="font-heading text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--f-saffron)]" /> Quick Dispatch Presets
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPreset('Urgent Stage Call: Managers Report', 'All troop managers with participants in the next round are requested to report immediately to the Stage Control Desk.', 'urgent')}
                className="text-[11px] font-heading font-semibold px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-rose-500/15 hover:text-rose-700 dark:hover:text-rose-300 border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-all cursor-pointer shadow-2xs"
              >
                🚨 Backstage Call
              </button>
              <button
                type="button"
                onClick={() => setPreset('Schedule Delay Advisory', 'Competitions on Stage 1 have been delayed by 15 minutes due to technical alignment. Next event will start shortly.', 'warning')}
                className="text-[11px] font-heading font-semibold px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300 border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-all cursor-pointer shadow-2xs"
              >
                ⏱️ Schedule Delay
              </button>
              <button
                type="button"
                onClick={() => setPreset('All Managers Briefing', 'A brief 5-minute meeting for all Team Managers will take place in the Convenor Office at 01:30 PM.', 'info')}
                className="text-[11px] font-heading font-semibold px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-sky-500/15 hover:text-sky-700 dark:hover:text-sky-300 border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-all cursor-pointer shadow-2xs"
              >
                📢 Managers Meeting
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-heading font-bold text-[var(--text-secondary)]">
              Headline / Announcement Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Immediate Call: Stage 1 Contenders"
              className="w-full px-3.5 py-2.5 text-xs font-sans rounded-xl bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 transition-all font-medium"
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="block text-xs font-heading font-bold text-[var(--text-secondary)]">
              Bulletin Details & Instructions <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type announcement broadcast to be delivered to managers and on-screen alerts..."
              className="w-full px-3.5 py-2.5 text-xs font-sans rounded-xl bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 transition-all resize-none font-medium leading-relaxed"
            />
          </div>

          {/* Priority & Target Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Priority */}
            <div>
              <label className="text-xs font-heading font-bold text-[var(--text-secondary)] block mb-1.5">
                Urgency Level
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-heading font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${priority === 'urgent'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/25 shadow-md'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                    }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Urgent
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('warning')}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-heading font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${priority === 'warning'
                      ? 'bg-[var(--f-saffron)] text-[#090d1a] border-amber-500 shadow-amber-500/25 shadow-md'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                    }`}
                >
                  <Info className="w-3.5 h-3.5" /> Notice
                </button>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="text-xs font-heading font-bold text-[var(--text-secondary)] block mb-1.5">
                Target Audience
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('role');
                    setTargetRole('college');
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-heading font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${targetType === 'role'
                      ? 'bg-[var(--f-saffron)] text-[#090d1a] border-amber-500 shadow-amber-500/25 shadow-md'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                    }`}
                >
                  <Users className="w-3.5 h-3.5" /> Team Mgrs
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('global')}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-heading font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${targetType === 'global'
                      ? 'bg-[var(--f-saffron)] text-[#090d1a] border-amber-500 shadow-amber-500/25 shadow-md'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                    }`}
                >
                  <Radio className="w-3.5 h-3.5" /> All Fest
                </button>
              </div>
            </div>
          </div>

          {/* Acknowledgement toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-sans text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={requireAck}
                onChange={e => setRequireAck(e.target.checked)}
                className="rounded border-[var(--border-medium)] accent-amber-500 text-[var(--f-saffron)] focus:ring-[var(--f-saffron)]"
              />
              <span>Require Team Managers to explicitly click &quot;Acknowledge&quot; receipt</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-heading"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="saffron"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-heading font-bold flex items-center gap-1.5 shadow-md"
            >
              {isSubmitting ? (
                <>Broadcasting...</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Send Flash Broadcast
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
