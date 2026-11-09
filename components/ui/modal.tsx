import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-[95vw]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={twMerge(
          clsx(
            'relative w-full bg-[var(--bg-elevated)] rounded-2xl shadow-elevated [box-shadow:var(--shadow-elevated),var(--glass-highlight)] border border-[var(--border-subtle)] overflow-hidden z-10 animate-in zoom-in-95 duration-150 backdrop-blur-xl',
            maxWidthStyles[maxWidth]
          )
        )}
      >
        <div className="px-6 py-4.5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex items-center justify-between">
          <div>
            <h3 id="modal-title" className="text-base sm:text-lg font-heading font-bold text-[var(--text-primary)] tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto text-[var(--text-primary)] font-sans">{children}</div>
      </div>
    </div>
  );
}
