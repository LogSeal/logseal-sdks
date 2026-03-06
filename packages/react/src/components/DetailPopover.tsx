import { useRef, useEffect } from 'react';
import { EventDetail } from './EventDetail.js';
import type { DetailPopoverProps } from '../types.js';

export function DetailPopover({ event, onClose, className }: DetailPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!event) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [event, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Focus management
  useEffect(() => {
    if (event && popoverRef.current) {
      const closeBtn = popoverRef.current.querySelector<HTMLButtonElement>('.logseal-popover__close');
      closeBtn?.focus();
    }
  }, [event]);

  if (!event) return null;

  return (
    <div className="logseal-popover__overlay" onClick={handleBackdropClick}>
      <div
        ref={popoverRef}
        className={`logseal-popover ${className || ''}`}
        role="dialog"
        aria-label="Event details"
      >
        <div className="logseal-popover__header">
          <span className="logseal-popover__title">{event.action}</span>
          <button
            type="button"
            className="logseal-popover__close"
            onClick={onClose}
            aria-label="Close details"
          >
            &times;
          </button>
        </div>
        <div className="logseal-popover__body">
          <EventDetail event={event} />
        </div>
      </div>
    </div>
  );
}
