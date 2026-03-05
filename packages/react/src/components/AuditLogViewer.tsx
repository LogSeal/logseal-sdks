import { useState, useCallback, useMemo } from 'react';
import { formatRelativeTime, type AuditEvent } from '@logseal/viewer-core';
import { useAuditLog } from '../hooks/use-audit-log.js';
import { FilterBar as DefaultFilterBar } from './FilterBar.js';
import { EventTable as DefaultEventTable } from './EventTable.js';
import { Pagination as DefaultPagination } from './Pagination.js';
import { EmptyState as DefaultEmptyState } from './EmptyState.js';
import { ErrorState as DefaultErrorState } from './ErrorState.js';
import { LoadingState as DefaultLoadingState } from './LoadingState.js';
import { Header as DefaultHeader } from './Header.js';
import { Footer as DefaultFooter } from './Footer.js';
import { ActionBadge as DefaultActionBadge } from './ActionBadge.js';
import { DetailPopover as DefaultDetailPopover } from './DetailPopover.js';
import type { AuditLogViewerProps, ActionBadgeProps, ColumnDef } from '../types.js';
import type { ComponentType } from 'react';

function defaultColumns(
  Badge: ComponentType<ActionBadgeProps>,
  badgeClassName?: string,
): ColumnDef[] {
  return [
    {
      key: 'action',
      header: 'Action',
      render: (event: AuditEvent) => (
        <Badge action={event.action} className={badgeClassName} />
      ),
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

function matchesSearch(event: AuditEvent, query: string): boolean {
  const q = query.toLowerCase();
  return (
    event.action.toLowerCase().includes(q) ||
    event.actor.id.toLowerCase().includes(q) ||
    (event.actor.name || '').toLowerCase().includes(q) ||
    (event.actor.email || '').toLowerCase().includes(q) ||
    event.targets.some(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        (t.name || '').toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q),
    )
  );
}

export function AuditLogViewer({
  token,
  baseUrl,
  onTokenExpired,
  pageSize,
  title = 'Audit Log',
  organization,
  showHeader = true,
  showBranding = true,
  filters: externalFilters,
  columns: customColumns,
  classNames,
  components,
  onEventClick,
  emptyState: customEmptyState,
  maxHeight,
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
  const [searchQuery, setSearchQuery] = useState('');

  // Resolve components (allow overrides)
  const FilterBar = components?.FilterBar || DefaultFilterBar;
  const EventTable = components?.EventTable || DefaultEventTable;
  const PaginationComponent = components?.Pagination || DefaultPagination;
  const EmptyStateComponent = components?.EmptyState || DefaultEmptyState;
  const ErrorStateComponent = components?.ErrorState || DefaultErrorState;
  const LoadingStateComponent = components?.LoadingState || DefaultLoadingState;
  const HeaderComponent = components?.Header || DefaultHeader;
  const FooterComponent = components?.Footer || DefaultFooter;
  const ActionBadge = components?.ActionBadge || DefaultActionBadge;
  const DetailPopover = components?.DetailPopover || DefaultDetailPopover;

  const columns = useMemo(
    () => customColumns || defaultColumns(ActionBadge, classNames?.actionBadge),
    [customColumns, ActionBadge, classNames?.actionBadge],
  );

  // Client-side search filtering
  const filteredEvents = useMemo(
    () => (searchQuery ? events.filter((e) => matchesSearch(e, searchQuery)) : events),
    [events, searchQuery],
  );

  const selectedEvent = useMemo(
    () => (expandedId ? filteredEvents.find((e) => e.id === expandedId) || null : null),
    [expandedId, filteredEvents],
  );

  const handleToggle = useCallback(
    (id: string) => {
      const event = filteredEvents.find((e) => e.id === id);
      if (event && onEventClick) onEventClick(event);
      setExpandedId((prev) => (prev === id ? null : id));
    },
    [filteredEvents, onEventClick],
  );

  const handleClosePopover = useCallback(() => {
    setExpandedId(null);
  }, []);

  const hasActiveFilters = Boolean(
    filters.action || filters.actorId || filters.after || filters.before || searchQuery,
  );

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, [setFilters]);

  return (
    <div
      className={`logseal-viewer ${maxHeight ? 'logseal-viewer--constrained' : ''} ${classNames?.root || ''}`}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {showHeader !== false && (
        <HeaderComponent
          title={title}
          organization={organization}
          className={classNames?.header}
        />
      )}

      <FilterBar
        actions={actions}
        filters={filters}
        onFiltersChange={setFilters}
        hasActiveFilters={hasActiveFilters}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
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

      {!loading && !error && filteredEvents.length === 0 &&
        (customEmptyState || (
          <EmptyStateComponent
            hasFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            className={classNames?.empty}
          />
        ))}

      {!loading && !error && filteredEvents.length > 0 && (
        <>
          <div className="logseal-viewer__table-area">
            <EventTable
              events={filteredEvents}
              columns={columns}
              expandedId={expandedId}
              onToggle={handleToggle}
              classNames={classNames}
            />
          </div>
          <DetailPopover
            event={selectedEvent}
            onClose={handleClosePopover}
            className={classNames?.detail}
          />
          <PaginationComponent
            hasMore={hasMore}
            loading={loadingMore}
            onLoadMore={loadMore}
            className={classNames?.pagination}
          />
        </>
      )}

      {showBranding !== false && (
        <FooterComponent className={classNames?.footer} />
      )}
    </div>
  );
}
