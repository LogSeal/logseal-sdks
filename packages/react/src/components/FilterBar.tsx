import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { ActionSelect } from './ActionSelect.js';
import type { FilterBarProps } from '../types.js';

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

  // Local draft range so we don't fire API calls on every click
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);
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
  }, [open, fromValue, toValue]);

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
      {open && (
        <div
          ref={popoverRef}
          className="logseal-date-popover"
          role="dialog"
          aria-label="Select date range"
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
        </div>
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
          <ActionSelect
            options={actions}
            value={filters.action}
            onChange={(action) =>
              onFiltersChange({ ...filters, action })
            }
            aria-labelledby="logseal-filter-action-label"
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
