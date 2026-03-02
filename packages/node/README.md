# @logseal/node

Official Node.js SDK for [LogSeal](https://logseal.io) — Audit logging for B2B SaaS.

## Installation

```bash
npm install @logseal/node
# or
pnpm add @logseal/node
# or
yarn add @logseal/node
```

## Quick Start

```typescript
import { LogSeal } from '@logseal/node';

const logseal = new LogSeal({
  apiKey: 'sk_test_...',
});

// Emit an event (batched, async)
await logseal.emit({
  action: 'document.published',
  organizationId: 'org_acme',
  actor: {
    id: 'user_123',
    name: 'Jane Smith',
    email: 'jane@acme.com',
  },
  targets: [{
    type: 'document',
    id: 'doc_456',
    name: 'Q3 Report',
  }],
  metadata: {
    previousStatus: 'draft',
  },
});

// Emit and wait for confirmation
const event = await logseal.emitSync({
  action: 'user.deleted',
  organizationId: 'org_acme',
  actor: { id: 'admin_1' },
  targets: [{ type: 'user', id: 'user_123' }],
});
console.log('Event ID:', event.id);

// Query events
const events = await logseal.events.list({
  organizationId: 'org_acme',
  action: 'document.published',
  limit: 50,
});

// Auto-paginate through all events
for await (const event of logseal.events.listAll({
  organizationId: 'org_acme',
})) {
  console.log(event.action, event.actor.name);
}

// Graceful shutdown (flushes remaining events)
process.on('SIGTERM', async () => {
  await logseal.shutdown();
  process.exit(0);
});
```

## Configuration

```typescript
const logseal = new LogSeal({
  apiKey: 'sk_live_...', // Required
  baseUrl: 'https://api.logseal.io', // Optional, default
  batchSize: 100, // Events to batch before sending
  flushIntervalMs: 5000, // Max time to wait before flushing
  maxRetries: 3, // Retry attempts for failed requests
});
```

## Middleware

The SDK provides middleware for automatic HTTP audit logging. Every request flowing through your application is captured as an audit event — no manual `emit()` calls needed.

Middleware is available for **Express**, **Fastify**, and **Hono**. All three share the same configuration interface and are duck-typed, so they add no extra dependencies to your project.

### Express

```typescript
import express from 'express';
import { LogSeal } from '@logseal/node';

const app = express();
const logseal = new LogSeal({ apiKey: 'sk_live_...' });

app.use(logseal.express({
  actor: (req) => ({
    id: req.headers['x-user-id'] as string,
    name: req.headers['x-user-name'] as string,
  }),
  organizationId: 'org_acme',
}));

app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id });
});
// Emits action: "get.users.:id"
```

### Fastify

```typescript
import Fastify from 'fastify';
import { LogSeal } from '@logseal/node';

const fastify = Fastify();
const logseal = new LogSeal({ apiKey: 'sk_live_...' });

fastify.register(logseal.fastify({
  actor: (req) => ({
    id: req.headers['x-user-id'] as string,
    name: req.headers['x-user-name'] as string,
  }),
  organizationId: 'org_acme',
}));

fastify.get('/users/:id', async (req, reply) => {
  return { id: req.params.id };
});
// Emits action: "get.users.:id"
```

### Hono

```typescript
import { Hono } from 'hono';
import { LogSeal } from '@logseal/node';

const app = new Hono();
const logseal = new LogSeal({ apiKey: 'sk_live_...' });

app.use(logseal.hono({
  actor: (c) => ({
    id: c.req.header('x-user-id'),
    name: c.req.header('x-user-name'),
  }),
  organizationId: 'org_acme',
}));

app.get('/users/:id', (c) => {
  return c.json({ id: c.req.param('id') });
});
// Emits action: "get.users.:id"
```

### Middleware Configuration

All middleware accepts the same configuration options:

```typescript
logseal.express({
  // Required — extract the actor from each request.
  // Return null to skip logging for a request.
  actor: (req) => ({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
  }),

  // Required — can be a static string or a function for multi-tenant apps.
  organizationId: (req) => req.headers['x-org-id'] as string,

  // Paths to exclude from audit logging (supports * wildcards).
  exclude: ['/health', '/metrics', '/api/internal/*'],

  // Map specific routes to custom action names instead of auto-generated ones.
  actionMap: {
    'POST /auth/login': 'user.login',
    'POST /auth/logout': 'user.logout',
    'DELETE /users/:id': 'user.delete',
  },

  // Capture the request body in event metadata. Default: false.
  captureBody: true,

  // Capture the HTTP status code in event metadata. Default: true.
  captureStatus: true,

  // Add custom metadata to every event.
  enrichMetadata: (req, metadata) => ({
    ...metadata,
    tenantId: req.headers['x-tenant-id'],
  }),

  // Custom error handler. Default: console.error.
  onError: (error) => myLogger.error('Audit logging failed', error),
});
```

### Action Generation

Actions are automatically generated from the HTTP method and route pattern using dot notation:

| Request | Route Pattern | Generated Action |
|---|---|---|
| `GET /users` | `/users` | `get.users` |
| `POST /users` | `/users` | `post.users` |
| `GET /users/123` | `/users/:id` | `get.users.:id` |
| `PUT /orgs/1/members/2` | `/orgs/:orgId/members/:memberId` | `put.orgs.:orgId.members.:memberId` |

Use `actionMap` to override any auto-generated action with a human-readable name. The map is checked in order: exact path first, then route pattern.

```typescript
actionMap: {
  'POST /users': 'user.create',           // Matches POST /users exactly
  'GET /users/:id': 'user.read',          // Matches any GET /users/:id
}
```

### How It Works

Each middleware hooks into the framework's response lifecycle so that requests are never blocked:

- **Express** — listens to the `res.on('finish')` event after calling `next()`.
- **Fastify** — registers an `onResponse` hook via the Fastify plugin system.
- **Hono** — calls `await next()`, then emits the event after downstream handlers complete.

Events are queued into the SDK's batching system (configurable via `batchSize` and `flushIntervalMs`) and sent to the LogSeal API in bulk. If the actor or organization ID cannot be resolved for a request, the event is silently skipped.

IP addresses are resolved with fallback: `req.ip` (Express/Fastify) -> `X-Forwarded-For` header -> `X-Real-IP` header. The `User-Agent` and `X-Request-ID` headers are captured automatically when present.

## API Reference

### Events

```typescript
// Emit (batched)
await logseal.emit({ action, organizationId, actor, ... });

// Emit (sync)
const event = await logseal.emitSync({ action, organizationId, actor, ... });

// List events
const events = await logseal.events.list({ organizationId, action?, limit? });

// Get single event
const event = await logseal.events.get('evt_123');

// Verify hash chain integrity
const result = await logseal.events.verify({ organizationId });
```

### Organizations

```typescript
const orgs = await logseal.organizations.list();
const org = await logseal.organizations.create({ externalId: 'acme', name: 'Acme Corp' });
const org = await logseal.organizations.get('org_123');
```

### Schemas

```typescript
const schemas = await logseal.schemas.list();
const schema = await logseal.schemas.create({ action: 'document.updated', ... });
const schema = await logseal.schemas.update('sch_123', { description: '...' });
await logseal.schemas.delete('sch_123');
```

### Viewer Tokens

```typescript
const token = await logseal.viewerTokens.create({
  organizationId: 'org_acme',
  expiresIn: 3600, // 1 hour
});
// Pass token.token to your frontend for the embeddable viewer
```

### Webhooks

```typescript
const webhooks = await logseal.webhooks.list();
const webhook = await logseal.webhooks.create({ url: 'https://...', events: ['*'] });
await logseal.webhooks.update('whk_123', { enabled: false });
await logseal.webhooks.delete('whk_123');
```

### Exports

```typescript
const exportJob = await logseal.exports.create({
  organizationId: 'org_acme',
  format: 'csv',
  filters: { after: '2024-01-01' },
});

// Poll until complete
const completed = await logseal.exports.poll(exportJob.id);
console.log('Download URL:', completed.download_url);
```

## Error Handling

```typescript
import { LogSeal, LogSealError } from '@logseal/node';

try {
  await logseal.emitSync({ ... });
} catch (error) {
  if (error instanceof LogSealError) {
    console.error('LogSeal error:', error.code, error.message);
    console.error('Status:', error.statusCode);
  }
}
```

## License

MIT
