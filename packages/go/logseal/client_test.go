package logseal_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/LogSeal/logseal-go"
)

func newTestClient(handler http.HandlerFunc) *logseal.Client {
	server := httptest.NewServer(handler)
	return logseal.New("sk_test_abc",
		logseal.WithBaseURL(server.URL),
		logseal.WithMaxRetries(0),
	)
}

func TestNew_PanicsWithoutAPIKey(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("expected panic for empty api key")
		}
	}()
	logseal.New("")
}

func TestEmit_ValidatesAction(t *testing.T) {
	c := newTestClient(func(w http.ResponseWriter, r *http.Request) {})
	defer c.Shutdown(context.Background())

	err := c.Emit(logseal.EmitEventInput{
		OrganizationID: "org_1",
		Actor:          logseal.ActorInput{ID: "u1"},
	})
	if err == nil {
		t.Fatal("expected error for missing action")
	}
	apiErr, ok := err.(*logseal.Error)
	if !ok {
		t.Fatalf("expected *logseal.Error, got %T", err)
	}
	if apiErr.Param != "Action" {
		t.Fatalf("expected param 'Action', got %q", apiErr.Param)
	}
}

func TestEmit_ValidatesActorID(t *testing.T) {
	c := newTestClient(func(w http.ResponseWriter, r *http.Request) {})
	defer c.Shutdown(context.Background())

	err := c.Emit(logseal.EmitEventInput{
		Action:         "test",
		OrganizationID: "org_1",
	})
	if err == nil {
		t.Fatal("expected error for missing actor ID")
	}
}

func TestEmit_ValidatesOrganizationID(t *testing.T) {
	c := newTestClient(func(w http.ResponseWriter, r *http.Request) {})
	defer c.Shutdown(context.Background())

	err := c.Emit(logseal.EmitEventInput{
		Action: "test",
		Actor:  logseal.ActorInput{ID: "u1"},
	})
	if err == nil {
		t.Fatal("expected error for missing organization ID")
	}
}

func TestEmitSync(t *testing.T) {
	c := newTestClient(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":              "evt_1",
			"action":          "user.login",
			"occurred_at":     "2025-01-01T00:00:00Z",
			"received_at":     "2025-01-01T00:00:00Z",
			"organization_id": "org_acme",
			"object":          "event",
		})
	})
	defer c.Shutdown(context.Background())

	resp, err := c.EmitSync(context.Background(), logseal.EmitEventInput{
		Action:         "user.login",
		OrganizationID: "org_acme",
		Actor:          logseal.ActorInput{ID: "u1"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.ID != "evt_1" {
		t.Fatalf("expected ID 'evt_1', got %q", resp.ID)
	}
}

func TestFlush_Empty(t *testing.T) {
	c := newTestClient(func(w http.ResponseWriter, r *http.Request) {})
	defer c.Shutdown(context.Background())

	n, err := c.Flush(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if n != 0 {
		t.Fatalf("expected 0 sent, got %d", n)
	}
}

func TestFlush_SendsBatch(t *testing.T) {
	c := newTestClient(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"accepted": 2,
			"rejected": 0,
			"object":   "batch",
		})
	})
	defer c.Shutdown(context.Background())

	c.Emit(logseal.EmitEventInput{Action: "a", OrganizationID: "o", Actor: logseal.ActorInput{ID: "u"}})
	c.Emit(logseal.EmitEventInput{Action: "b", OrganizationID: "o", Actor: logseal.ActorInput{ID: "u"}})

	n, err := c.Flush(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if n != 2 {
		t.Fatalf("expected 2 sent, got %d", n)
	}
}

func TestAPIError(t *testing.T) {
	c := newTestClient(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(401)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": map[string]interface{}{
				"type":    "authentication_error",
				"code":    "invalid_api_key",
				"message": "Invalid API key",
			},
		})
	})
	defer c.Shutdown(context.Background())

	_, err := c.EmitSync(context.Background(), logseal.EmitEventInput{
		Action:         "test",
		OrganizationID: "o",
		Actor:          logseal.ActorInput{ID: "u"},
	})
	if err == nil {
		t.Fatal("expected error")
	}
	apiErr, ok := err.(*logseal.Error)
	if !ok {
		t.Fatalf("expected *logseal.Error, got %T", err)
	}
	if apiErr.Type != "authentication_error" {
		t.Fatalf("expected type 'authentication_error', got %q", apiErr.Type)
	}
	if apiErr.StatusCode != 401 {
		t.Fatalf("expected status 401, got %d", apiErr.StatusCode)
	}
}

func TestEventsList(t *testing.T) {
	c := newTestClient(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"data": []map[string]interface{}{
				{
					"id": "evt_1", "action": "user.login",
					"occurred_at": "2025-01-01T00:00:00Z", "received_at": "2025-01-01T00:00:00Z",
					"actor": map[string]interface{}{"id": "u1", "type": "user"},
					"targets": []interface{}{}, "metadata": map[string]interface{}{},
					"context": map[string]interface{}{}, "event_hash": "abc", "object": "event",
				},
			},
			"has_more": false,
			"object":   "list",
		})
	})
	defer c.Shutdown(context.Background())

	page, err := c.Events.List(context.Background(), logseal.ListEventsParams{
		OrganizationID: "org_acme",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(page.Data) != 1 {
		t.Fatalf("expected 1 event, got %d", len(page.Data))
	}
	if page.Data[0].ID != "evt_1" {
		t.Fatalf("expected event ID 'evt_1', got %q", page.Data[0].ID)
	}
}
