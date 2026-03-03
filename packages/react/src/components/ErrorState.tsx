import type { ErrorStateProps } from '../types.js';

export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={`logseal-error ${className || ''}`} role="alert">
      <p className="logseal-error__message">{message}</p>
      <button className="logseal-error__button" onClick={onRetry} type="button">
        Retry
      </button>
    </div>
  );
}
