import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Select, { type SingleValue } from 'react-select';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { getBadgeColor } from './ActionBadge.js';
import type { FilterBarProps } from '../types.js';

interface ActionOption {
  value: string;
  label: string;
  badgeColor: string;
}

function DateRangeField({
  fromValue,
  toValue,
  onRangeChange,
}: {
  fromValue: string | undefined;
  toValue: string | undefined;
  onRangeChange: (from: string | undefined, to: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  // Local draft range so we don't fire API calls on every click
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);
  // Time state: "HH:MM" strings
  const [fromTime, setFromTime] = useState('00:00');
  const [toTime, setToTime] = useState('23:59');

  const parseDateTime = (s: string | undefined) => (s ? new Date(s) : undefined);

  const toISODateTime = (d: Date, time: string) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${time}`;
  };

  // Sync draft from props when popover opens
  useEffect(() => {
    if (open) {
      const from = parseDateTime(fromValue);
      const to = parseDateTime(toValue);
      setDraft(from || to ? { from, to } : undefined);
      if (from) {
        setFromTime(`${String(from.getHours()).padStart(2, '0')}:${String(from.getMinutes()).padStart(2, '0')}`);
      } else {
        setFromTime('00:00');
      }
      if (to) {
        setToTime(`${String(to.getHours()).padStart(2, '0')}:${String(to.getMinutes()).padStart(2, '0')}`);
      } else {
        setToTime('23:59');
      }
      clickCount.current = 0;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Commit draft to parent when popover closes
  const commitAndClose = () => {
    const from = draft?.from ? toISODateTime(draft.from, fromTime) : undefined;
    const to = draft?.to ? toISODateTime(draft.to, toTime) : undefined;
    if (from !== fromValue || to !== toValue) {
      onRangeChange(from, to);
    }
    setOpen(false);
  };

  // Track clicks: first click sets "from", second sets "to"
  const clickCount = useRef(0);

  // Auto-close when a complete range (two distinct clicks) is selected
  const handleSelect = (range: DateRange | undefined) => {
    setDraft(range);
    clickCount.current++;
    if (clickCount.current >= 2 && range?.from && range?.to) {
      onRangeChange(
        toISODateTime(range.from, fromTime),
        toISODateTime(range.to, toTime),
      );
      setOpen(false);
      clickCount.current = 0;
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        commitAndClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open, draft, fromTime, toTime]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 330;
      let left = rect.right + window.scrollX - popoverWidth;
      if (left < 8) left = 8;
      if (left + popoverWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - popoverWidth - 8);
      }
      setPopoverPos({
        top: rect.bottom + window.scrollY + 4,
        left,
      });
    }
  }, [open]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  const displayText = () => {
    const from = parseDateTime(fromValue);
    const to = parseDateTime(toValue);
    if (from && to) return `${formatDate(from)} ${formatTime(fromTime)} – ${formatDate(to)} ${formatTime(toTime)}`;
    if (from) return `${formatDate(from)} ${formatTime(fromTime)} – ...`;
    if (to) return `... – ${formatDate(to)} ${formatTime(toTime)}`;
    return 'Date range';
  };

  const hasValue = fromValue || toValue;

  // Show draft while popover is open, committed values otherwise
  const displayedRange = open ? draft : (
    fromValue || toValue
      ? { from: parseDateTime(fromValue), to: parseDateTime(toValue) }
      : undefined
  );

  return (
    <div className="logseal-filter-bar__field logseal-date-field">
      <label className="logseal-filter-bar__label" id="logseal-filter-date-label">
        Date range
      </label>
      <button
        ref={triggerRef}
        type="button"
        className={`logseal-filter-bar__date-button ${!hasValue ? 'logseal-filter-bar__date-button--placeholder' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-labelledby="logseal-filter-date-label"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{displayText()}</span>
        {hasValue && (
          <button
            type="button"
            className="logseal-filter-bar__date-clear"
            onClick={(e) => {
              e.stopPropagation();
              onRangeChange(undefined, undefined);
              setDraft(undefined);
              setOpen(false);
            }}
            aria-label="Clear date range"
          >
            &times;
          </button>
        )}
      </button>
      {open && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            className="logseal-date-popover"
            role="dialog"
            aria-label="Select date range"
            style={popoverPos ? { top: popoverPos.top, left: popoverPos.left } : undefined}
          >
            <DayPicker
              mode="range"
              selected={displayedRange}
              onSelect={handleSelect}
            />
            <div className="logseal-date-popover__time">
              <div className="logseal-date-popover__time-field">
                <label className="logseal-date-popover__time-label">From</label>
                <input
                  type="time"
                  className="logseal-date-popover__time-input"
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value)}
                />
              </div>
              <div className="logseal-date-popover__time-field">
                <label className="logseal-date-popover__time-label">To</label>
                <input
                  type="time"
                  className="logseal-date-popover__time-input"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function FilterBar({
  actions,
  filters,
  onFiltersChange,
  hasActiveFilters,
  searchQuery,
  onSearchChange,
  className,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);

  const actionOptions = useMemo<ActionOption[]>(
    () => actions.map((a) => ({ value: a, label: a, badgeColor: getBadgeColor(a) })),
    [actions],
  );

  const formatOptionLabel = (option: ActionOption) => (
    <span className={`logseal-action-badge logseal-action-badge--${option.badgeColor}`}>
      {option.label}
    </span>
  );

  const selectedAction = useMemo(
    () => actionOptions.find((o) => o.value === filters.action) || null,
    [actionOptions, filters.action],
  );

  return (
    <div
      className={`logseal-filter-bar ${open ? 'logseal-filter-bar--open' : ''} ${className || ''}`}
      role="search"
    >
      <div className="logseal-filter-bar__header">
        <span className="logseal-filter-bar__title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M1.5 3h13M4 8h8M6 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Filters
        </span>
        <button
          type="button"
          className="logseal-filter-bar__mobile-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle filters"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 4h14M5 9h8M7 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {hasActiveFilters && <span className="logseal-filter-bar__dot" />}
        </button>
      </div>

      <div className="logseal-filter-bar__fields">
        {onSearchChange && (
          <div className="logseal-filter-bar__field logseal-filter-bar__field--search">
            <label className="logseal-filter-bar__label" htmlFor="logseal-filter-search">
              Search
            </label>
            <input
              id="logseal-filter-search"
              className="logseal-filter-bar__input"
              type="search"
              placeholder="Search events..."
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        <div className="logseal-filter-bar__field">
          <label className="logseal-filter-bar__label" id="logseal-filter-action-label">
            Action
          </label>
          <Select<ActionOption>
            aria-labelledby="logseal-filter-action-label"
            options={actionOptions}
            value={selectedAction}
            onChange={(option) =>
              onFiltersChange({ ...filters, action: option?.value || undefined })
            }
            formatOptionLabel={formatOptionLabel}
            isClearable
            placeholder="All actions"
            menuPosition="absolute"
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: '34px',
                height: '34px',
                borderColor: state.isFocused
                  ? 'var(--logseal-color-primary)'
                  : 'var(--logseal-color-border)',
                backgroundColor: 'var(--logseal-color-bg)',
                fontFamily: 'var(--logseal-font-family)',
                fontSize: 'var(--logseal-font-size-sm)',
                borderRadius: 'var(--logseal-border-radius)',
                boxShadow: state.isFocused
                  ? '0 0 0 1px var(--logseal-color-primary)'
                  : 'none',
                '&:hover': {
                  borderColor: 'var(--logseal-color-primary)',
                },
              }),
              valueContainer: (base) => ({
                ...base,
                padding: '0 8px',
                height: '32px',
              }),
              input: (base) => ({
                ...base,
                margin: 0,
                padding: 0,
              }),
              indicatorsContainer: (base) => ({
                ...base,
                height: '32px',
              }),
              indicatorSeparator: () => ({
                display: 'none',
              }),
              dropdownIndicator: (base) => ({
                ...base,
                padding: '4px',
              }),
              clearIndicator: (base) => ({
                ...base,
                padding: '4px',
              }),
              menu: (base) => ({
                ...base,
                zIndex: 30,
                width: 'max-content',
                minWidth: '100%',
                borderRadius: 'var(--logseal-border-radius)',
                boxShadow: 'var(--logseal-shadow-md)',
              }),
              option: (base, state) => ({
                ...base,
                fontSize: 'var(--logseal-font-size-sm)',
                fontFamily: 'var(--logseal-font-family)',
                backgroundColor: state.isFocused
                  ? 'var(--logseal-color-primary-light)'
                  : 'var(--logseal-color-bg)',
                color: 'var(--logseal-color-text)',
                cursor: 'pointer',
                '&:active': {
                  backgroundColor: 'var(--logseal-color-primary-light)',
                },
              }),
              singleValue: (base) => ({
                ...base,
                color: 'var(--logseal-color-text)',
              }),
              placeholder: (base) => ({
                ...base,
                color: 'var(--logseal-color-text-muted)',
              }),
            }}
          />
        </div>

        <div className="logseal-filter-bar__field">
          <label className="logseal-filter-bar__label" htmlFor="logseal-filter-actor">
            Actor
          </label>
          <input
            id="logseal-filter-actor"
            className="logseal-filter-bar__input"
            type="text"
            placeholder="Filter by actor ID..."
            value={filters.actorId || ''}
            onChange={(e) =>
              onFiltersChange({ ...filters, actorId: e.target.value || undefined })
            }
          />
        </div>

        <DateRangeField
          fromValue={filters.after}
          toValue={filters.before}
          onRangeChange={(from, to) => onFiltersChange({ ...filters, after: from, before: to })}
        />
      </div>
    </div>
  );
}
