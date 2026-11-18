'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOptionItem {
  value: string | number;
  label: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface SelectProps {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement> | { target: { value: string; name?: string } }) => void;
  onValueChange?: (value: string) => void;
  options?: SelectOptionItem[];
  children?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
  menuClassName?: string;
  error?: boolean;
  name?: string;
  id?: string;
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      value: controlledValue,
      defaultValue,
      onChange,
      onValueChange,
      options,
      children,
      placeholder = 'Select option...',
      disabled = false,
      className,
      wrapperClassName,
      menuClassName,
      error = false,
      name,
      id,
      size = 'md',
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [openUpwards, setOpenUpwards] = useState(false);
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
    const [mounted, setMounted] = useState(false);
    const [internalValue, setInternalValue] = useState<string | number>(
      controlledValue !== undefined
        ? controlledValue
        : defaultValue !== undefined
        ? defaultValue
        : ''
    );
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : internalValue;

    useEffect(() => {
      setMounted(true);
    }, []);

    // Parse options from `options` prop or extract from React `children` (<option> or <SelectOption>)
    const parsedOptions: SelectOptionItem[] = useMemo(() => {
      if (options && options.length > 0) return options;
      const items: SelectOptionItem[] = [];

      React.Children.forEach(children, child => {
        if (!React.isValidElement(child)) return;
        const props = child.props as any;
        if (
          child.type === 'option' ||
          (child.type as any)?.displayName === 'SelectOption' ||
          props.value !== undefined
        ) {
          items.push({
            value: props.value !== undefined ? props.value : '',
            label: props.children !== undefined ? props.children : String(props.value ?? ''),
            disabled: Boolean(props.disabled),
            className: props.className,
          });
        }
      });

      return items;
    }, [options, children]);

    // Sync internal value if controlledValue changes
    useEffect(() => {
      if (isControlled) {
        setInternalValue(controlledValue);
      }
    }, [isControlled, controlledValue]);

    // Determine current selected label
    const selectedOption = useMemo(() => {
      return parsedOptions.find(opt => String(opt.value) === String(currentValue));
    }, [parsedOptions, currentValue]);

    const displayLabel = selectedOption
      ? selectedOption.label
      : placeholder;

    // Calculate exact coordinates of trigger field to show dropdown above everything
    const updatePosition = useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTriggerRect(rect);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If less than 220px below and more room above, flip upwards
      if (spaceBelow < 220 && spaceAbove > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }, []);

    const toggleOpen = () => {
      if (disabled) return;
      if (!isOpen) {
        updatePosition();
        const currentIndex = parsedOptions.findIndex(
          opt => String(opt.value) === String(currentValue)
        );
        setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
      setIsOpen(prev => !prev);
    };

    // Close on outside click
    useEffect(() => {
      if (!isOpen) return;

      const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node;
        if (
          containerRef.current &&
          !containerRef.current.contains(target) &&
          menuRef.current &&
          !menuRef.current.contains(target)
        ) {
          setIsOpen(false);
        }
      };

      const handleScrollOrResize = () => {
        updatePosition();
      };

      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);

      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }, [isOpen, updatePosition]);

    // Handle Option Selection
    const handleSelectOption = useCallback(
      (optValue: string | number) => {
        const strVal = String(optValue);
        if (!isControlled) {
          setInternalValue(optValue);
        }

        if (onValueChange) {
          onValueChange(strVal);
        }

        if (onChange) {
          onChange({
            target: { value: strVal, name: name || '' },
          } as any);
        }

        setIsOpen(false);
      },
      [isControlled, name, onChange, onValueChange]
    );

    // Keyboard Navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          toggleOpen();
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = prev + 1;
            return next < parsedOptions.length ? next : 0;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = prev - 1;
            return next >= 0 ? next : parsedOptions.length - 1;
          });
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < parsedOptions.length) {
            const opt = parsedOptions[focusedIndex];
            if (!opt.disabled) {
              handleSelectOption(opt.value);
            }
          }
          break;
        case 'Tab':
          setIsOpen(false);
          break;
        default:
          break;
      }
    };

    // Auto-scroll to focused item
    useEffect(() => {
      if (!isOpen || focusedIndex < 0 || !menuRef.current) return;
      const buttons = menuRef.current.querySelectorAll<HTMLButtonElement>('[data-option-index]');
      const targetBtn = buttons[focusedIndex];
      if (targetBtn) {
        targetBtn.scrollIntoView({ block: 'nearest' });
      }
    }, [isOpen, focusedIndex]);

    const sizeStyles = {
      sm: 'px-2.5 py-1.5 text-xs',
      md: 'px-3.5 py-2 text-xs',
      lg: 'px-4 py-2.5 text-sm',
    };

    return (
      <div
        ref={node => {
          containerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        id={id}
        className={twMerge('relative w-full text-xs font-sans select-none', wrapperClassName)}
        onKeyDown={handleKeyDown}
      >
        {/* Hidden native select for form data & assistive tech */}
        <select
          name={name}
          aria-hidden="true"
          tabIndex={-1}
          value={String(currentValue)}
          onChange={() => {}}
          className="sr-only pointer-events-none absolute h-0 w-0 opacity-0"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {parsedOptions.map(opt => (
            <option key={String(opt.value)} value={String(opt.value)} disabled={opt.disabled}>
              {typeof opt.label === 'string' ? opt.label : String(opt.value)}
            </option>
          ))}
        </select>

        {/* Trigger Field - With CURVED EDGES (rounded-xl) */}
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={toggleOpen}
          className={twMerge(
            clsx(
              'w-full flex items-center justify-between gap-2 text-left rounded-xl border transition-all duration-150',
              'bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer',
              'border-[var(--border-medium)] hover:border-[var(--f-saffron)]',
              'focus:outline-none focus:border-[var(--f-saffron)] focus-visible:ring-2 focus-visible:ring-amber-500/30',
              'shadow-xs',
              sizeStyles[size],
              disabled && 'opacity-50 cursor-not-allowed',
              isOpen && 'border-[var(--f-saffron)] ring-2 ring-amber-500/30 shadow-md',
              error && 'border-rose-500 focus:border-rose-500 ring-rose-500/30',
              className
            )
          )}
        >
          <span
            className={clsx(
              'truncate flex-1 min-w-0 font-medium',
              !selectedOption && 'text-[var(--text-muted)]'
            )}
          >
            {displayLabel}
          </span>
          <ChevronDown
            className={twMerge(
              'w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-200 pointer-events-none',
              isOpen && 'rotate-180 text-[var(--f-saffron)]',
              disabled && 'opacity-40'
            )}
          />
        </button>

        {/* Custom Dropdown Options Menu:
            1. SHOW ABOVE EVERY OTHER (createPortal to document.body with fixed zIndex: 999999)
            2. SAME WIDTH AS FIELD (style.width = triggerRect.width)
            3. CURVED EDGES (rounded-2xl)
            4. CUSTOMISED TO THEME (glassmorphic elevated card with obsidian/white, subtle borders, saffron checkmark)
        */}
        {mounted &&
          isOpen &&
          triggerRect &&
          createPortal(
            <div
              ref={menuRef}
              role="listbox"
              tabIndex={-1}
              style={{
                position: 'fixed',
                left: `${triggerRect.left}px`,
                width: `${triggerRect.width}px`,
                zIndex: 999999,
                ...(openUpwards
                  ? { bottom: `${window.innerHeight - triggerRect.top + 6}px` }
                  : { top: `${triggerRect.bottom + 6}px` }),
              }}
              className={twMerge(
                clsx(
                  'rounded-2xl border border-[var(--border-subtle)]',
                  'bg-[var(--bg-elevated)] backdrop-blur-2xl text-[var(--text-primary)]',
                  'shadow-elevated [box-shadow:var(--shadow-elevated),var(--glass-highlight)]',
                  'p-1.5 animate-in fade-in duration-100 select-none overflow-hidden',
                  openUpwards ? 'zoom-in-95 origin-bottom' : 'zoom-in-95 origin-top',
                  menuClassName
                )
              )}
            >
              <div className="max-h-60 overflow-y-auto overflow-x-hidden flex flex-col gap-0.5 custom-scrollbar pr-0.5">
                {parsedOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[var(--text-muted)] text-center italic">
                    No options available
                  </div>
                ) : (
                  parsedOptions.map((opt, idx) => {
                    const isSelected = String(opt.value) === String(currentValue);
                    const isFocused = idx === focusedIndex;

                    return (
                      <button
                        key={String(opt.value) + '-' + idx}
                        type="button"
                        role="option"
                        data-option-index={idx}
                        aria-selected={isSelected}
                        disabled={opt.disabled}
                        onClick={() => !opt.disabled && handleSelectOption(opt.value)}
                        onMouseEnter={() => setFocusedIndex(idx)}
                        className={twMerge(
                          clsx(
                            'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left rounded-xl transition-all duration-100 cursor-pointer',
                            'text-[var(--text-primary)]',
                            opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                            isFocused && !isSelected && 'bg-[var(--bg-hover)] text-[var(--text-primary)]',
                            isSelected &&
                              'bg-amber-500/15 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-semibold shadow-2xs',
                            opt.className
                          )
                        )}
                      >
                        <span className="truncate flex-1 min-w-0">{opt.label}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface SelectOptionProps extends React.OptionHTMLAttributes<HTMLOptionElement> {}

export const SelectOption = React.forwardRef<HTMLOptionElement, SelectOptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <option ref={ref} className={className} {...props}>
        {children}
      </option>
    );
  }
);
SelectOption.displayName = 'SelectOption';
