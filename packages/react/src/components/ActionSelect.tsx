import { useState, useRef, useEffect, useMemo } from 'react';
import { getBadgeColor } from './ActionBadge.js';

interface ActionSelectProps {
  options: string[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  'aria-labelledby'?: string;
}

interface PositionState {
  dropUp: boolean;
}

export function ActionSelect({
  options,
  value,
  onChange,
  placeholder = 'All actions',
  'aria-labelledby': ariaLabelledBy,
}: ActionSelectProps) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState<PositionState>({ dropUp: false });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Determine drop direction on open
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPosition({ dropUp: spaceBelow < 200 && rect.top > spaceBelow });
    }
  }, [open]);

  // Scroll focused option into view
  useEffect(() => {
    if (open && focusIdx >= 0 && listRef.current) {
      const el = listRef.current.children[focusIdx] as HTMLElement;
      el?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [focusIdx, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setFocusIdx(0);
        } else {
          setFocusIdx((i) => Math.min(i + 1, options.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) {
          setFocusIdx((i) => Math.max(i - 1, 0));
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open && focusIdx >= 0) {
          onChange(options[focusIdx]);
          setOpen(false);
        } else {
          setOpen(true);
          setFocusIdx(value ? options.indexOf(value) : 0);
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  };

  const selectedColor = value ? getBadgeColor(value) : undefined;

  return (
    <div ref={containerRef} className="logseal-select" onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="logseal-select__trigger"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setFocusIdx(value ? options.indexOf(value) : -1);
        }}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value ? (
          <span className={`logseal-action-badge logseal-action-badge--${selectedColor}`}>
            {value}
          </span>
        ) : (
          <span className="logseal-select__placeholder">{placeholder}</span>
        )}
        <span className="logseal-select__icons">
          {value && (
            <span
              className="logseal-select__clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
                setOpen(false);
              }}
              role="button"
              aria-label="Clear selection"
              tabIndex={-1}
            >
              &times;
            </span>
          )}
          <svg className="logseal-select__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          className={`logseal-select__menu ${position.dropUp ? 'logseal-select__menu--up' : ''}`}
          role="listbox"
          aria-labelledby={ariaLabelledBy}
        >
          {options.map((action, i) => {
            const color = getBadgeColor(action);
            return (
              <li
                key={action}
                className={`logseal-select__option ${i === focusIdx ? 'logseal-select__option--focused' : ''} ${action === value ? 'logseal-select__option--selected' : ''}`}
                role="option"
                aria-selected={action === value}
                onClick={() => {
                  onChange(action);
                  setOpen(false);
                }}
                onMouseEnter={() => setFocusIdx(i)}
              >
                <span className={`logseal-action-badge logseal-action-badge--${color}`}>
                  {action}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
