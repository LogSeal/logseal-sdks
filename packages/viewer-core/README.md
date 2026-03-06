# @logseal/viewer-core

Framework-agnostic core for the LogSeal embeddable audit log viewer. Provides a browser fetch client, state management, and utilities — no DOM dependencies.

## Installation

```bash
npm install @logseal/viewer-core
```

## Usage

### ViewerClient

```typescript
import { ViewerClient } from '@logseal/viewer-core';

const client = new ViewerClient({
  token: 'vtk_...', // viewer token from your backend
  baseUrl: 'https://api.logseal.io', // optional
  onTokenExpired: async () => {
    // fetch a new token from your backend
    const res = await fetch('/api/viewer-token');
    const { token } = await res.json();
    return token;
  },
});

// List events
const events = await client.listEvents({
  action: 'user.created',
  limit: 25,
});

// Get available actions
const actions = await client.getActions();
```

### EventStore

State machine with `useSyncExternalStore`-compatible API:

```typescript
import { ViewerClient, EventStore } from '@logseal/viewer-core';

const client = new ViewerClient({ token: 'vtk_...' });
const store = new EventStore({ client, pageSize: 25 });

// Subscribe to state changes
const unsubscribe = store.subscribe(() => {
  const state = store.getSnapshot();
  console.log(state.events, state.loading, state.error);
});

// Load initial data
await store.loadInitial();

// Load next page
await store.loadMore();

// Update filters
await store.setFilters({ action: 'user.deleted' });

// Cleanup
store.destroy();
```

### Utilities

```typescript
import { formatRelativeTime, formatDateTime } from '@logseal/viewer-core';

formatRelativeTime('2026-03-03T10:00:00Z'); // "2h ago"
formatDateTime('2026-03-03T10:00:00Z');      // "Mar 3, 2026, 10:00:00 AM"
```

## API Reference

### `ViewerClient`

| Method | Description |
|--------|-------------|
| `listEvents(params?)` | List audit events with optional filters |
| `getActions()` | Get distinct action types |
| `createExport(params)` | Create a CSV/JSON export |
| `getExport(id)` | Get export status |
| `setToken(token)` | Update the auth token |

### `EventStore`

| Method | Description |
|--------|-------------|
| `subscribe(listener)` | Subscribe to state changes (returns unsubscribe fn) |
| `getSnapshot()` | Get current immutable state |
| `loadInitial()` | Fetch first page + actions |
| `loadMore()` | Append next page via cursor |
| `setFilters(filters)` | Reset and re-fetch with new filters |
| `refresh()` | Re-fetch with current filters |
| `destroy()` | Abort in-flight requests, clear listeners |

## License

MIT
