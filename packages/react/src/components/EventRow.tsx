import { useRef, useEffect } from 'react';
import type { EventRowProps } from '../types.js';

export function EventRow({
  event,
  columns,
  selected,
  onToggle,
  className,
  expandedClassName,
}: EventRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (selected && rowRef.current) {
      requestAnimationFrame(() => {
        const el = rowRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // Only scroll if row isn't already visible in the upper portion of the viewport
        if (rect.top > window.innerHeight * 0.6 || rect.top < 0) {
          window.scrollTo({
            top: window.scrollY + rect.top - 160,
            behavior: 'smooth',
          });
        }
      });
    }
  }, [selected]);

  return (
    <tr
      ref={rowRef}
      className={`logseal-row ${selected ? `logseal-row--expanded ${expandedClassName || ''}` : ''} ${className || ''}`}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      tabIndex={0}
      aria-selected={selected}
      aria-label={event.action}
    >
      {columns.map((col) => (
        <td key={col.key} className="logseal-cell" data-label={col.header}>
          {col.render(event)}
        </td>
      ))}
    </tr>
  );
}
