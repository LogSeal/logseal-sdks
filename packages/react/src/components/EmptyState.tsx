import type { EmptyStateProps } from '../types.js';

export function EmptyState({ hasFilters, onClearFilters, className }: EmptyStateProps) {
  return (
    <div className={`logseal-empty ${className || ''}`} role="status">
      <p className="logseal-empty__message">
        {hasFilters ? 'No events match your filters.' : 'No events yet.'}
      </p>
      {hasFilters && onClearFilters && (
        <button
          className="logseal-empty__button"
          onClick={onClearFilters}
          type="button"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
