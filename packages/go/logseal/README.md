# logseal-go

Official Go SDK for [LogSeal](https://logseal.io) — Audit logging for B2B SaaS.

## Installation

```bash
go get github.com/LogSeal/logseal-go
```

## Quick Start

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"

	"github.com/LogSeal/logseal-go"
)

func main() {
	client := logseal.New("sk_test_...")

	// Emit an event (batched, non-blocking)
	client.Emit(logseal.EmitEventInput{
		Action:         "document.published",
		OrganizationID: "org_acme",
		Actor: logseal.ActorInput{
			ID:    "user_123",
			Name:  "Jane Smith",
			Email: "jane@acme.com",
		},
		Targets: []logseal.TargetInput{{
			Type: "document",
			ID:   "doc_456",
			Name: "Q3 Report",
		}},
		Metadata: map[string]interface{}{
			"previous_status": "draft",
		},
	})

	// Emit and wait for confirmation
	ctx := context.Background()
	resp, err := client.EmitSync(ctx, logseal.EmitEventInput{
		Action:         "user.deleted",
		OrganizationID: "org_acme",
		Actor:          logseal.ActorInput{ID: "admin_1"},
		Targets:        []logseal.TargetInput{{Type: "user", ID: "user_123"}},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Event ID:", resp.ID)

	// Graceful shutdown on SIGINT
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt)
	<-sig
	client.Shutdown(ctx)
}
```

## Configuration

```go
client := logseal.New("sk_live_...",
	logseal.WithBaseURL("https://api.logseal.io"), // Optional override
	logseal.WithBatchSize(100),                     // Events to buffer before auto-flushing
	logseal.WithFlushInterval(5 * time.Second),     // Time between automatic flushes
	logseal.WithMaxRetries(3),                      // Retry attempts on 429 / 5xx
	logseal.WithHTTPClient(customClient),           // Custom *http.Client
)
```

## Querying Events

```go
ctx := context.Background()

// Paginated list
page, err := client.Events.List(ctx, logseal.ListEventsParams{
	OrganizationID: "org_acme",
	Action:         "document.published",
	Limit:          50,
})

for _, event := range page.Data {
	fmt.Println(event.Action, event.Actor.Name)
}

// Auto-paginate through all results
err = client.Events.ListAll(ctx, logseal.ListEventsParams{
	OrganizationID: "org_acme",
}, func(event logseal.AuditEvent) error {
	fmt.Println(event.Action, event.Actor.Name)
	return nil
})
```

## Organizations

```go
orgs, _ := client.Organizations.List(ctx)
org, _ := client.Organizations.Create(ctx, logseal.CreateOrganizationInput{
	ExternalID: "acme",
	Name:       "Acme Corp",
})
org, _ = client.Organizations.Get(ctx, "org_123")
```

## Event Schemas

```go
schemas, _ := client.Schemas.List(ctx)
schema, _ := client.Schemas.Create(ctx, logseal.CreateSchemaInput{
	Action:      "document.updated",
	Description: "Fired when a document is modified",
	TargetTypes: []string{"document"},
})
desc := "Updated description"
schema, _ = client.Schemas.Update(ctx, "sch_123", logseal.UpdateSchemaInput{
	Description: &desc,
})
client.Schemas.Delete(ctx, "sch_123")
```

## Viewer Tokens

```go
token, _ := client.ViewerTokens.Create(ctx, logseal.CreateViewerTokenInput{
	OrganizationID: "org_acme",
	ExpiresIn:      3600, // 1 hour
})
// Pass token.Token to your frontend for the embeddable viewer
```

## Webhooks

```go
webhooks, _ := client.Webhooks.List(ctx)
webhook, _ := client.Webhooks.Create(ctx, logseal.CreateWebhookInput{
	URL:    "https://example.com/webhooks/logseal",
	Events: []string{"*"},
})
fmt.Println("Secret:", webhook.Secret) // Only returned on creation

enabled := false
client.Webhooks.Update(ctx, "whk_123", logseal.UpdateWebhookInput{Enabled: &enabled})
client.Webhooks.Delete(ctx, "whk_123")
```

## Exports

```go
export, _ := client.Exports.Create(ctx, logseal.CreateExportInput{
	OrganizationID: "org_acme",
	Format:         "csv",
	Filters:        &logseal.ExportFilters{After: "2024-01-01"},
})

// Poll until complete
completed, _ := client.Exports.Poll(ctx, export.ID, time.Second, 2*time.Minute)
fmt.Println("Download:", completed.DownloadURL)
```

## Verification

```go
result, _ := client.Events.Verify(ctx, logseal.VerifyParams{
	OrganizationID: "org_acme",
})
fmt.Println(result.Status) // "valid", "broken", or "tampered"
```

## Error Handling

```go
resp, err := client.EmitSync(ctx, event)
if err != nil {
	var apiErr *logseal.Error
	if errors.As(err, &apiErr) {
		fmt.Printf("[%s] %s: %s (HTTP %d)\n",
			apiErr.Type, apiErr.Code, apiErr.Message, apiErr.StatusCode)
	}
}
```

All API errors are returned as `*logseal.Error` which implements the `error` interface:

| Field | Description |
|-------|-------------|
| `Type` | Error category (`authentication_error`, `validation_error`, etc.) |
| `Code` | Machine-readable code (`invalid_api_key`, `missing_required_field`, etc.) |
| `Message` | Human-readable description |
| `Param` | Request parameter that caused the error (if applicable) |
| `StatusCode` | HTTP status code |

## License

MIT
