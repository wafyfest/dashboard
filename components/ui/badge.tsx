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
    | 'saffron'
    | 'emerald'
    | 'rose'
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
  const baseStyles = 'inline-flex items-center font-heading font-medium rounded-full transition-colors whitespace-nowrap w-fit';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-0.5 text-xs',
  };

  const variantStyles = {
    default:     'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
    navy:        'bg-black text-white border border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 shadow-xs',
    secondary:   'bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30',
    success:     'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30',
    // warning uses yellow-500 (HSL 48°) — deliberately distinct from brand saffron/amber (HSL 38°)
    // so "needs attention" never looks like a branded CTA
    warning:     'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border border-yellow-500/30',
    destructive: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30',
    outline:     'text-[var(--text-primary)] border border-[var(--border-medium)] bg-[var(--bg-subtle)]/75 font-medium',
    // purple maps to indigo — both are blue-violet family (HSL 240–280°)
    // distinguished by usage: indigo = category/submission, purple = group events
    purple:      'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30',
    // amber is a semantic alias of warning (kept for API compat)
    amber:       'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border border-yellow-500/30',

    // Fest Brand Variants — amber family, intentionally on-brand
    saffron:     'bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/35 shadow-[0_0_10px_rgba(245,158,11,0.15)] font-semibold',
    emerald:     'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/35 font-semibold',
    rose:        'bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/35 font-semibold',

    // Phase Categories — each uses a distinct hue for categorical encoding
    'category-foundation':   'bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30 font-semibold',
    'category-thamheediyya': 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30 font-semibold',
    'category-aliya':        'bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 font-semibold',
    'category-pg':           'bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 font-semibold',
    'category-general':      'bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-medium)] font-semibold',
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
        <Badge variant="emerald" className="flex items-center gap-1.5 font-bold tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_#10b981]" />
          </span>
          Live / On Stage
        </Badge>
      );
    case 'Starting_Soon':
      return (
        <Badge variant="saffron" className="flex items-center gap-1.5 font-bold tracking-wide">
          <span className="h-2 w-2 rounded-full bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]" />
          Starting Soon
        </Badge>
      );
    case 'Next_Item':
      return (
        <Badge variant="secondary" className="flex items-center gap-1.5 font-bold tracking-wide">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          Next in Queue
        </Badge>
      );
    case 'Ended':
      return (
        <Badge variant="default" className="text-[var(--text-muted)] font-medium">
          Ended
        </Badge>
      );
    case 'Upcoming':
    default:
      return (
        <Badge variant="outline" className="font-medium">
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
      return <Badge variant="category-aliya" size={size} className={className}>Aliya</Badge>;
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
      return <Badge variant="emerald" className="font-semibold">Approved</Badge>;
    case 'Rejected':
      return <Badge variant="rose" className="font-semibold">Rejected</Badge>;
    case 'Pending':
    default:
      return (
        <Badge variant="saffron" className="flex items-center gap-1.5 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--f-saffron)] animate-pulse" />
          Pending Review
        </Badge>
      );
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
        variant="emerald"
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
  let variant: 'emerald' | 'purple' | 'secondary' = 'secondary';

  if (normMode === 'onstage' || normMode === 'on_stage' || normMode === 'on stage') {
    modeLabel = 'Onstage';
    dotColor = 'bg-emerald-500';
    variant = isGroup ? 'purple' : 'emerald';
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
