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
  header?: string;
  footer?: string;
  actionBadge?: string;
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
export interface HeaderProps {
  title: string;
  organization?: string;
  className?: string;
}

export interface FooterProps {
  className?: string;
}

export interface ActionBadgeProps {
  action: string;
  className?: string;
}

export interface FilterBarProps {
  actions: string[];
  filters: ViewerFilters;
  onFiltersChange: (filters: ViewerFilters) => void;
  hasActiveFilters?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
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
  selected: boolean;
  onToggle: () => void;
  className?: string;
  expandedClassName?: string;
}

export interface DetailPopoverProps {
  event: AuditEvent | null;
  onClose: () => void;
  className?: string;
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
  Header?: ComponentType<HeaderProps>;
  Footer?: ComponentType<FooterProps>;
  ActionBadge?: ComponentType<ActionBadgeProps>;
  FilterBar?: ComponentType<FilterBarProps>;
  EventTable?: ComponentType<EventTableProps>;
  EventRow?: ComponentType<EventRowProps>;
  EventDetail?: ComponentType<EventDetailProps>;
  DetailPopover?: ComponentType<DetailPopoverProps>;
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
  title?: string;
  organization?: string;
  showHeader?: boolean;
  showBranding?: boolean;
  filters?: ViewerFilters;
  columns?: ColumnDef[];
  classNames?: ClassNames;
  components?: Components;
  onEventClick?: (event: AuditEvent) => void;
  emptyState?: ReactNode;
  maxHeight?: string;
}
