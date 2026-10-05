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
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#3B6090]/40 disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const sizeStyles = {
      xs: 'px-2.5 py-1 text-xs gap-1.5',
      sm: 'px-3 py-1.5 text-xs gap-2',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2.5',
    };

    const variantStyles = {
      primary:     'bg-[#132238] text-slate-200 hover:bg-[#1A2E4A] border border-[#1E3558]/60 shadow-sm',
      secondary:   'bg-slate-200/50 text-slate-700 hover:bg-slate-200/70 border border-slate-300/40',
      outline:     'border border-slate-300/60 bg-transparent text-slate-600 hover:bg-slate-200/40 hover:border-slate-400/60',
      ghost:       'text-slate-500 hover:bg-slate-200/40 hover:text-slate-700',
      destructive: 'bg-rose-700 text-white hover:bg-rose-600 shadow-sm border border-rose-600/50',
      success:     'bg-emerald-700 text-white hover:bg-emerald-600 shadow-sm border border-emerald-600/50',
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
