package logseal

// ActorInput describes the actor performing an audited action.
type ActorInput struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type,omitempty"`
	Name     string                 `json:"name,omitempty"`
	Email    string                 `json:"email,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// TargetInput describes the target of an audited action.
type TargetInput struct {
	Type     string                 `json:"type"`
	ID       string                 `json:"id"`
	Name     string                 `json:"name,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// EventContext contains request context for an event.
type EventContext struct {
	IPAddress string `json:"ip_address,omitempty"`
	UserAgent string `json:"user_agent,omitempty"`
	RequestID string `json:"request_id,omitempty"`
}

// EmitEventInput is the input for emitting an audit event.
type EmitEventInput struct {
	Action         string                 `json:"action"`
	OrganizationID string                 `json:"organization_id"`
	Actor          ActorInput             `json:"actor"`
	Targets        []TargetInput          `json:"targets,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	Context        *EventContext          `json:"context,omitempty"`
	OccurredAt     string                 `json:"occurred_at,omitempty"`
	IdempotencyKey string                 `json:"idempotency_key,omitempty"`
}

// EmitEventResponse is the response from emitting a single event.
type EmitEventResponse struct {
	ID             string `json:"id"`
	Action         string `json:"action"`
	OccurredAt     string `json:"occurred_at"`
	ReceivedAt     string `json:"received_at"`
	OrganizationID string `json:"organization_id"`
	Object         string `json:"object"`
}

// BatchEmitResponse is the response from a batch emit.
type BatchEmitResponse struct {
	Accepted int    `json:"accepted"`
	Rejected int    `json:"rejected"`
	Object   string `json:"object"`
}

// Actor is an actor as returned by the API.
type Actor struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Name     string                 `json:"name,omitempty"`
	Email    string                 `json:"email,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// Target is a target as returned by the API.
type Target struct {
	Type     string                 `json:"type"`
	ID       string                 `json:"id"`
	Name     string                 `json:"name,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// AuditEvent is a full audit event record.
type AuditEvent struct {
	ID         string                 `json:"id"`
	Action     string                 `json:"action"`
	OccurredAt string                 `json:"occurred_at"`
	ReceivedAt string                 `json:"received_at"`
	Actor      Actor                  `json:"actor"`
	Targets    []Target               `json:"targets"`
	Metadata   map[string]interface{} `json:"metadata"`
	Context    map[string]interface{} `json:"context"`
	EventHash  string                 `json:"event_hash"`
	Object     string                 `json:"object"`
}

// PaginatedList is a generic paginated response.
type PaginatedList[T any] struct {
	Data       []T    `json:"data"`
	HasMore    bool   `json:"has_more"`
	NextCursor string `json:"next_cursor,omitempty"`
	Object     string `json:"object"`
}

// ListEventsParams are the query parameters for listing events.
type ListEventsParams struct {
	OrganizationID string
	Action         string
	ActionPrefix   string
	ActorID        string
	TargetType     string
	TargetID       string
	After          string
	Before         string
	Search         string
	Limit          int
	Cursor         string
}

// Organization is an organization record.
type Organization struct {
	ID          string `json:"id"`
	ExternalID  string `json:"external_id"`
	Name        string `json:"name,omitempty"`
	Environment string `json:"environment"`
	CreatedAt   string `json:"created_at"`
	Object      string `json:"object"`
}

// CreateOrganizationInput is the input for creating an organization.
type CreateOrganizationInput struct {
	ExternalID string `json:"external_id"`
	Name       string `json:"name,omitempty"`
}

// EventSchema is an event schema definition.
type EventSchema struct {
	ID             string                 `json:"id"`
	Action         string                 `json:"action"`
	Description    string                 `json:"description,omitempty"`
	TargetTypes    []string               `json:"target_types"`
	MetadataSchema map[string]interface{} `json:"metadata_schema,omitempty"`
	Version        int                    `json:"version"`
	CreatedAt      string                 `json:"created_at"`
	Object         string                 `json:"object"`
}

// CreateSchemaInput is the input for creating an event schema.
type CreateSchemaInput struct {
	Action         string                 `json:"action"`
	Description    string                 `json:"description,omitempty"`
	TargetTypes    []string               `json:"target_types,omitempty"`
	MetadataSchema map[string]interface{} `json:"metadata_schema,omitempty"`
}

// UpdateSchemaInput is the input for updating an event schema.
type UpdateSchemaInput struct {
	Description    *string                `json:"description,omitempty"`
	TargetTypes    []string               `json:"target_types,omitempty"`
	MetadataSchema map[string]interface{} `json:"metadata_schema,omitempty"`
}

// ViewerToken is a viewer token for the embeddable log viewer.
type ViewerToken struct {
	Token          string `json:"token"`
	ExpiresAt      string `json:"expires_at"`
	OrganizationID string `json:"organization_id"`
	Object         string `json:"object"`
}

// CreateViewerTokenInput is the input for creating a viewer token.
type CreateViewerTokenInput struct {
	OrganizationID string `json:"organization_id"`
	ExpiresIn      int    `json:"expires_in,omitempty"`
}

// Webhook is a webhook configuration.
type Webhook struct {
	ID             string   `json:"id"`
	URL            string   `json:"url"`
	OrganizationID string   `json:"organization_id,omitempty"`
	Events         []string `json:"events"`
	Enabled        bool     `json:"enabled"`
	CreatedAt      string   `json:"created_at"`
	Object         string   `json:"object"`
}

// WebhookWithSecret is a webhook including its signing secret (returned on creation).
type WebhookWithSecret struct {
	Webhook
	Secret string `json:"secret"`
}

// CreateWebhookInput is the input for creating a webhook.
type CreateWebhookInput struct {
	URL            string   `json:"url"`
	OrganizationID string   `json:"organization_id,omitempty"`
	Events         []string `json:"events,omitempty"`
	Enabled        *bool    `json:"enabled,omitempty"`
}

// UpdateWebhookInput is the input for updating a webhook.
type UpdateWebhookInput struct {
	URL     string   `json:"url,omitempty"`
	Events  []string `json:"events,omitempty"`
	Enabled *bool    `json:"enabled,omitempty"`
}

// Export is an export job record.
type Export struct {
	ID          string `json:"id"`
	Status      string `json:"status"`
	Format      string `json:"format"`
	DownloadURL string `json:"download_url,omitempty"`
	EventCount  int    `json:"event_count,omitempty"`
	CreatedAt   string `json:"created_at"`
	ExpiresAt   string `json:"expires_at,omitempty"`
	Object      string `json:"object"`
}

// ExportFilters are optional filters for an export job.
type ExportFilters struct {
	After   string `json:"after,omitempty"`
	Before  string `json:"before,omitempty"`
	Action  string `json:"action,omitempty"`
	ActorID string `json:"actor_id,omitempty"`
}

// CreateExportInput is the input for creating an export job.
type CreateExportInput struct {
	OrganizationID string         `json:"organization_id"`
	Format         string         `json:"format"`
	Filters        *ExportFilters `json:"filters,omitempty"`
}

// VerifyParams are the parameters for hash-chain verification.
type VerifyParams struct {
	OrganizationID string `json:"organization_id"`
	After          string `json:"after,omitempty"`
	Before         string `json:"before,omitempty"`
}

// VerifyResponse is the response from hash-chain verification.
type VerifyResponse struct {
	Status        string `json:"status"`
	EventsChecked int    `json:"events_checked"`
	VerifiedAt    string `json:"verified_at"`
	ChainStart    string `json:"chain_start,omitempty"`
	ChainEnd      string `json:"chain_end,omitempty"`
	BrokenAt      string `json:"broken_at,omitempty"`
	TamperedEvent string `json:"tampered_event,omitempty"`
	ExpectedHash  string `json:"expected_hash,omitempty"`
	ActualHash    string `json:"actual_hash,omitempty"`
}

// VerifyRangeParams are the parameters for range verification.
type VerifyRangeParams struct {
	OrganizationID string `json:"organization_id"`
	FromSequence   int    `json:"from_sequence"`
	ToSequence     int    `json:"to_sequence"`
}

// VerifyRangeResponse is the response from range verification.
type VerifyRangeResponse struct {
	Status             string         `json:"status"`
	EventsChecked      int            `json:"events_checked"`
	VerifiedAt         string         `json:"verified_at"`
	VerificationMethod string         `json:"verification_method,omitempty"`
	PathLength         int            `json:"path_length,omitempty"`
	Range              map[string]int `json:"range,omitempty"`
	BrokenAt           string         `json:"broken_at,omitempty"`
	BrokenAtSequence   int            `json:"broken_at_sequence,omitempty"`
	ExpectedHash       string         `json:"expected_hash,omitempty"`
	ActualHash         string         `json:"actual_hash,omitempty"`
	SkipHash           string         `json:"skip_hash,omitempty"`
	Reason             string         `json:"reason,omitempty"`
}

// MerkleProofResponse is the Merkle proof for an individual event.
type MerkleProofResponse struct {
	EventID      string                   `json:"event_id"`
	EventHash    string                   `json:"event_hash"`
	LeafIndex    int                      `json:"leaf_index"`
	MerkleTreeID string                   `json:"merkle_tree_id"`
	RootHash     string                   `json:"root_hash"`
	Proof        []map[string]interface{} `json:"proof"`
	Anchored     bool                     `json:"anchored"`
	CTTimestamp  string                   `json:"ct_timestamp,omitempty"`
	CTLogID      string                   `json:"ct_log_id,omitempty"`
	Object       string                   `json:"object"`
}
