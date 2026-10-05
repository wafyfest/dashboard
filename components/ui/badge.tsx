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
    default:     'bg-slate-700/60 text-slate-300 border border-slate-600/60',
    navy:        'bg-[#132238] text-slate-200 border border-[#2E476B]/60 shadow-sm',
    secondary:   'bg-blue-900/60 text-blue-200 border border-blue-600/60',
    success:     'bg-emerald-900/60 text-emerald-300 border border-emerald-600/60',
    warning:     'bg-amber-900/60 text-amber-200 border border-amber-600/60',
    destructive: 'bg-rose-900/60 text-rose-300 border border-rose-600/60',
    outline:     'text-slate-300 border border-slate-500 bg-slate-800/50',
    purple:      'bg-indigo-900/60 text-indigo-200 border border-indigo-600/60',
    amber:       'bg-amber-900/60 text-amber-200 border border-amber-600/60',
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
        <Badge variant="success" className="animate-pulse flex items-center gap-1.5 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          Live / On Stage
        </Badge>
      );
    case 'Starting_Soon':
      return (
        <Badge variant="amber" className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
          Starting Soon
        </Badge>
      );
    case 'Next_Item':
      return (
        <Badge variant="secondary" className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
          Next in Queue
        </Badge>
      );
    case 'Ended':
      return (
        <Badge variant="default" className="text-slate-400">
          Ended
        </Badge>
      );
    case 'Upcoming':
    default:
      return (
        <Badge variant="outline" className="text-slate-300">
          Upcoming
        </Badge>
      );
  }
}

export function CategoryBadge({ category }: { category: string }) {
  switch (category) {
    case 'Sub_Junior':
      return <Badge variant="secondary">Sub-Junior</Badge>;
    case 'Junior':
      return <Badge variant="purple">Junior</Badge>;
    case 'Senior':
      return <Badge variant="navy">Senior</Badge>;
    case 'General':
    default:
      return <Badge variant="default">General</Badge>;
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
