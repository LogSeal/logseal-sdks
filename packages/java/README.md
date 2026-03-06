# logseal-java

Official Java SDK for [LogSeal](https://logseal.io) — Audit logging for B2B SaaS.

## Installation

### Maven

```xml
<dependency>
    <groupId>io.logseal</groupId>
    <artifactId>logseal-java</artifactId>
    <version>0.1.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'io.logseal:logseal-java:0.1.0'
```

## Quick Start

```java
import io.logseal.sdk.LogSealClient;
import io.logseal.sdk.model.*;

LogSealClient client = LogSealClient.builder("sk_test_...").build();

// Emit an event (batched, non-blocking)
client.emit(new EmitEventInput(
    "document.published",
    "org_acme",
    new ActorInput("user_123").name("Jane Smith").email("jane@acme.com")
).targets(List.of(
    new TargetInput("document", "doc_456").name("Q3 Report")
)).metadata(Map.of(
    "previousStatus", "draft"
)));

// Emit and wait for confirmation
EmitEventResponse event = client.emitSync(new EmitEventInput(
    "user.deleted",
    "org_acme",
    new ActorInput("admin_1")
).targets(List.of(
    new TargetInput("user", "user_123")
)));
System.out.println("Event ID: " + event.getId());

// Graceful shutdown (flushes remaining events)
Runtime.getRuntime().addShutdownHook(new Thread(client::shutdown));
```

## Configuration

```java
LogSealClient client = LogSealClient.builder("sk_live_...")
    .baseUrl("https://api.logseal.io")   // Optional override
    .batchSize(100)                       // Events to buffer before auto-flushing
    .flushIntervalMs(5000)                // Milliseconds between automatic flushes
    .maxRetries(3)                        // Retry attempts on 429 / 5xx responses
    .build();
```

## Querying Events

```java
// Paginated list
PaginatedList<AuditEvent> page = client.events().list(
    new ListEventsParams("org_acme")
        .action("document.published")
        .limit(50)
);

for (AuditEvent event : page.getData()) {
    System.out.println(event.getAction() + " " + event.getActor().get("name"));
}

// Auto-paginate through all results
client.events().listAll(new ListEventsParams("org_acme"), event -> {
    System.out.println(event.getAction());
});
```

## Organizations

```java
Map<String, Object> orgs = client.organizations().list();
Map<String, Object> org = client.organizations().create("acme", "Acme Corp");
Map<String, Object> org = client.organizations().get("org_123");
```

## Event Schemas

```java
Map<String, Object> schemas = client.schemas().list();
Map<String, Object> schema = client.schemas().create(
    "document.updated",
    "Fired when a document is modified",
    List.of("document"),
    null
);
client.schemas().update("sch_123", Map.of("description", "Updated desc"));
client.schemas().delete("sch_123");
```

## Viewer Tokens

```java
Map<String, Object> token = client.viewerTokens().create("org_acme", 3600);
// Pass token.get("token") to your frontend for the embeddable viewer
```

## Webhooks

```java
Map<String, Object> webhooks = client.webhooks().list();
Map<String, Object> webhook = client.webhooks().create(
    "https://example.com/webhooks/logseal",
    null, List.of("*"), null
);
System.out.println("Secret: " + webhook.get("secret")); // Only returned on creation

client.webhooks().update("whk_123", Map.of("enabled", false));
client.webhooks().delete("whk_123");
```

## Exports

```java
Map<String, Object> export = client.exports().create("org_acme", "csv",
    Map.of("after", "2024-01-01"));

// Poll until complete
Map<String, Object> completed = client.exports().poll(export.get("id").toString(), 1000, 120_000);
System.out.println("Download: " + completed.get("download_url"));
```

## Verification

```java
Map<String, Object> result = client.events().verify("org_acme");
System.out.println(result.get("status")); // "valid", "broken", or "tampered"
```

## Error Handling

```java
import io.logseal.sdk.exception.LogSealException;

try {
    client.emitSync(event);
} catch (LogSealException e) {
    System.err.printf("[%s] %s: %s (HTTP %d)%n",
        e.getType(), e.getCode(), e.getMessage(), e.getStatusCode());
}
```

All API errors are thrown as `LogSealException`:

| Method | Description |
|--------|-------------|
| `getType()` | Error category (`authentication_error`, `validation_error`, etc.) |
| `getCode()` | Machine-readable code (`invalid_api_key`, `missing_required_field`, etc.) |
| `getMessage()` | Human-readable description |
| `getParam()` | Request parameter that caused the error (if applicable) |
| `getStatusCode()` | HTTP status code |

## Requirements

- Java 11+
- Jackson Databind 2.x

## License

MIT
