import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'navy' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'purple' | 'amber';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors whitespace-nowrap w-fit';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-0.5 text-xs',
  };

  const variantStyles = {
    default:     'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    navy:        'bg-[#132238] text-white border border-[#1E3558] dark:bg-[#1A2E4A] dark:text-slate-200 dark:border-[#2E476B]/60 shadow-xs',
    secondary:   'bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60',
    success:     'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    warning:     'bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    destructive: 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
    outline:     'text-[var(--text-secondary)] border border-[var(--border-medium)] bg-transparent',
    purple:      'bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
    amber:       'bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  };

  return (
    <div
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      {...props}
    />
  );
}

export function StageStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'On_Going':
      return (
        <Badge variant="success" className="flex items-center gap-1.5 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Live / On Stage
        </Badge>
      );
    case 'Starting_Soon':
      return (
        <Badge variant="amber" className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
          Starting Soon
        </Badge>
      );
    case 'Next_Item':
      return (
        <Badge variant="secondary" className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
          Next in Queue
        </Badge>
      );
    case 'Ended':
      return (
        <Badge variant="default" className="text-[var(--text-muted)]">
          Ended
        </Badge>
      );
    case 'Upcoming':
    default:
      return (
        <Badge variant="outline">
          Upcoming
        </Badge>
      );
  }
}

export function CategoryBadge({ category }: { category: string }) {
  const norm = (category || '').toLowerCase().trim();
  switch (norm) {
    case 'foundation':
      return <Badge variant="secondary">Foundation</Badge>;
    case 'thamheediyya':
    case 'thamheediya':
      return <Badge variant="purple">Thamheediyya</Badge>;
    case 'aliya':
      return <Badge variant="navy">Aliya</Badge>;
    case 'pg':
      return <Badge variant="amber">PG</Badge>;
    case 'general':
      return <Badge variant="default">General</Badge>;
    case 'sub_junior':
    case 'sub junior':
      return <Badge variant="secondary">Foundation</Badge>;
    case 'junior':
      return <Badge variant="purple">Thamheediyya</Badge>;
    case 'senior':
      return <Badge variant="navy">Aliya</Badge>;
    default:
      return <Badge variant="default">{category || 'General'}</Badge>;
  }
}

export function AppealStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'Approved':
      return <Badge variant="success">Approved</Badge>;
    case 'Rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    case 'Pending':
    default:
      return <Badge variant="warning">Pending Review</Badge>;
  }
}
