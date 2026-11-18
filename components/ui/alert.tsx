'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'info' | 'warning' | 'destructive' | 'error' | 'success';
  icon?: React.ReactNode;
  onClose?: () => void;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', icon, onClose, children, ...props }, ref) => {
    // Normalise variant
    const resolvedVariant = variant === 'error' ? 'destructive' : variant;

    const variantStyles = {
      default:
        'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] [box-shadow:var(--shadow-card)]',
      info:
        'bg-blue-500/[0.08] dark:bg-blue-500/[0.12] text-blue-900 dark:text-blue-200 border-blue-500/30 dark:border-blue-500/30',
      warning:
        'bg-amber-500/[0.09] dark:bg-amber-500/[0.14] text-amber-900 dark:text-amber-200 border-amber-500/35 dark:border-amber-500/30',
      destructive:
        'bg-rose-500/[0.08] dark:bg-rose-500/[0.14] text-rose-900 dark:text-rose-200 border-rose-500/35 dark:border-rose-500/30',
      success:
        'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.14] text-emerald-900 dark:text-emerald-200 border-emerald-500/35 dark:border-emerald-500/30',
    };

    const defaultIcons = {
      default: <Info className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />,
      info: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />,
      warning: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
      destructive: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />,
      success: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
    };

    const renderedIcon = icon !== undefined ? icon : defaultIcons[resolvedVariant];

    return (
      <div
        ref={ref}
        role="alert"
        className={twMerge(
          clsx(
            'relative w-full rounded-xl border p-3.5 sm:p-4 text-xs sm:text-sm font-sans flex items-start gap-3 transition-colors duration-150 backdrop-blur-sm',
            variantStyles[resolvedVariant],
            className
          )
        )}
        {...props}
      >
        {renderedIcon}
        <div className="flex-1 min-w-0">{children}</div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alert"
            className="p-1 -mr-1 -mt-1 text-current opacity-60 hover:opacity-100 rounded-md transition-opacity cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h5
      ref={ref}
      className={twMerge(
        clsx('font-heading font-semibold text-xs sm:text-sm leading-tight tracking-tight mb-1', className)
      )}
      {...props}
    >
      {children}
    </h5>
  )
);
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge(clsx('text-xs leading-relaxed opacity-90', className))}
      {...props}
    >
      {children}
    </div>
  )
);
AlertDescription.displayName = 'AlertDescription';
