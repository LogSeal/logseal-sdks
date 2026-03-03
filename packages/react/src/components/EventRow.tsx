import { EventDetail } from './EventDetail.js';
import type { EventRowProps } from '../types.js';

export function EventRow({
  event,
  columns,
  expanded,
  onToggle,
  className,
  expandedClassName,
}: EventRowProps) {
  return (
    <>
      <tr
        className={`logseal-row ${expanded ? `logseal-row--expanded ${expandedClassName || ''}` : ''} ${className || ''}`}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
      >
        {columns.map((col) => (
          <td key={col.key} className="logseal-cell">
            {col.render(event)}
          </td>
        ))}
      </tr>
      {expanded && (
        <tr className="logseal-row__detail-row">
          <td colSpan={columns.length} className="logseal-row__detail-cell">
            <EventDetail event={event} />
          </td>
        </tr>
      )}
    </>
  );
}
