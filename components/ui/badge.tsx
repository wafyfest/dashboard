import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'navy'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'destructive'
    | 'outline'
    | 'purple'
    | 'amber'
    | 'category-foundation'
    | 'category-thamheediyya'
    | 'category-aliya'
    | 'category-pg'
    | 'category-general';
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
    navy:        'bg-black text-white border border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 shadow-xs',
    secondary:   'bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60',
    success:     'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    warning:     'bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    destructive: 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
    outline:     'text-[var(--text-primary)] border border-[var(--border-medium)] bg-[var(--bg-subtle)]/75 font-medium',
    purple:      'bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
    amber:       'bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',

    // Phase Categories (designed in the theme of Aliya: dark solid backdrop, high-contrast white text, subtle dark border & shadow-xs)
    'category-foundation':   'bg-sky-950 text-white border border-sky-800/80 dark:bg-sky-950 dark:text-white dark:border-sky-700 shadow-xs',
    'category-thamheediyya': 'bg-indigo-950 text-white border border-indigo-800/80 dark:bg-indigo-950 dark:text-white dark:border-indigo-700 shadow-xs',
    'category-aliya':        'bg-black text-white border border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 shadow-xs',
    'category-pg':           'bg-amber-950 text-white border border-amber-800/80 dark:bg-amber-950 dark:text-white dark:border-amber-700 shadow-xs',
    'category-general':      'bg-zinc-800 text-white border border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600 shadow-xs',
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

export function CategoryBadge({
  category,
  size = 'md',
  className,
}: {
  category: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const norm = (category || '').toLowerCase().trim();
  switch (norm) {
    case 'foundation':
    case 'sub_junior':
    case 'sub junior':
    case 'sub-junior':
    case 'fd':
    case 'pre foundation':
    case 'pre-foundation':
      return <Badge variant="category-foundation" size={size} className={className}>Foundation</Badge>;
    case 'thamheediyya':
    case 'thamheediya':
    case 'thamheed':
    case 'th':
    case 'junior':
      return <Badge variant="category-thamheediyya" size={size} className={className}>Thamheediyya</Badge>;
    case 'aliya':
    case 'al':
    case 'senior':
      return <Badge variant="navy" size={size} className={className}>Aliya</Badge>;
    case 'pg':
    case 'post graduate':
    case 'post-graduate':
      return <Badge variant="category-pg" size={size} className={className}>PG</Badge>;
    case 'general':
    case 'gen':
      return <Badge variant="category-general" size={size} className={className}>General</Badge>;
    default:
      return <Badge variant="category-general" size={size} className={className}>{category || 'General'}</Badge>;
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

export function ItemModeBadge({
  mode,
  size = 'sm',
  className
}: {
  mode?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const norm = (mode || '').toLowerCase().trim();
  if (norm === 'onstage' || norm === 'on_stage' || norm === 'on stage') {
    return (
      <Badge
        variant="success"
        size={size}
        className={twMerge(clsx('gap-1.5 font-semibold tracking-wide', className))}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        On Stage
      </Badge>
    );
  }
  if (norm === 'offstage' || norm === 'off_stage' || norm === 'off stage') {
    return (
      <Badge
        variant="secondary"
        size={size}
        className={twMerge(clsx('gap-1.5 font-semibold tracking-wide', className))}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
        Off Stage
      </Badge>
    );
  }
  if (norm === 'submission') {
    return (
      <Badge
        variant="purple"
        size={size}
        className={twMerge(clsx('gap-1.5 font-semibold tracking-wide', className))}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
        Submission
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      size={size}
      className={twMerge(clsx('capitalize', className))}
    >
      {mode || 'Off Stage'}
    </Badge>
  );
}

export function ItemTypeBadge({
  type,
  mode,
  size = 'sm',
  className
}: {
  type?: string | null;
  mode?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const normType = (type || '').toLowerCase().trim();
  const isGroup = normType === 'group';
  const typeLabel = isGroup ? 'Group' : 'Individual';

  const normMode = (mode || '').toLowerCase().trim();
  let modeLabel = 'Offstage';
  let dotColor = 'bg-sky-500';
  let variant: 'success' | 'purple' | 'secondary' = 'secondary';

  if (normMode === 'onstage' || normMode === 'on_stage' || normMode === 'on stage') {
    modeLabel = 'Onstage';
    dotColor = 'bg-emerald-500';
    variant = isGroup ? 'purple' : 'success';
  } else if (normMode === 'submission') {
    modeLabel = 'Submission';
    dotColor = 'bg-indigo-500';
    variant = 'purple';
  } else {
    modeLabel = 'Offstage';
    dotColor = 'bg-sky-500';
    variant = isGroup ? 'purple' : 'secondary';
  }

  return (
    <Badge
      variant={variant}
      size={size}
      className={twMerge(clsx('gap-1.5 font-semibold tracking-wide whitespace-nowrap', className))}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />
      {typeLabel} / {modeLabel}
    </Badge>
  );
}


