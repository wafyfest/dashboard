'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

interface ActiveSelectData {
  element: HTMLSelectElement;
  rect: DOMRect;
  options: Array<{
    value: string;
    text: string;
    disabled: boolean;
    selected: boolean;
    isOptgroup?: boolean;
  }>;
  selectedIndex: number;
  openUpwards: boolean;
}

export function GlobalDropdownEnhancer() {
  const [activeSelect, setActiveSelect] = useState<ActiveSelectData | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeDropdown = useCallback(() => {
    setActiveSelect(null);
    setFocusedIndex(-1);
  }, []);

  const openForSelect = useCallback((select: HTMLSelectElement) => {
    if (
      select.disabled ||
      select.classList.contains('sr-only') ||
      select.hasAttribute('data-custom-select')
    ) {
      return;
    }

    const rect = select.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < 220 && spaceAbove > spaceBelow;

    const optionsList: ActiveSelectData['options'] = [];
    let currentSelectedIdx = 0;

    for (let i = 0; i < select.children.length; i++) {
      const child = select.children[i];
      if (child.tagName === 'OPTGROUP') {
        const group = child as HTMLOptGroupElement;
        optionsList.push({
          value: '',
          text: group.label,
          disabled: true,
          selected: false,
          isOptgroup: true,
        });
        for (let j = 0; j < group.children.length; j++) {
          const opt = group.children[j] as HTMLOptionElement;
          const isSelected = opt.selected;
          if (isSelected) currentSelectedIdx = optionsList.length;
          optionsList.push({
            value: opt.value,
            text: opt.text || opt.value,
            disabled: opt.disabled,
            selected: isSelected,
          });
        }
      } else if (child.tagName === 'OPTION') {
        const opt = child as HTMLOptionElement;
        const isSelected = opt.selected;
        if (isSelected) currentSelectedIdx = optionsList.length;
        optionsList.push({
          value: opt.value,
          text: opt.text || opt.value,
          disabled: opt.disabled,
          selected: isSelected,
        });
      }
    }

    setActiveSelect({
      element: select,
      rect,
      options: optionsList,
      selectedIndex: currentSelectedIdx,
      openUpwards,
    });
    setFocusedIndex(currentSelectedIdx);
  }, []);

  // Global listener for select interactions
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // If clicking inside our active dropdown menu, ignore
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }

      const target = (e.target as HTMLElement).closest('select');
      if (target && !target.disabled && !target.classList.contains('sr-only')) {
        // Prevent default native OS direct rectangle dropdown popup!
        e.preventDefault();
        e.stopPropagation();

        if (activeSelect && activeSelect.element === target) {
          closeDropdown();
        } else {
          openForSelect(target);
        }
      } else if (activeSelect) {
        closeDropdown();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = (e.target as HTMLElement).closest('select');
      if (target && !target.disabled && !target.classList.contains('sr-only')) {
        if (!activeSelect && (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
          e.preventDefault();
          openForSelect(target);
        }
      }
    };

    const handleScrollOrResize = () => {
      if (activeSelect) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeSelect, openForSelect, closeDropdown]);

  // Handle keyboard navigation inside the open dropdown
  useEffect(() => {
    if (!activeSelect) return;

    const handleMenuKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => {
          let next = prev + 1;
          while (next < activeSelect.options.length && (activeSelect.options[next].disabled || activeSelect.options[next].isOptgroup)) {
            next++;
          }
          return next < activeSelect.options.length ? next : prev;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          let next = prev - 1;
          while (next >= 0 && (activeSelect.options[next].disabled || activeSelect.options[next].isOptgroup)) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < activeSelect.options.length) {
          const opt = activeSelect.options[focusedIndex];
          if (!opt.disabled && !opt.isOptgroup) {
            selectOption(opt.value);
          }
        }
      }
    };

    window.addEventListener('keydown', handleMenuKeyDown);
    return () => window.removeEventListener('keydown', handleMenuKeyDown);
  }, [activeSelect, focusedIndex, closeDropdown]);

  // Select Option & Dispatch React Event
  const selectOption = (value: string) => {
    if (!activeSelect) return;
    const select = activeSelect.element;

    // React's internal value tracker bypass
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(select, value);
    } else {
      select.value = value;
    }

    // Trigger synthetic events
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));

    closeDropdown();
  };

  // Auto-scroll to focused element
  useEffect(() => {
    if (!activeSelect || focusedIndex < 0 || !menuRef.current) return;
    const items = menuRef.current.querySelectorAll<HTMLButtonElement>('[data-dropdown-idx]');
    const targetItem = Array.from(items).find(el => el.getAttribute('data-dropdown-idx') === String(focusedIndex));
    if (targetItem) {
      targetItem.scrollIntoView({ block: 'nearest' });
    }
  }, [activeSelect, focusedIndex]);

  if (!activeSelect) return null;

  const { rect, options, openUpwards } = activeSelect;

  // Exact same width as the field!
  const menuWidth = Math.max(rect.width, 140);
  const left = Math.min(Math.max(rect.left, 8), window.innerWidth - menuWidth - 8);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${left}px`,
    width: `${menuWidth}px`,
    zIndex: 999999,
  };

  if (openUpwards) {
    style.bottom = `${window.innerHeight - rect.top + 6}px`;
  } else {
    style.top = `${rect.bottom + 6}px`;
  }

  return createPortal(
    <div
      ref={menuRef}
      style={style}
      role="listbox"
      className={clsx(
        'rounded-2xl border border-[var(--border-subtle)]',
        'bg-[var(--bg-elevated)] backdrop-blur-2xl text-[var(--text-primary)]',
        'shadow-elevated [box-shadow:var(--shadow-elevated),var(--glass-highlight)]',
        'p-1.5 animate-in fade-in duration-100 select-none overflow-hidden',
        openUpwards ? 'zoom-in-95 origin-bottom' : 'zoom-in-95 origin-top'
      )}
    >
      <div className="max-h-60 overflow-y-auto overflow-x-hidden flex flex-col gap-0.5 custom-scrollbar pr-0.5">
        {options.map((opt, idx) => {
          if (opt.isOptgroup) {
            return (
              <div
                key={'optgroup-' + idx}
                className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)]"
              >
                {opt.text}
              </div>
            );
          }

          const isSelected = opt.selected;
          const isFocused = idx === focusedIndex;

          return (
            <button
              key={opt.value + '-' + idx}
              type="button"
              role="option"
              data-dropdown-idx={idx}
              aria-selected={isSelected}
              disabled={opt.disabled}
              onClick={() => selectOption(opt.value)}
              onMouseEnter={() => setFocusedIndex(idx)}
              className={clsx(
                'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left rounded-xl transition-all duration-100 cursor-pointer',
                'text-[var(--text-primary)]',
                opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                isFocused && !isSelected && 'bg-[var(--bg-hover)] text-[var(--text-primary)]',
                isSelected &&
                  'bg-amber-500/15 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-semibold shadow-2xs'
              )}
            >
              <span className="truncate flex-1 min-w-0">{opt.text}</span>
              {isSelected && (
                <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 stroke-[2.5]" />
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
