'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { festService } from '@/lib/services/festService';
import {
  Megaphone,
  Radio,
  Send,
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
  Users,
  Smartphone,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-900/40 via-red-900/20 to-transparent border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md">
              <Megaphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Convenor Flash Broadcast
                </h3>
                <Badge className="bg-rose-500 text-white text-[10px] font-mono py-0">
                  LIVE PUSH
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Instant popup notification broadcast across Team Managers' devices.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1 mb-2">
              <Sparkles className="w-3 h-3 text-amber-500" /> Quick Dispatch Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setPreset('Urgent Stage Call: Managers Report', 'All troop managers with participants in the next round are requested to report immediately to the Stage Control Desk.', 'urgent')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors"
              >
                🚨 Backstage Call
              </button>
              <button
                type="button"
                onClick={() => setPreset('Schedule Delay Advisory', 'Competitions on Stage 1 have been delayed by 15 minutes due to technical alignment. Next item will start shortly.', 'warning')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors"
              >
                ⏱️ Schedule Delay
              </button>
              <button
                type="button"
                onClick={() => setPreset('All Managers Briefing', 'A brief 5-minute meeting for all Team Managers will take place in the Convenor Office at 01:30 PM.', 'info')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors"
              >
                📢 Managers Meeting
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-primary)]">
              Headline / Announcement Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Immediate Call: Stage 1 Contenders"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {/* Message */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-primary)]">
              Bulletin Details & Instructions <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type announcement broadcast to be delivered to managers and on-screen alerts..."
              className="w-full px-3 py-2 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
            />
          </div>

          {/* Priority & Target Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Priority */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1.5">
                Urgency Level
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                    priority === 'urgent'
                      ? 'bg-rose-500 text-white border-rose-600'
                      : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Urgent
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('warning')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                    priority === 'warning'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" /> Notice
                </button>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1.5">
                Target Audience
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('role');
                    setTargetRole('college');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                    targetType === 'role'
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Team Mgrs
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('global')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                    targetType === 'global'
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" /> All Fest
                </button>
              </div>
            </div>
          </div>

          {/* Acknowledgement toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={requireAck}
                onChange={e => setRequireAck(e.target.checked)}
                className="rounded border-[var(--border-subtle)] text-rose-600 focus:ring-rose-500"
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
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
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
