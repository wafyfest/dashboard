import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'saffron' | 'secondary' | 'glass' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-heading font-semibold rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] disabled:opacity-45 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer';

    const sizeStyles = {
      xs: 'px-2.5 py-1 text-xs gap-1.5 rounded-lg',
      sm: 'px-3 py-1.5 text-xs gap-2 rounded-lg',
      md: 'px-4 py-2 text-sm gap-2 rounded-xl',
      lg: 'px-5 py-2.5 text-base gap-2.5 rounded-xl',
    };

    const saffronStyle =
      'bg-[var(--f-saffron)] text-[#090d1a] hover:bg-[var(--f-saffron-hover)] shadow-md shadow-amber-500/20 font-bold active:scale-[0.98]';

    const variantStyles = {
      primary: saffronStyle,
      saffron: saffronStyle,
      secondary:
        'bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-medium)] shadow-xs',
      glass:
        'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-medium)] shadow-xs backdrop-blur-md',
      outline:
        'border border-[var(--border-medium)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--f-saffron)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
      ghost:
        'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
      destructive:
        'bg-rose-600 text-white hover:bg-rose-700 shadow-xs active:scale-[0.98]',
      success:
        'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs active:scale-[0.98]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
