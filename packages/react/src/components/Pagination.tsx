import type { PaginationProps } from '../types.js';

export function Pagination({ hasMore, loading, onLoadMore, className }: PaginationProps) {
  if (!hasMore) return null;

  return (
    <div className={`logseal-pagination ${className || ''}`}>
      <button
        className="logseal-pagination__button"
        onClick={onLoadMore}
        disabled={loading}
        type="button"
      >
        {loading ? 'Loading...' : 'Load more'}
      </button>
    </div>
  );
}
