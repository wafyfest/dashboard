import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, mono = false, error = false, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={twMerge(
          clsx(
            'w-full px-3.5 py-2 text-xs rounded-xl border transition-all duration-150',
            'bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'border-[var(--border-medium)] hover:border-[var(--border-strong)]',
            'focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            mono && 'font-mono tracking-wider tabular-nums font-semibold',
            error && 'border-rose-500 focus:border-rose-500 focus-visible:ring-rose-500/30',
            className
          )
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, onChange, ...props }, ref) => {
    const hasValue = Boolean(value);

    return (
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
        <Input
          ref={ref}
          value={value}
          onChange={onChange}
          className={twMerge('pl-9.5 pr-9', className)}
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error = false, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={twMerge(
          clsx(
            'w-full px-3.5 py-2.5 text-xs rounded-xl border transition-all duration-150',
            'bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'border-[var(--border-medium)] hover:border-[var(--border-strong)]',
            'focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30',
            'disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed',
            error && 'border-rose-500 focus:border-rose-500 focus-visible:ring-rose-500/30',
            className
          )
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
