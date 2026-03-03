import { EventRow } from './EventRow.js';
import type { EventTableProps } from '../types.js';

export function EventTable({ events, columns, expandedId, onToggle, classNames }: EventTableProps) {
  return (
    <div className={`logseal-table-wrapper ${classNames?.table || ''}`}>
      <table className="logseal-table" role="grid">
        <thead>
          <tr className={`logseal-header-row ${classNames?.headerRow || ''}`}>
            {columns.map((col) => (
              <th
                key={col.key}
                className="logseal-header-cell"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              columns={columns}
              expanded={expandedId === event.id}
              onToggle={() => onToggle(event.id)}
              className={classNames?.row}
              expandedClassName={classNames?.rowExpanded}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
