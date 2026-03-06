# logseal

Official Ruby SDK for [LogSeal](https://logseal.io) — Audit logging for B2B SaaS.

## Installation

Add to your Gemfile:

```ruby
gem "logseal"
```

Or install directly:

```bash
gem install logseal
```

## Quick Start

```ruby
require "logseal"

client = LogSeal.new(api_key: "sk_test_...")

# Emit an event (batched, non-blocking)
client.emit(
  action: "document.published",
  organization_id: "org_acme",
  actor: { id: "user_123", name: "Jane Smith", email: "jane@acme.com" },
  targets: [{ type: "document", id: "doc_456", name: "Q3 Report" }],
  metadata: { previous_status: "draft" }
)

# Emit and wait for confirmation
event = client.emit_sync(
  action: "user.deleted",
  organization_id: "org_acme",
  actor: { id: "admin_1" },
  targets: [{ type: "user", id: "user_123" }]
)
puts "Event ID: #{event['id']}"

# Graceful shutdown (flushes remaining events)
at_exit { client.shutdown }
```

## Configuration

```ruby
client = LogSeal.new(
  api_key: "sk_live_...",          # Required
  base_url: "https://api.logseal.io", # Optional override
  batch_size: 100,                 # Events to buffer before auto-flushing
  flush_interval: 5,              # Seconds between automatic flushes
  max_retries: 3                  # Retry attempts on 429 / 5xx responses
)
```

## Querying Events

```ruby
# Paginated list
page = client.events.list(
  organization_id: "org_acme",
  action: "document.published",
  limit: 50
)

page["data"].each do |event|
  puts "#{event['action']} by #{event.dig('actor', 'name')}"
end

# Auto-paginate through all results
client.events.list_all(organization_id: "org_acme") do |event|
  puts event["action"]
end

# Or use as an Enumerator
client.events.list_all(organization_id: "org_acme").each_with_index do |event, i|
  break if i >= 1000
  puts event["action"]
end
```

## Organizations

```ruby
orgs = client.organizations.list
org = client.organizations.create(external_id: "acme", name: "Acme Corp")
org = client.organizations.get("org_123")
```

## Event Schemas

```ruby
schemas = client.schemas.list
schema = client.schemas.create(
  action: "document.updated",
  description: "Fired when a document is modified",
  target_types: ["document"]
)
schema = client.schemas.update("sch_123", description: "Updated desc")
client.schemas.delete("sch_123")
```

## Viewer Tokens

```ruby
token = client.viewer_tokens.create(organization_id: "org_acme", expires_in: 3600)
# Pass token["token"] to your frontend for the embeddable viewer
```

## Webhooks

```ruby
webhooks = client.webhooks.list
webhook = client.webhooks.create(url: "https://example.com/webhooks/logseal", events: ["*"])
puts "Secret: #{webhook['secret']}" # Only returned on creation

client.webhooks.update("whk_123", enabled: false)
client.webhooks.delete("whk_123")
```

## Exports

```ruby
export = client.exports.create(
  organization_id: "org_acme",
  format: "csv",
  filters: { after: "2024-01-01" }
)

# Poll until complete
completed = client.exports.poll(export["id"], timeout: 120)
puts "Download: #{completed['download_url']}"
```

## Verification

```ruby
result = client.events.verify(organization_id: "org_acme")
puts result["status"] # "valid", "broken", or "tampered"
```

## Error Handling

```ruby
begin
  client.emit_sync(action: "test", organization_id: "o", actor: { id: "u" })
rescue LogSeal::Error => e
  puts "[#{e.type}] #{e.code}: #{e.message}"
  puts "HTTP status: #{e.status_code}"
end
```

All API errors are raised as `LogSeal::Error`:

| Method | Description |
|--------|-------------|
| `type` | Error category (`authentication_error`, `validation_error`, etc.) |
| `code` | Machine-readable code (`invalid_api_key`, `missing_required_field`, etc.) |
| `message` | Human-readable description |
| `param` | Request parameter that caused the error (if applicable) |
| `status_code` | HTTP status code |

## Requirements

- Ruby 3.0+
- Faraday 2.x

## License

MIT
