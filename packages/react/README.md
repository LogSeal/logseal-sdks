# @logseal/react

React components for embedding a LogSeal audit log viewer in your application. Works with React 18+ and 19+.

## Installation

```bash
npm install @logseal/react @logseal/viewer-core
```

## Quick Start

```tsx
import { AuditLogViewer } from '@logseal/react';
import '@logseal/react/styles.css';

function App() {
  return <AuditLogViewer token={viewerToken} />;
}
```

## Usage

### Drop-in Component

Zero-config with sensible defaults:

```tsx
<AuditLogViewer token={token} />
```

### Customized

```tsx
<AuditLogViewer
  token={token}
  baseUrl="https://api.example.com"
  onTokenExpired={refreshToken}
  pageSize={50}
  filters={{ action: "user.created" }}
  columns={[...customColumns]}
  classNames={{ root: "my-viewer", row: "my-row" }}
  components={{ FilterBar: MyFilterBar }}
  onEventClick={(event) => console.log(event)}
  emptyState={<MyEmptyState />}
/>
```

### Headless Mode (Hook Only)

Use `useAuditLog` for full control — bring your own UI:

```tsx
import { useAuditLog } from '@logseal/react';

function MyViewer() {
  const { events, loading, hasMore, loadMore, filters, setFilters, actions } =
    useAuditLog({ token });

  return (
    <div>
      {events.map((event) => (
        <div key={event.id}>{event.action}</div>
      ))}
      {hasMore && <button onClick={loadMore}>Load more</button>}
    </div>
  );
}
```

## Styling

All styles use CSS custom properties with `:where()` selectors for zero specificity. Override any variable on a parent element:

```css
.my-viewer {
  --logseal-color-primary: #8b5cf6;
  --logseal-color-bg: #1a1a2e;
  --logseal-color-text: #e0e0e0;
  --logseal-font-family: 'Inter', sans-serif;
}
```

### Available CSS Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--logseal-color-primary` | `#2563eb` | Primary/accent color |
| `--logseal-color-bg` | `#ffffff` | Background color |
| `--logseal-color-border` | `#e5e7eb` | Border color |
| `--logseal-color-text` | `#111827` | Primary text color |
| `--logseal-font-family` | `system-ui, ...` | Font family |
| `--logseal-font-size-sm` | `0.875rem` | Small font size |
| `--logseal-border-radius` | `0.375rem` | Border radius |
| `--logseal-row-hover-bg` | `#f3f4f6` | Row hover background |

### Class Name Overrides

Pass `classNames` prop to add classes to any sub-component:

```tsx
<AuditLogViewer
  token={token}
  classNames={{
    root: 'my-viewer',
    filterBar: 'my-filters',
    table: 'my-table',
    row: 'my-row',
    rowExpanded: 'my-row-expanded',
    detail: 'my-detail',
    pagination: 'my-pagination',
    empty: 'my-empty',
    error: 'my-error',
    loading: 'my-loading',
  }}
/>
```

### Component Replacement

Replace any sub-component entirely:

```tsx
<AuditLogViewer
  token={token}
  components={{
    FilterBar: MyCustomFilterBar,
    EventRow: MyCustomRow,
    EmptyState: MyCustomEmpty,
  }}
/>
```

## Props

### `AuditLogViewerProps`

| Prop | Type | Description |
|------|------|-------------|
| `token` | `string` | **Required.** Viewer token (`vtk_*`) |
| `baseUrl` | `string` | API base URL |
| `onTokenExpired` | `() => Promise<string> \| string` | Token refresh callback |
| `pageSize` | `number` | Events per page (default: 25) |
| `filters` | `ViewerFilters` | Initial/controlled filters |
| `columns` | `ColumnDef[]` | Custom column definitions |
| `classNames` | `ClassNames` | CSS class overrides |
| `components` | `Components` | Sub-component replacements |
| `onEventClick` | `(event: AuditEvent) => void` | Row click handler |
| `emptyState` | `ReactNode` | Custom empty state |
| `locale` | `string` | Date formatting locale |

### Default Columns

| Column | Renders |
|--------|---------|
| Action | `event.action` |
| Actor | `event.actor.name \|\| email \|\| id` |
| Targets | `targets.map(t => t.name \|\| type:id).join(', ')` |
| Date | Relative time from `event.occurred_at` |

## License

MIT
