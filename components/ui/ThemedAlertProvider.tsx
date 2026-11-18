'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Button } from './button';
import { GlobalDropdownEnhancer } from './GlobalDropdownEnhancer';

export type AlertType = 'info' | 'warning' | 'error' | 'success';

export interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirm?: boolean;
  resolve?: (value: boolean) => void;
}

export interface ShowAlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
}

export interface ShowConfirmOptions {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
}

interface AlertContextValue {
  showAlert: (options: ShowAlertOptions | string) => Promise<void>;
  showConfirm: (options: ShowConfirmOptions | string) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextValue | null>(null);

// Global event bus so that standalone utility functions or intercepted window.alert can dispatch alerts
type AlertEventDetail =
  | { kind: 'alert'; item: AlertItem }
  | { kind: 'confirm'; item: AlertItem };

const ALERT_EVENT_NAME = 'arts_fest_themed_alert_event';

function dispatchAlertEvent(detail: AlertEventDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ALERT_EVENT_NAME, { detail }));
  }
}

/**
 * Detect alert type heuristically based on message content
 */
function inferAlertType(text: string): AlertType {
  const lower = text.toLowerCase();
  if (
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('fail') ||
    lower.includes('invalid') ||
    lower.includes('denied') ||
    lower.includes('cannot') ||
    lower.includes('exceeded') ||
    lower.includes('limit reached') ||
    lower.includes('rejected')
  ) {
    return 'error';
  }
  if (
    lower.includes('success') ||
    lower.includes('saved') ||
    lower.includes('completed') ||
    lower.includes('submitted') ||
    lower.includes('approved') ||
    lower.includes('published') ||
    lower.includes('waived')
  ) {
    return 'success';
  }
  if (
    lower.includes('please ') ||
    lower.includes('warning') ||
    lower.includes('caution') ||
    lower.includes('attention') ||
    lower.includes('required') ||
    lower.includes('missing') ||
    lower.includes('are you sure')
  ) {
    return 'warning';
  }
  return 'info';
}

function inferAlertTitle(text: string, type: AlertType, isConfirm: boolean): string {
  if (isConfirm) return 'Confirmation Required';
  switch (type) {
    case 'error':
      return 'Notice / Error';
    case 'success':
      return 'Action Successful';
    case 'warning':
      return 'Attention Required';
    case 'info':
    default:
      return 'Fest Bulletin';
  }
}

