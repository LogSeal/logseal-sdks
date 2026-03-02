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
