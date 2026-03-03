import type { LoadingStateProps } from '../types.js';

const DEFAULT_ROWS = 5;

export function LoadingState({ rows = DEFAULT_ROWS, className }: LoadingStateProps) {
  return (
    <div className={`logseal-loading ${className || ''}`} role="status" aria-label="Loading events">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="logseal-loading__row">
          <div className="logseal-loading__shimmer" />
        </div>
      ))}
    </div>
  );
}
