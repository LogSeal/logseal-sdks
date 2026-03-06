package logseal

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// EventsService handles operations on audit events.
type EventsService struct {
	client *Client
}

// List returns a paginated list of audit events.
func (s *EventsService) List(ctx context.Context, params ListEventsParams) (*PaginatedList[AuditEvent], error) {
	q := url.Values{}
	q.Set("organization_id", params.OrganizationID)
	if params.Action != "" {
		q.Set("action", params.Action)
	}
	if params.ActionPrefix != "" {
		q.Set("action_prefix", params.ActionPrefix)
	}
	if params.ActorID != "" {
		q.Set("actor_id", params.ActorID)
	}
	if params.TargetType != "" {
		q.Set("target_type", params.TargetType)
	}
	if params.TargetID != "" {
		q.Set("target_id", params.TargetID)
	}
	if params.After != "" {
		q.Set("after", params.After)
	}
	if params.Before != "" {
		q.Set("before", params.Before)
	}
	if params.Search != "" {
		q.Set("search", params.Search)
	}
	if params.Limit > 0 {
		q.Set("limit", strconv.Itoa(params.Limit))
	}
	if params.Cursor != "" {
		q.Set("cursor", params.Cursor)
	}

	var result PaginatedList[AuditEvent]
	if err := s.client.doWithQuery(ctx, http.MethodGet, "/v1/events", q, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Get retrieves a single event by ID.
func (s *EventsService) Get(ctx context.Context, eventID string) (*AuditEvent, error) {
	var result AuditEvent
	if err := s.client.do(ctx, http.MethodGet, "/v1/events/"+eventID, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Verify checks the hash-chain integrity for an organization.
func (s *EventsService) Verify(ctx context.Context, params VerifyParams) (*VerifyResponse, error) {
	var result VerifyResponse
	if err := s.client.do(ctx, http.MethodPost, "/v1/events/verify", params, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// VerifyRange checks integrity for a specific sequence range.
func (s *EventsService) VerifyRange(ctx context.Context, params VerifyRangeParams) (*VerifyRangeResponse, error) {
	var result VerifyRangeResponse
	if err := s.client.do(ctx, http.MethodPost, "/v1/events/verify-range", params, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// GetProof retrieves the Merkle proof for an event.
func (s *EventsService) GetProof(ctx context.Context, eventID string) (*MerkleProofResponse, error) {
	var result MerkleProofResponse
	if err := s.client.do(ctx, http.MethodGet, fmt.Sprintf("/v1/events/%s/proof", eventID), nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ListAllFunc is a callback invoked for each event during auto-pagination.
// Return a non-nil error to stop iteration.
type ListAllFunc func(event AuditEvent) error

// ListAll auto-paginates through all matching events, calling fn for each one.
func (s *EventsService) ListAll(ctx context.Context, params ListEventsParams, fn ListAllFunc) error {
	for {
		page, err := s.List(ctx, params)
		if err != nil {
			return err
		}
		for _, event := range page.Data {
			if err := fn(event); err != nil {
				return err
			}
		}
		if !page.HasMore || page.NextCursor == "" {
			return nil
		}
		params.Cursor = page.NextCursor
	}
}

// OrganizationsService handles operations on organizations.
type OrganizationsService struct {
	client *Client
}

// List returns all organizations.
func (s *OrganizationsService) List(ctx context.Context) (*PaginatedList[Organization], error) {
	var result PaginatedList[Organization]
	if err := s.client.do(ctx, http.MethodGet, "/v1/organizations", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Create creates a new organization.
func (s *OrganizationsService) Create(ctx context.Context, input CreateOrganizationInput) (*Organization, error) {
	var result Organization
	if err := s.client.do(ctx, http.MethodPost, "/v1/organizations", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Get retrieves an organization by ID.
func (s *OrganizationsService) Get(ctx context.Context, id string) (*Organization, error) {
	var result Organization
	if err := s.client.do(ctx, http.MethodGet, "/v1/organizations/"+id, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// SchemasService handles operations on event schemas.
type SchemasService struct {
	client *Client
}

// List returns all event schemas.
func (s *SchemasService) List(ctx context.Context) (*PaginatedList[EventSchema], error) {
	var result PaginatedList[EventSchema]
	if err := s.client.do(ctx, http.MethodGet, "/v1/schemas", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Create creates a new event schema.
func (s *SchemasService) Create(ctx context.Context, input CreateSchemaInput) (*EventSchema, error) {
	var result EventSchema
	if err := s.client.do(ctx, http.MethodPost, "/v1/schemas", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Get retrieves a schema by ID.
func (s *SchemasService) Get(ctx context.Context, id string) (*EventSchema, error) {
	var result EventSchema
	if err := s.client.do(ctx, http.MethodGet, "/v1/schemas/"+id, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Update updates an existing schema.
func (s *SchemasService) Update(ctx context.Context, id string, input UpdateSchemaInput) (*EventSchema, error) {
	var result EventSchema
	if err := s.client.do(ctx, http.MethodPatch, "/v1/schemas/"+id, input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Delete deletes a schema.
func (s *SchemasService) Delete(ctx context.Context, id string) error {
	return s.client.do(ctx, http.MethodDelete, "/v1/schemas/"+id, nil, nil)
}

// ViewerTokensService handles operations on viewer tokens.
type ViewerTokensService struct {
	client *Client
}

// Create creates a short-lived viewer token for the embeddable log viewer.
func (s *ViewerTokensService) Create(ctx context.Context, input CreateViewerTokenInput) (*ViewerToken, error) {
	var result ViewerToken
	if err := s.client.do(ctx, http.MethodPost, "/v1/viewer-tokens", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// WebhooksService handles operations on webhooks.
type WebhooksService struct {
	client *Client
}

// List returns all webhooks.
func (s *WebhooksService) List(ctx context.Context) (*PaginatedList[Webhook], error) {
	var result PaginatedList[Webhook]
	if err := s.client.do(ctx, http.MethodGet, "/v1/webhooks", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Create creates a new webhook. The signing secret is only returned on creation.
func (s *WebhooksService) Create(ctx context.Context, input CreateWebhookInput) (*WebhookWithSecret, error) {
	var result WebhookWithSecret
	if err := s.client.do(ctx, http.MethodPost, "/v1/webhooks", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Get retrieves a webhook by ID.
func (s *WebhooksService) Get(ctx context.Context, id string) (*Webhook, error) {
	var result Webhook
	if err := s.client.do(ctx, http.MethodGet, "/v1/webhooks/"+id, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Update updates an existing webhook.
func (s *WebhooksService) Update(ctx context.Context, id string, input UpdateWebhookInput) (*Webhook, error) {
	var result Webhook
	if err := s.client.do(ctx, http.MethodPatch, "/v1/webhooks/"+id, input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Delete deletes a webhook.
func (s *WebhooksService) Delete(ctx context.Context, id string) error {
	return s.client.do(ctx, http.MethodDelete, "/v1/webhooks/"+id, nil, nil)
}

// ExportsService handles operations on export jobs.
type ExportsService struct {
	client *Client
}

// Create starts a new export job.
func (s *ExportsService) Create(ctx context.Context, input CreateExportInput) (*Export, error) {
	var result Export
	if err := s.client.do(ctx, http.MethodPost, "/v1/exports", input, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Get checks the status of an export job.
func (s *ExportsService) Get(ctx context.Context, id string) (*Export, error) {
	var result Export
	if err := s.client.do(ctx, http.MethodGet, "/v1/exports/"+id, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Poll polls an export until it completes or fails.
// interval is the time between polls, timeout is the maximum wait time.
func (s *ExportsService) Poll(ctx context.Context, id string, interval, timeout time.Duration) (*Export, error) {
	if interval == 0 {
		interval = time.Second
	}
	if timeout == 0 {
		timeout = 60 * time.Second
	}

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		export, err := s.Get(ctx, id)
		if err != nil {
			return nil, err
		}
		if export.Status == "completed" || export.Status == "failed" {
			return export, nil
		}

		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(interval):
		}
	}

	return nil, &Error{
		Type:    "internal_error",
		Code:    "export_timeout",
		Message: "Export did not complete within the timeout period.",
	}
}
