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

  const prevSelected = useRef(false);

  useEffect(() => {
    const wasSelected = prevSelected.current;
    prevSelected.current = selected;

    // Only scroll when transitioning from unselected → selected
    if (!selected || wasSelected) return;
    if (!rowRef.current) return;

    requestAnimationFrame(() => {
      const el = rowRef.current;
      if (!el) return;

      // Find the nearest scrollable ancestor (e.g. constrained table area)
      const scrollParent = el.closest('.logseal-viewer__table-area') as HTMLElement | null;
      if (scrollParent && scrollParent.scrollHeight > scrollParent.clientHeight) {
        const elRect = el.getBoundingClientRect();
        const parentRect = scrollParent.getBoundingClientRect();
        // Only scroll if the row is outside the visible area of the scroll parent
        if (elRect.bottom > parentRect.bottom || elRect.top < parentRect.top) {
          const offsetTop = elRect.top - parentRect.top + scrollParent.scrollTop;
          scrollParent.scrollTo({
            top: offsetTop - 80,
            behavior: 'smooth',
          });
        }
      } else {
        // Fallback: scroll the window
        const rect = el.getBoundingClientRect();
        if (rect.bottom > window.innerHeight || rect.top < 0) {
          window.scrollTo({
            top: window.scrollY + rect.top - 160,
            behavior: 'smooth',
          });
        }
      }
    });
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
