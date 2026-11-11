'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { festService } from '@/lib/services/festService';
import { Loader2, Link2, ExternalLink } from 'lucide-react';

export interface SubmissionLinkTarget {
  collegeAfflNo: number;
  chestNo: string;
  studentName: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  isScreening?: boolean;
  existingUrl?: string | null;
}

interface SubmissionLinkModalProps {
  target: SubmissionLinkTarget | null;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Shared modal for colleges to submit or edit an external pre-fest video/file link
 * for both Digital Submission and Screening events.
 */
export function SubmissionLinkModal({ target, onClose, onSaved }: SubmissionLinkModalProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setUrlInput(target.existingUrl || '');
      setError(null);
      setIsSaving(false);
    }
  }, [target]);

  return (
    <Modal
      isOpen={Boolean(target)}
      onClose={() => !isSaving && onClose()}
      title={target ? `Pre-Fest Link: ${target.itemCode} — ${target.itemName}` : 'Submit Link'}
      description={
        target
          ? `Participant: ${target.studentName} (${target.chestNo})${target.isScreening ? ' • Screening Round' : ' • Digital Submission'}`
          : ''
      }
    >
      {target && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setIsSaving(true);
            setError(null);
            const res = await festService.submitEntryLink({
              collegeAfflNo: target.collegeAfflNo,
              chestNo: target.chestNo,
              itemId: target.itemId,
              fileUrl: urlInput
            });
            setIsSaving(false);
            if (!res.success) {
              setError(res.error || 'Failed to save submission link.');
              return;
            }
            onClose();
            onSaved?.();
          }}
          className="space-y-4"
        >
          {error && (
            <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
              Video / File URL (Google Drive, YouTube Unlisted, or Cloud Link) <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[var(--border-medium)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--f-saffron)] focus:ring-2 focus:ring-amber-500/30 font-mono"
              required
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1 font-sans">
              Make sure link sharing is enabled (&quot;Anyone with the link can view&quot;) so the screening/judging panel can open it.
            </p>
          </div>

          {target.existingUrl && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px]">
              <span className="text-[var(--text-muted)] flex items-center gap-1.5 truncate">
                <Link2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate font-mono">{target.existingUrl}</span>
              </span>
              <a
                href={target.existingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
                Open Current
              </a>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border-subtle)]">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="saffron" disabled={isSaving} className="font-heading font-bold gap-1.5">
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Submission Link
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
