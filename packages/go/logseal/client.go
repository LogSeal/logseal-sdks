// Package logseal provides the official Go SDK for the LogSeal audit logging API.
//
// Create a client with [New], then use the resource sub-clients (Events, Organizations,
// Schemas, ViewerTokens, Webhooks, Exports) to interact with the API.
//
//	client := logseal.New("sk_test_...")
//	resp, err := client.EmitSync(ctx, logseal.EmitEventInput{...})
package logseal

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net/http"
	"net/url"
	"sync"
	"time"
)

const (
	defaultBaseURL      = "https://api.logseal.io"
	defaultBatchSize    = 100
	defaultFlushInterval = 5 * time.Second
	defaultMaxRetries   = 3
	defaultTimeout      = 30 * time.Second
	version             = "0.1.0"
)

// ClientOption configures a [Client].
type ClientOption func(*Client)

// WithBaseURL overrides the API base URL.
func WithBaseURL(u string) ClientOption {
	return func(c *Client) { c.baseURL = u }
}

// WithBatchSize sets the number of events to buffer before auto-flushing.
func WithBatchSize(n int) ClientOption {
	return func(c *Client) { c.batchSize = n }
}

// WithFlushInterval sets the maximum time between automatic flushes.
func WithFlushInterval(d time.Duration) ClientOption {
	return func(c *Client) { c.flushInterval = d }
}

// WithMaxRetries sets the number of retry attempts on 429 / 5xx responses.
func WithMaxRetries(n int) ClientOption {
	return func(c *Client) { c.maxRetries = n }
}

// WithHTTPClient sets a custom *http.Client for all API requests.
func WithHTTPClient(hc *http.Client) ClientOption {
	return func(c *Client) { c.httpClient = hc }
}

// Client is the LogSeal API client.
type Client struct {
	apiKey        string
	baseURL       string
	batchSize     int
	flushInterval time.Duration
	maxRetries    int
	httpClient    *http.Client

	mu    sync.Mutex
	queue []EmitEventInput
	stop  chan struct{}
	done  chan struct{}

	Events        *EventsService
	Organizations *OrganizationsService
	Schemas       *SchemasService
	ViewerTokens  *ViewerTokensService
	Webhooks      *WebhooksService
	Exports       *ExportsService
}

// New creates a new LogSeal client. The apiKey is required.
func New(apiKey string, opts ...ClientOption) *Client {
	if apiKey == "" {
		panic("logseal: api key is required")
	}

	c := &Client{
		apiKey:        apiKey,
		baseURL:       defaultBaseURL,
		batchSize:     defaultBatchSize,
		flushInterval: defaultFlushInterval,
		maxRetries:    defaultMaxRetries,
		httpClient:    &http.Client{Timeout: defaultTimeout},
		stop:          make(chan struct{}),
		done:          make(chan struct{}),
	}

	for _, opt := range opts {
		opt(c)
	}

	c.Events = &EventsService{client: c}
	c.Organizations = &OrganizationsService{client: c}
	c.Schemas = &SchemasService{client: c}
	c.ViewerTokens = &ViewerTokensService{client: c}
	c.Webhooks = &WebhooksService{client: c}
	c.Exports = &ExportsService{client: c}

	go c.flushLoop()

	return c
}

// Emit queues an event for batched delivery. It returns immediately.
// Events are sent when the queue reaches BatchSize or after FlushInterval.
func (c *Client) Emit(event EmitEventInput) error {
	if err := validateEvent(event); err != nil {
		return err
	}

	c.mu.Lock()
	c.queue = append(c.queue, event)
	queueLen := len(c.queue)
	c.mu.Unlock()

	if queueLen >= c.batchSize {
		_, err := c.Flush(context.Background())
		return err
	}
	return nil
}