export function ThemedAlertProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<AlertItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const pushItem = useCallback((item: AlertItem) => {
    setQueue(prev => [...prev, item]);
  }, []);

  const showAlert = useCallback(
    (options: ShowAlertOptions | string): Promise<void> => {
      return new Promise<void>(resolve => {
        const message = typeof options === 'string' ? options : options.message;
        const type = typeof options === 'string' ? inferAlertType(options) : options.type || inferAlertType(message);
        const title = typeof options === 'string' ? inferAlertTitle(options, type, false) : options.title || inferAlertTitle(message, type, false);
        const confirmText = typeof options === 'string' ? 'OK' : options.confirmText || 'OK';

        const item: AlertItem = {
          id: Math.random().toString(36).substring(2, 9),
          type,
          title,
          message,
          confirmText,
          isConfirm: false,
          resolve: () => resolve(),
        };

        pushItem(item);
      });
    },
    [pushItem]
  );

  const showConfirm = useCallback(
    (options: ShowConfirmOptions | string): Promise<boolean> => {
      return new Promise<boolean>(resolve => {
        const message = typeof options === 'string' ? options : options.message;
        const type = typeof options === 'string' ? inferAlertType(options) : options.type || inferAlertType(message);
        const title = typeof options === 'string' ? inferAlertTitle(options, type, true) : options.title || inferAlertTitle(message, type, true);
        const confirmText = typeof options === 'string' ? 'Confirm' : options.confirmText || 'Confirm';
        const cancelText = typeof options === 'string' ? 'Cancel' : options.cancelText || 'Cancel';

        const item: AlertItem = {
          id: Math.random().toString(36).substring(2, 9),
          type,
          title,
          message,
          confirmText,
          cancelText,
          isConfirm: true,
          resolve,
        };

        pushItem(item);
      });
    },
    [pushItem]
  );

  // Listen to custom alert events (from intercepted window.alert)
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<AlertEventDetail>;
      if (customEvent.detail?.item) {
        pushItem(customEvent.detail.item);
      }
    };

    window.addEventListener(ALERT_EVENT_NAME, handleEvent);
    return () => window.removeEventListener(ALERT_EVENT_NAME, handleEvent);
  }, [pushItem]);

  // Patch window.alert to automatically route through this themed system!
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalAlert = window.alert;

    window.alert = (msg?: any) => {
      const str = String(msg ?? '');
      const type = inferAlertType(str);
      const title = inferAlertTitle(str, type, false);

      const item: AlertItem = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        title,
        message: str,
        confirmText: 'OK',
        isConfirm: false,
      };

      dispatchAlertEvent({ kind: 'alert', item });
    };

    (window as any).showThemedAlert = (opts: ShowAlertOptions | string) => showAlert(opts);
    (window as any).showThemedConfirm = (opts: ShowConfirmOptions | string) => showConfirm(opts);

    return () => {
      window.alert = originalAlert;
      delete (window as any).showThemedAlert;
      delete (window as any).showThemedConfirm;
    };
  }, []);

  const activeItem = queue[0] || null;

  const handleDismiss = useCallback(
    (confirmed: boolean) => {
      if (!activeItem) return;
      if (activeItem.resolve) {
        activeItem.resolve(confirmed);
      }
      setQueue(prev => prev.slice(1));
    },
    [activeItem]
  );

  // Keyboard navigation: Enter confirms, Escape cancels
  useEffect(() => {
    if (!activeItem) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleDismiss(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeItem, handleDismiss]);

  const config = {
    error: {
      accentColor: 'bg-rose-500',
      badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25',
      badgeText: 'NOTICE',
      iconContainer: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30',
      icon: <AlertCircle className="w-5 h-5 shrink-0" />,
      btnVariant: 'destructive' as const,
    },
    warning: {
      accentColor: 'bg-amber-500',
      badgeClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25',
      badgeText: 'ATTENTION',
      iconContainer: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
      icon: <AlertTriangle className="w-5 h-5 shrink-0" />,
      btnVariant: 'primary' as const,
    },
    success: {
      accentColor: 'bg-emerald-500',
      badgeClass: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25',
      badgeText: 'SUCCESS',
      iconContainer: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
      icon: <CheckCircle2 className="w-5 h-5 shrink-0" />,
      btnVariant: 'success' as const,
    },
    info: {
      accentColor: 'bg-[var(--f-saffron)]',
      badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25',
      badgeText: 'INFORMATION',
      iconContainer: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30',
      icon: <Info className="w-5 h-5 shrink-0" />,
      btnVariant: 'primary' as const,
    },
  }[activeItem?.type || 'info'];

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <GlobalDropdownEnhancer />

      {mounted &&
        activeItem &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3.5 sm:p-5 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => handleDismiss(false)}
          >
            <div
              className="relative w-full max-w-md bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-elevated [box-shadow:var(--shadow-elevated),var(--glass-highlight)] overflow-hidden animate-in zoom-in-95 duration-150 backdrop-blur-xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Subtle top indicator bar */}
              <div className={`h-1.5 w-full ${config.accentColor}`} />

              <div className="p-5 sm:p-6">
                {/* Header with Icon, Badge and Close Button */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${config.iconContainer}`}>
                      {config.icon}
                    </div>
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase mb-1 ${config.badgeClass}`}>
                        {config.badgeText}
                      </span>
                      <h3 id={titleId} className="font-heading font-bold text-base sm:text-lg text-[var(--text-primary)] tracking-tight leading-snug">
                        {activeItem.title}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDismiss(false)}
                    aria-label="Close dialog"
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Message Body */}
                <div className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto pr-1">
                  {activeItem.message}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
                  {activeItem.isConfirm && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDismiss(false)}
                      className="text-xs h-9 px-4 cursor-pointer"
                    >
                      {activeItem.cancelText || 'Cancel'}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant={activeItem.isConfirm && activeItem.type === 'error' ? 'destructive' : config.btnVariant}
                    size="sm"
                    autoFocus
                    onClick={() => handleDismiss(true)}
                    className="text-xs h-9 px-5 font-semibold cursor-pointer"
                  >
                    {activeItem.confirmText || (activeItem.isConfirm ? 'Confirm' : 'OK')}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AlertContext.Provider>
  );
}

/**
 * Hook to trigger themed alerts and confirms programmatically
 */
export function useThemedAlert(): AlertContextValue {
  const context = useContext(AlertContext);
  if (!context) {
    // Graceful fallback if invoked outside of provider
    return {
      showAlert: async (opts: ShowAlertOptions | string) => {
        if (typeof window !== 'undefined') {
          const str = typeof opts === 'string' ? opts : opts.message;
          const type = typeof opts === 'string' ? inferAlertType(str) : opts.type || inferAlertType(str);
          const title = typeof opts === 'string' ? inferAlertTitle(str, type, false) : opts.title || inferAlertTitle(str, type, false);
          dispatchAlertEvent({
            kind: 'alert',
            item: {
              id: Math.random().toString(36).substring(2, 9),
              type,
              title,
              message: str,
              confirmText: 'OK',
              isConfirm: false,
            },
          });
        }
      },
      showConfirm: async (opts: ShowConfirmOptions | string): Promise<boolean> => {
        if (typeof window !== 'undefined') {
          return new Promise<boolean>(resolve => {
            const str = typeof opts === 'string' ? opts : opts.message;
            const type = typeof opts === 'string' ? inferAlertType(str) : opts.type || inferAlertType(str);
            const title = typeof opts === 'string' ? inferAlertTitle(str, type, true) : opts.title || inferAlertTitle(str, type, true);
            dispatchAlertEvent({
              kind: 'confirm',
              item: {
                id: Math.random().toString(36).substring(2, 9),
                type,
                title,
                message: str,
                confirmText: typeof opts === 'string' ? 'Confirm' : opts.confirmText || 'Confirm',
                cancelText: typeof opts === 'string' ? 'Cancel' : opts.cancelText || 'Cancel',
                isConfirm: true,
                resolve,
              },
            });
          });
        }
        return false;
      },
    };
  }
  return context;
}
