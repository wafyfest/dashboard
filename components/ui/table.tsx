import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export function Table({
  className,
  containerClassName,
  children,
  ...props
}: TableProps) {
  return (
    <div className={twMerge('w-full overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] backdrop-blur-md shadow-card', containerClassName)}>
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
          'bg-[var(--bg-subtle)]/95 backdrop-blur-sm border-b border-[var(--border-subtle)] text-[11px] font-heading font-bold text-[var(--text-secondary)] uppercase tracking-wider sticky top-0 z-10',
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
      className={twMerge(clsx('divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] font-normal', className))}
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
          'transition-colors duration-150 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] group',
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
        clsx('px-4 py-3 font-heading font-bold select-none text-[var(--text-secondary)] tracking-wider text-[11px] uppercase', className)
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
      className={twMerge(clsx('px-4 py-3 align-middle leading-normal text-[var(--text-primary)] font-sans', className))}
      {...props}
    >
      {children}
    </td>
  );
}
