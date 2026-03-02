// ============================================
// Paginated List
// ============================================

export interface PaginatedList<T> {
  data: T[];
  has_more: boolean;
  next_cursor?: string;
  object: 'list';
}

// ============================================
// Actor & Target
// ============================================

export interface ActorInput {
  id: string;
  type?: string;
  name?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface Actor {
  id: string;
  type: string;
  name?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface TargetInput {
  type: string;
  id: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface Target {
  type: string;
  id: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Events
// ============================================

export interface EmitEventInput {
  action: string;
  organizationId: string;
  actor: ActorInput;
  targets?: TargetInput[];
  metadata?: Record<string, unknown>;
  context?: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  };
  occurredAt?: string | Date;
  idempotencyKey?: string;
}

export interface EmitEventResponse {
  id: string;
  action: string;
  occurred_at: string;
  received_at: string;
  organization_id: string;
  object: 'event';
}

export interface BatchEmitInput {
  events: EmitEventInput[];
}

export interface BatchEventResult {
  id: string | null;
  action: string;
  status: 'accepted' | 'rejected';
  error?: {
    code: string;
    message: string;
  };
}

export interface BatchEmitResponse {
  events: BatchEventResult[];
  accepted: number;
  rejected: number;
  object: 'batch';
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

export interface ListEventsParams {
  organizationId: string;
  action?: string;
  actionPrefix?: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  after?: string | Date;
  before?: string | Date;
  search?: string;
  limit?: number;
  cursor?: string;
}

// ============================================
// Organizations
// ============================================

export interface Organization {
  id: string;
  external_id: string;
  name?: string;
  environment: 'test' | 'live';
  created_at: string;
  object: 'organization';
}

export interface CreateOrganizationInput {
  externalId: string;
  name?: string;
}

// ============================================
// Event Schemas
// ============================================

export interface EventSchema {
  id: string;
  action: string;
  description?: string;
  target_types: string[];
  metadata_schema?: Record<string, unknown>;
  version: number;
  created_at: string;
  object: 'event_schema';
}

export interface CreateEventSchemaInput {
  action: string;
  description?: string;
  targetTypes?: string[];
  metadataSchema?: Record<string, unknown>;
}

export interface UpdateEventSchemaInput {
  description?: string;
  targetTypes?: string[];
  metadataSchema?: Record<string, unknown>;
}

// ============================================
// Viewer Tokens
// ============================================

export interface ViewerToken {
  token: string;
  expires_at: string;
  organization_id: string;
  object: 'viewer_token';
}

export interface CreateViewerTokenInput {
  organizationId: string;
  expiresIn?: number;
}

// ============================================
// Webhooks
// ============================================

export interface Webhook {
  id: string;
  url: string;
  organization_id?: string;
  events: string[];
  enabled: boolean;
  created_at: string;
  object: 'webhook';
}

export interface WebhookWithSecret extends Webhook {
  secret: string;
}

export interface CreateWebhookInput {
  url: string;
  organizationId?: string;
  events?: string[];
  enabled?: boolean;
}

export interface UpdateWebhookInput {
  url?: string;
  events?: string[];
  enabled?: boolean;
}

// ============================================
// Exports
// ============================================

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

export interface CreateExportInput {
  organizationId: string;
  format: 'csv' | 'json';
  filters?: {
    after?: string | Date;
    before?: string | Date;
    action?: string;
    actorId?: string;
  };
}

// ============================================
// Verification
// ============================================

export interface VerifyParams {
  organizationId: string;
  after?: string | Date;
  before?: string | Date;
}

export interface VerifyResponse {
  status: 'valid' | 'broken' | 'tampered';
  events_checked: number;
  chain_start?: string;
  chain_end?: string;
  verified_at: string;
  broken_at?: string;
  tampered_event?: string;
  expected_hash?: string;
  actual_hash?: string;
}

export interface VerifyRangeParams {
  organizationId: string;
  fromSequence: number;
  toSequence: number;
}

export interface VerifyRangeResponse {
  status: 'valid' | 'broken' | 'unverifiable';
  events_checked: number;
  verification_method?: 'skip_list' | 'sequential';
  path_length?: number;
  range?: { from: number; to: number };
  verified_at: string;
  broken_at?: string;
  broken_at_sequence?: number;
  expected_hash?: string;
  actual_hash?: string;
  skip_hash?: string;
  reason?: string;
}

// ============================================
// Merkle Proofs
// ============================================

export interface MerkleProofResponse {
  event_id: string;
  event_hash: string;
  leaf_index: number;
  merkle_tree_id: string;
  root_hash: string;
  proof: Array<{ hash: string; direction: 'left' | 'right' }>;
  anchored: boolean;
  ct_timestamp?: string;
  ct_log_id?: string;
  object: 'merkle_proof';
}

export interface MerkleProofVerifyInput {
  event_hash: string;
  root_hash: string;
  leaf_index: number;
  proof: Array<{ hash: string; direction: 'left' | 'right' }>;
}

export interface MerkleProofVerifyResponse {
  valid: boolean;
  computed_root: string;
  expected_root: string;
  verified_at: string;
}

export interface MerkleTree {
  id: string;
  organization_id: string;
  environment: string;
  from_sequence: number;
  to_sequence: number;
  tree_index: number;
  root_hash: string;
  leaf_count: number;
  anchored: boolean;
  ct_timestamp?: string;
  ct_log_id?: string;
  created_at: string;
  object: 'merkle_tree';
}
