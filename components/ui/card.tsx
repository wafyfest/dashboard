import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'interactive' | 'saffron';
}

export function Card({
  className,
  variant = 'default',
  children,
  ...props
}: CardProps) {
  const variantStyles = {
    default:
      'bg-[var(--bg-surface)] backdrop-blur-md rounded-2xl border border-[var(--border-subtle)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] transition-all duration-200',
    elevated:
      'bg-[var(--bg-elevated)] backdrop-blur-md rounded-2xl border border-[var(--border-subtle)] shadow-elevated [box-shadow:var(--shadow-elevated),var(--glass-highlight)] transition-all duration-200',
    glass:
      'bg-[var(--bg-surface)]/90 backdrop-blur-xl rounded-2xl border border-[var(--border-subtle)] [box-shadow:var(--shadow-card),var(--glass-highlight)] transition-all duration-200',
    interactive:
      'bg-[var(--bg-surface)] backdrop-blur-md rounded-2xl border border-[var(--border-subtle)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] transition-all duration-200 hover:border-[var(--border-medium)] hover:shadow-elevated hover:-translate-y-0.5 cursor-pointer',
    saffron:
      'bg-[var(--bg-surface)] backdrop-blur-md rounded-2xl border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)] [box-shadow:var(--shadow-card),var(--glass-highlight)] transition-all duration-200',
  };

  return (
    <div
      className={twMerge(clsx(variantStyles[variant], className))}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        clsx('px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between', className)
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={twMerge(
        clsx('font-heading font-bold text-sm sm:text-base text-[var(--text-primary)] tracking-tight', className)
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={twMerge(clsx('text-xs text-[var(--text-secondary)] mt-1 leading-relaxed', className))}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge(clsx('p-5 sm:p-6', className))} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        clsx('px-5 py-3.5 bg-[var(--bg-subtle)]/50 rounded-b-2xl border-t border-[var(--border-subtle)] flex items-center justify-between', className)
      )}
      {...props}
    >
      {children}
    </div>
  );
}
