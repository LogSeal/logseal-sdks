# logseal-php

Official PHP SDK for [LogSeal](https://logseal.io) — Audit logging for B2B SaaS.

## Installation

```bash
composer require logseal/logseal-php
```

## Quick Start

```php
use LogSeal\LogSeal;

$client = new LogSeal('sk_test_...');

// Emit an event (batched)
$client->emit([
    'action' => 'document.published',
    'organization_id' => 'org_acme',
    'actor' => [
        'id' => 'user_123',
        'name' => 'Jane Smith',
        'email' => 'jane@acme.com',
    ],
    'targets' => [[
        'type' => 'document',
        'id' => 'doc_456',
        'name' => 'Q3 Report',
    ]],
    'metadata' => [
        'previous_status' => 'draft',
    ],
]);

// Emit and wait for confirmation
$event = $client->emitSync([
    'action' => 'user.deleted',
    'organization_id' => 'org_acme',
    'actor' => ['id' => 'admin_1'],
    'targets' => [['type' => 'user', 'id' => 'user_123']],
]);
echo "Event ID: " . $event['id'] . "\n";

// Flush remaining events before exit
$client->shutdown();
```

## Configuration

```php
$client = new LogSeal('sk_live_...', [
    'base_url' => 'https://api.logseal.io', // Optional override
    'batch_size' => 100,                     // Events to buffer before auto-flushing
    'max_retries' => 3,                      // Retry attempts on 429 / 5xx responses
    'timeout' => 30,                         // HTTP timeout in seconds
]);
```

## Querying Events

```php
// Paginated list
$page = $client->events->list([
    'organization_id' => 'org_acme',
    'action' => 'document.published',
    'limit' => 50,
]);

foreach ($page['data'] as $event) {
    echo $event['action'] . ' by ' . $event['actor']['name'] . "\n";
}

// Auto-paginate through all results (Generator)
foreach ($client->events->listAll(['organization_id' => 'org_acme']) as $event) {
    echo $event['action'] . "\n";
}
```

## Organizations

```php
$orgs = $client->organizations->list();
$org = $client->organizations->create('acme', 'Acme Corp');
$org = $client->organizations->get('org_123');
```

## Event Schemas

```php
$schemas = $client->schemas->list();
$schema = $client->schemas->create('document.updated', 'Fired when a document is modified', ['document']);
$schema = $client->schemas->update('sch_123', ['description' => 'Updated desc']);
$client->schemas->delete('sch_123');
```

## Viewer Tokens

```php
$token = $client->viewerTokens->create('org_acme', 3600);
// Pass $token['token'] to your frontend for the embeddable viewer
```

## Webhooks

```php
$webhooks = $client->webhooks->list();
$webhook = $client->webhooks->create('https://example.com/webhooks/logseal', null, ['*']);
echo "Secret: " . $webhook['secret'] . "\n"; // Only returned on creation

$client->webhooks->update('whk_123', ['enabled' => false]);
$client->webhooks->delete('whk_123');
```

## Exports

```php
$export = $client->exports->create('org_acme', 'csv', ['after' => '2024-01-01']);

// Poll until complete
$completed = $client->exports->poll($export['id'], intervalSeconds: 1, timeoutSeconds: 120);
echo "Download: " . $completed['download_url'] . "\n";
```

## Verification

```php
$result = $client->events->verify('org_acme');
echo $result['status']; // "valid", "broken", or "tampered"
```

## Error Handling

```php
use LogSeal\Exception\LogSealException;

try {
    $client->emitSync([...]);
} catch (LogSealException $e) {
    echo "[{$e->type}] {$e->code}: {$e->getMessage()}\n";
    echo "HTTP status: {$e->statusCode}\n";
}
```

All API errors are thrown as `LogSealException`:

| Property | Description |
|----------|-------------|
| `$type` | Error category (`authentication_error`, `validation_error`, etc.) |
| `$code` | Machine-readable code (`invalid_api_key`, `missing_required_field`, etc.) |
| `getMessage()` | Human-readable description |
| `$param` | Request parameter that caused the error (if applicable) |
| `$statusCode` | HTTP status code |

## Requirements

- PHP 8.1+
- Guzzle 7.x

## License

MIT
