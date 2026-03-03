import type { FilterBarProps } from '../types.js';

export function FilterBar({ actions, filters, onFiltersChange, className }: FilterBarProps) {
  return (
    <div className={`logseal-filter-bar ${className || ''}`} role="search">
      <div className="logseal-filter-bar__field">
        <label className="logseal-filter-bar__label" htmlFor="logseal-filter-action">
          Action
        </label>
        <select
          id="logseal-filter-action"
          className="logseal-filter-bar__select"
          value={filters.action || ''}
          onChange={(e) =>
            onFiltersChange({ ...filters, action: e.target.value || undefined })
          }
        >
          <option value="">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
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

      <div className="logseal-filter-bar__field">
        <label className="logseal-filter-bar__label" htmlFor="logseal-filter-after">
          From
        </label>
        <input
          id="logseal-filter-after"
          className="logseal-filter-bar__input"
          type="date"
          value={filters.after || ''}
          onChange={(e) =>
            onFiltersChange({ ...filters, after: e.target.value || undefined })
          }
        />
      </div>

      <div className="logseal-filter-bar__field">
        <label className="logseal-filter-bar__label" htmlFor="logseal-filter-before">
          To
        </label>
        <input
          id="logseal-filter-before"
          className="logseal-filter-bar__input"
          type="date"
          value={filters.before || ''}
          onChange={(e) =>
            onFiltersChange({ ...filters, before: e.target.value || undefined })
          }
        />
      </div>
    </div>
  );
}
