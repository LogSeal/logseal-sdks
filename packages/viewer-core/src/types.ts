// Read-only types for the viewer — duplicated from @logseal/node to avoid server SDK dependency

export interface Actor {
  id: string;
  type: string;
  name?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface Target {
  type: string;
  id: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEvent {
  id: string;
  action: string;
  occurred_at: string;
  received_at: string;
  actor: Actor;
  targets: Target[];
  metadata: Record<string, unknown>;
  context: {
    ip_address?: string;
    user_agent?: string;
    request_id?: string;
  };
  event_hash: string;
  object: 'event';
}

export interface PaginatedList<T> {
  data: T[];
  has_more: boolean;
  next_cursor?: string;
  object: 'list';
}

export interface Export {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: 'csv' | 'json';
  download_url?: string;
  event_count?: number;
  created_at: string;
  expires_at?: string;
  object: 'export';
}

// Client types

export interface ViewerClientConfig {
  token: string;
  baseUrl?: string;
  onTokenExpired?: () => Promise<string> | string;
}

export interface ListEventsParams {
  action?: string;
  actionPrefix?: string;
  actorId?: string;
  after?: string;
  before?: string;
  limit?: number;
  startingAfter?: string;
}

export interface CreateExportParams {
  format: 'csv' | 'json';
  filters?: {
    after?: string;
    before?: string;
    action?: string;
    actorId?: string;
  };
}

// Store types

export interface ViewerFilters {
  action?: string;
  actorId?: string;
  after?: string;
  before?: string;
}

export interface ViewerState {
  events: AuditEvent[];
  actions: string[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  filters: ViewerFilters;
}

export interface EventStoreConfig {
  client: import('./client.js').ViewerClient;
  pageSize?: number;
  initialFilters?: ViewerFilters;
}
