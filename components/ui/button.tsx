import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-400/30 disabled:opacity-45 disabled:cursor-not-allowed select-none active:scale-[0.99] cursor-pointer';

    const sizeStyles = {
      xs: 'px-2.5 py-1 text-xs gap-1.5',
      sm: 'px-3 py-1.5 text-xs gap-2',
      md: 'px-3.5 py-2 text-sm gap-2',
      lg: 'px-4.5 py-2.5 text-base gap-2.5',
    };

    const variantStyles = {
      primary:
        'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:border dark:border-white/20 shadow-xs',
      secondary:
        'bg-neutral-100 text-neutral-800 hover:bg-neutral-200/80 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:border-neutral-800',
      outline:
        'border border-[var(--border-medium)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
      ghost:
        'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
      destructive:
        'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600 shadow-xs',
      success:
        'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 shadow-xs',
    };

    return (
      <button
        ref={ref}
        className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