// EmitSync sends a single event and waits for server confirmation.
func (c *Client) EmitSync(ctx context.Context, event EmitEventInput) (*EmitEventResponse, error) {
	if err := validateEvent(event); err != nil {
		return nil, err
	}
	var resp EmitEventResponse
	err := c.do(ctx, http.MethodPost, "/v1/events", formatEvent(event), &resp)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// Flush sends all queued events to the API immediately.
func (c *Client) Flush(ctx context.Context) (int, error) {
	c.mu.Lock()
	if len(c.queue) == 0 {
		c.mu.Unlock()
		return 0, nil
	}
	events := c.queue
	c.queue = nil
	c.mu.Unlock()

	body := map[string]interface{}{
		"events": formatEvents(events),
	}

	var resp BatchEmitResponse
	if err := c.do(ctx, http.MethodPost, "/v1/events/batch", body, &resp); err != nil {
		c.mu.Lock()
		c.queue = append(events, c.queue...)
		c.mu.Unlock()
		return 0, err
	}

	return resp.Accepted, nil
}

// Shutdown stops the background flush loop, flushes remaining events, and
// releases resources. Call this before your process exits.
func (c *Client) Shutdown(ctx context.Context) error {
	close(c.stop)
	<-c.done
	_, err := c.Flush(ctx)
	return err
}

func (c *Client) flushLoop() {
	defer close(c.done)
	ticker := time.NewTicker(c.flushInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			c.Flush(context.Background()) //nolint:errcheck
		case <-c.stop:
			return
		}
	}
}

func (c *Client) do(ctx context.Context, method, path string, body, result interface{}) error {
	return c.doRetry(ctx, method, path, body, result, 0)
}

func (c *Client) doRetry(ctx context.Context, method, path string, body, result interface{}, retry int) error {
	u := c.baseURL + path

	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("logseal: marshal request: %w", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, u, bodyReader)
	if err != nil {
		return fmt.Errorf("logseal: create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "logseal-go/"+version)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("logseal: send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("logseal: read response: %w", err)
	}

	// Retry on rate limit or server errors
	if resp.StatusCode == 429 || resp.StatusCode >= 500 {
		if retry < c.maxRetries {
			delay := math.Min(float64(time.Second)*math.Pow(2, float64(retry)), 30*float64(time.Second))
			jitter := delay * 0.2 * rand.Float64()
			time.Sleep(time.Duration(delay + jitter))
			return c.doRetry(ctx, method, path, body, result, retry+1)
		}
	}

	if resp.StatusCode >= 400 {
		return parseError(respBody, resp.StatusCode)
	}

	if result != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, result); err != nil {
			return fmt.Errorf("logseal: decode response: %w", err)
		}
	}

	return nil
}

func (c *Client) doWithQuery(ctx context.Context, method, path string, params url.Values, result interface{}) error {
	if len(params) > 0 {
		path = path + "?" + params.Encode()
	}
	return c.do(ctx, method, path, nil, result)
}

func validateEvent(e EmitEventInput) error {
	if e.Action == "" {
		return &Error{Type: "validation_error", Code: "missing_required_field", Message: "The 'Action' field is required.", Param: "Action"}
	}
	if e.Actor.ID == "" {
		return &Error{Type: "validation_error", Code: "missing_required_field", Message: "The 'Actor.ID' field is required.", Param: "Actor.ID"}
	}
	if e.OrganizationID == "" {
		return &Error{Type: "validation_error", Code: "missing_required_field", Message: "The 'OrganizationID' field is required.", Param: "OrganizationID"}
	}
	return nil
}

func formatEvent(e EmitEventInput) map[string]interface{} {
	m := map[string]interface{}{
		"action":          e.Action,
		"organization_id": e.OrganizationID,
		"actor": map[string]interface{}{
			"id":    e.Actor.ID,
			"type":  e.Actor.Type,
			"name":  e.Actor.Name,
			"email": e.Actor.Email,
		},
	}
	if e.Actor.Metadata != nil {
		m["actor"].(map[string]interface{})["metadata"] = e.Actor.Metadata
	}
	if len(e.Targets) > 0 {
		targets := make([]map[string]interface{}, len(e.Targets))
		for i, t := range e.Targets {
			targets[i] = map[string]interface{}{
				"type": t.Type,
				"id":   t.ID,
				"name": t.Name,
			}
			if t.Metadata != nil {
				targets[i]["metadata"] = t.Metadata
			}
		}
		m["targets"] = targets
	}
	if e.Metadata != nil {
		m["metadata"] = e.Metadata
	}
	if e.Context != nil {
		m["context"] = map[string]interface{}{
			"ip_address": e.Context.IPAddress,
			"user_agent": e.Context.UserAgent,
			"request_id": e.Context.RequestID,
		}
	}
	if e.OccurredAt != "" {
		m["occurred_at"] = e.OccurredAt
	}
	if e.IdempotencyKey != "" {
		m["idempotency_key"] = e.IdempotencyKey
	}
	return m
}

func formatEvents(events []EmitEventInput) []map[string]interface{} {
	out := make([]map[string]interface{}, len(events))
	for i, e := range events {
		out[i] = formatEvent(e)
	}
	return out
}
