import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Table({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg">
      <table
        className={twMerge(clsx('w-full text-left border-collapse text-xs select-text', className))}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={twMerge(
        clsx(
          'bg-[var(--bg-canvas)]/90 backdrop-blur-xs border-b border-[var(--border-subtle)] text-[10.5px] font-semibold text-[var(--text-muted)] uppercase tracking-wider sticky top-0 z-10',
          className
        )
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={twMerge(clsx('divide-y divide-[var(--border-subtle)]/70 text-[var(--text-secondary)] font-normal', className))}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TableRow({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={twMerge(
        clsx(
          'transition-all duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 group',
          className
        )
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={twMerge(
        clsx('px-3.5 py-2.5 font-semibold select-none text-[var(--text-secondary)] tracking-wider text-[11px]', className)
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={twMerge(clsx('px-3.5 py-2.5 align-middle leading-normal text-[var(--text-primary)]', className))}
      {...props}
    >
      {children}
    </td>
  );
}

