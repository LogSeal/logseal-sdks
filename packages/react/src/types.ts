import type { ReactNode, ComponentType } from 'react';
import type { AuditEvent, ViewerFilters, ViewerState } from '@logseal/viewer-core';

// Hook return type
export interface UseAuditLogReturn extends ViewerState {
  loadMore: () => void;
  setFilters: (filters: ViewerFilters) => void;
  refresh: () => void;
}

// Column definition for the event table
export interface ColumnDef {
  key: string;
  header: string;
  render: (event: AuditEvent) => ReactNode;
  width?: string;
}

// Class names for style overrides
export interface ClassNames {
  root?: string;
  filterBar?: string;
  table?: string;
  headerRow?: string;
  row?: string;
  rowExpanded?: string;
  detail?: string;
  pagination?: string;
  empty?: string;
  error?: string;
  loading?: string;
}

// Sub-component props
export interface FilterBarProps {
  actions: string[];
  filters: ViewerFilters;
  onFiltersChange: (filters: ViewerFilters) => void;
  className?: string;
}

export interface EventTableProps {
  events: AuditEvent[];
  columns: ColumnDef[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  classNames?: ClassNames;
}

export interface EventRowProps {
  event: AuditEvent;
  columns: ColumnDef[];
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  expandedClassName?: string;
}

export interface EventDetailProps {
  event: AuditEvent;
  className?: string;
}

export interface PaginationProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  className?: string;
}

export interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters?: () => void;
  className?: string;
}

export interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  className?: string;
}

export interface LoadingStateProps {
  rows?: number;
  className?: string;
}

// Replaceable sub-components
export interface Components {
  FilterBar?: ComponentType<FilterBarProps>;
  EventTable?: ComponentType<EventTableProps>;
  EventRow?: ComponentType<EventRowProps>;
  EventDetail?: ComponentType<EventDetailProps>;
  Pagination?: ComponentType<PaginationProps>;
  EmptyState?: ComponentType<EmptyStateProps>;
  ErrorState?: ComponentType<ErrorStateProps>;
  LoadingState?: ComponentType<LoadingStateProps>;
}

// Main component props
export interface AuditLogViewerProps {
  token: string;
  baseUrl?: string;
  onTokenExpired?: () => Promise<string> | string;
  pageSize?: number;
  filters?: ViewerFilters;
  columns?: ColumnDef[];
  classNames?: ClassNames;
  components?: Components;
  onEventClick?: (event: AuditEvent) => void;
  emptyState?: ReactNode;
  locale?: string;
}
