import { useState, useCallback, useMemo } from 'react';
import { formatRelativeTime, type AuditEvent } from '@logseal/viewer-core';
import { useAuditLog } from '../hooks/use-audit-log.js';
import { FilterBar as DefaultFilterBar } from './FilterBar.js';
import { EventTable as DefaultEventTable } from './EventTable.js';
import { Pagination as DefaultPagination } from './Pagination.js';
import { EmptyState as DefaultEmptyState } from './EmptyState.js';
import { ErrorState as DefaultErrorState } from './ErrorState.js';
import { LoadingState as DefaultLoadingState } from './LoadingState.js';
import type { AuditLogViewerProps, ColumnDef } from '../types.js';

function defaultColumns(): ColumnDef[] {
  return [
    {
      key: 'action',
      header: 'Action',
      render: (event: AuditEvent) => event.action,
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (event: AuditEvent) =>
        event.actor.name || event.actor.email || event.actor.id,
    },
    {
      key: 'targets',
      header: 'Targets',
      render: (event: AuditEvent) =>
        event.targets.map((t) => t.name || `${t.type}:${t.id}`).join(', ') || '-',
    },
    {
      key: 'date',
      header: 'Date',
      render: (event: AuditEvent) => formatRelativeTime(event.occurred_at),
      width: '120px',
    },
  ];
}

export function AuditLogViewer({
  token,
  baseUrl,
  onTokenExpired,
  pageSize,
  filters: externalFilters,
  columns: customColumns,
  classNames,
  components,
  onEventClick,
  emptyState: customEmptyState,
}: AuditLogViewerProps) {
  const {
    events,
    actions,
    loading,
    loadingMore,
    error,
    hasMore,
    filters,
    loadMore,
    setFilters,
    refresh,
  } = useAuditLog({
    token,
    baseUrl,
    onTokenExpired,
    pageSize,
    filters: externalFilters,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const columns = useMemo(() => customColumns || defaultColumns(), [customColumns]);

  const handleToggle = useCallback(
    (id: string) => {
      if (onEventClick) {
        const event = events.find((e) => e.id === id);
        if (event) onEventClick(event);
      }
      setExpandedId((prev) => (prev === id ? null : id));
    },
    [events, onEventClick],
  );

  const hasActiveFilters = Boolean(
    filters.action || filters.actorId || filters.after || filters.before,
  );

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  // Resolve components (allow overrides)
  const FilterBar = components?.FilterBar || DefaultFilterBar;
  const EventTable = components?.EventTable || DefaultEventTable;
  const PaginationComponent = components?.Pagination || DefaultPagination;
  const EmptyStateComponent = components?.EmptyState || DefaultEmptyState;
  const ErrorStateComponent = components?.ErrorState || DefaultErrorState;
  const LoadingStateComponent = components?.LoadingState || DefaultLoadingState;

  return (
    <div className={`logseal-viewer ${classNames?.root || ''}`}>
      <FilterBar
        actions={actions}
        filters={filters}
        onFiltersChange={setFilters}
        className={classNames?.filterBar}
      />

      {loading && <LoadingStateComponent className={classNames?.loading} />}

      {error && !loading && (
        <ErrorStateComponent
          message={error}
          onRetry={refresh}
          className={classNames?.error}
        />
      )}

      {!loading && !error && events.length === 0 &&
        (customEmptyState || (
          <EmptyStateComponent
            hasFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            className={classNames?.empty}
          />
        ))}

      {!loading && !error && events.length > 0 && (
        <>
          <EventTable
            events={events}
            columns={columns}
            expandedId={expandedId}
            onToggle={handleToggle}
            classNames={classNames}
          />
          <PaginationComponent
            hasMore={hasMore}
            loading={loadingMore}
            onLoadMore={loadMore}
            className={classNames?.pagination}
          />
        </>
      )}
    </div>
  );
}
