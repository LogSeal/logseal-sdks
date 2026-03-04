// Components
export { AuditLogViewer } from './components/AuditLogViewer.js';
export { FilterBar } from './components/FilterBar.js';
export { EventTable } from './components/EventTable.js';
export { EventRow } from './components/EventRow.js';
export { EventDetail } from './components/EventDetail.js';
export { Pagination } from './components/Pagination.js';
export { EmptyState } from './components/EmptyState.js';
export { ErrorState } from './components/ErrorState.js';
export { LoadingState } from './components/LoadingState.js';
export { ActionBadge } from './components/ActionBadge.js';
export { Header } from './components/Header.js';
export { Footer } from './components/Footer.js';

// Hooks
export { useAuditLog } from './hooks/use-audit-log.js';
export type { UseAuditLogOptions } from './hooks/use-audit-log.js';

// Types
export type {
  AuditLogViewerProps,
  ColumnDef,
  ClassNames,
  Components,
  UseAuditLogReturn,
  FilterBarProps,
  EventTableProps,
  EventRowProps,
  EventDetailProps,
  PaginationProps,
  EmptyStateProps,
  ErrorStateProps,
  LoadingStateProps,
  HeaderProps,
  FooterProps,
  ActionBadgeProps,
} from './types.js';

// Re-export core types consumers commonly need
export type {
  AuditEvent,
  Actor,
  Target,
  ViewerFilters,
  ViewerState,
} from '@logseal/viewer-core';

export { VERSION } from './version.js';
