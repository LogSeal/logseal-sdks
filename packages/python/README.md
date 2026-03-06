# logseal

Official Python SDK for [LogSeal](https://logseal.io) — Audit logging for B2B SaaS.

## Installation

```bash
pip install logseal
```

## Quick Start

```python
import asyncio
from logseal import LogSeal, ActorInput, EmitEventInput, TargetInput

async def main():
    async with LogSeal(api_key="sk_test_...") as client:
        # Emit an event (batched, non-blocking)
        await client.emit(EmitEventInput(
            action="document.published",
            organization_id="org_acme",
            actor=ActorInput(id="user_123", name="Jane Smith", email="jane@acme.com"),
            targets=[TargetInput(type="document", id="doc_456", name="Q3 Report")],
            metadata={"previous_status": "draft"},
        ))

        # Emit and wait for confirmation
        event = await client.emit_sync(EmitEventInput(
            action="user.deleted",
            organization_id="org_acme",
            actor=ActorInput(id="admin_1"),
            targets=[TargetInput(type="user", id="user_123")],
        ))
        print(f"Event ID: {event.id}")

asyncio.run(main())
```

The `async with` block automatically starts the background flush loop and calls `shutdown()` on exit, ensuring all queued events are delivered before your process ends.

## Configuration

```python
client = LogSeal(
    api_key="sk_live_...",       # Required
    base_url="https://api.logseal.dev",  # Optional override
    batch_size=100,              # Events to buffer before auto-flushing
    flush_interval=5.0,          # Seconds between automatic flushes
    max_retries=3,               # Retry attempts on 429 / 5xx responses
    timeout=30,                  # HTTP request timeout in seconds
)
```

## Querying Events

```python
from logseal.types import ListEventsParams

# Paginated list
page = await client.events.list(ListEventsParams(
    organization_id="org_acme",
    action="document.published",
    limit=50,
))

for event in page.data:
    print(event.action, event.actor.name)

# Auto-paginate through all results
async for event in client.events.list_all(organization_id="org_acme"):
    print(event.action, event.actor.name)
```

## Organizations

```python
from logseal.types import CreateOrganizationInput

orgs = await client.organizations.list()
org = await client.organizations.create(CreateOrganizationInput(
    external_id="acme",
    name="Acme Corp",
))
org = await client.organizations.get("org_123")
```

## Event Schemas

```python
from logseal.types import CreateSchemaInput, UpdateSchemaInput

schemas = await client.schemas.list()
schema = await client.schemas.create(CreateSchemaInput(
    action="document.updated",
    description="Fired when a document is modified",
    target_types=["document"],
))
schema = await client.schemas.update("sch_123", UpdateSchemaInput(description="Updated desc"))
await client.schemas.delete("sch_123")
```

## Viewer Tokens

```python
from logseal.types import CreateViewerTokenInput

token = await client.viewer_tokens.create(CreateViewerTokenInput(
    organization_id="org_acme",
    expires_in=3600,  # 1 hour
))
# Pass token.token to your frontend for the embeddable viewer
```

## Webhooks

```python
from logseal.types import CreateWebhookInput, UpdateWebhookInput

webhooks = await client.webhooks.list()
webhook = await client.webhooks.create(CreateWebhookInput(
    url="https://example.com/webhooks/logseal",
    events=["*"],
))
print(f"Secret: {webhook.secret}")  # Only returned on creation

await client.webhooks.update("whk_123", UpdateWebhookInput(enabled=False))
await client.webhooks.delete("whk_123")
```

## Exports

```python
from logseal.types import CreateExportInput, ExportFilters

export_job = await client.exports.create(CreateExportInput(
    organization_id="org_acme",
    format="csv",
    filters=ExportFilters(after="2024-01-01"),
))

# Poll until complete
completed = await client.exports.poll(export_job.id, timeout=120.0)
print(f"Download: {completed.download_url}")
```

## Verification

```python
from logseal.types import VerifyParams

result = await client.events.verify(VerifyParams(organization_id="org_acme"))
print(result.status)  # "valid", "broken", or "tampered"
```

## Error Handling

```python
from logseal import LogSeal, LogSealError

try:
    await client.emit_sync(...)
except LogSealError as e:
    print(f"[{e.type}] {e.code}: {e}")
    print(f"HTTP status: {e.status_code}")
```

All API errors are raised as `LogSealError` with structured fields:

| Field | Description |
|-------|-------------|
| `type` | Error category (`authentication_error`, `validation_error`, etc.) |
| `code` | Machine-readable code (`invalid_api_key`, `missing_required_field`, etc.) |
| `message` | Human-readable description |
| `param` | Request parameter that caused the error (if applicable) |
| `status_code` | HTTP status code |

## Type Safety

This package ships with `py.typed` and full type annotations. Works out of the box with mypy, pyright, and IDE autocompletion.

## License

MIT
