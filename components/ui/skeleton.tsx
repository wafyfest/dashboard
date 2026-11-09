import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export function Skeleton({ className, variant = 'rounded', ...props }: SkeletonProps) {
  const variantStyles = {
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-xl',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'animate-pulse bg-neutral-200/80 dark:bg-neutral-800/60 border border-[var(--border-subtle)]',
          variantStyles[variant],
          className
        )
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={twMerge(
        'rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 shadow-card animate-pulse',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-48" />
      <div className="pt-2 flex items-center gap-3">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-3 border-b border-[var(--border-subtle)] animate-pulse">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={clsx(
                'h-4',
                c === 0 ? 'w-16' : c === 1 ? 'w-48' : c === 2 ? 'w-24' : 'w-20'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
