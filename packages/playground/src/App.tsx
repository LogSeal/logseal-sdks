import { useState, type ReactNode } from 'react';
import { AuditLogViewer, ActionBadge, FilterBar as DefaultFilterBar } from '@logseal/react';
import type { ColumnDef, FilterBarProps, Components } from '@logseal/react';
import { formatRelativeTime, formatDateTime } from '@logseal/viewer-core';
import '@logseal/react/styles.css';
import { MOCK_EVENTS, MOCK_ACTIONS } from './mock-data';
import type { AuditEvent } from '@logseal/viewer-core';
import './App.css';

const PAGE_SIZE = 25;

function installMockFetch() {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('/actions')) {
      await delay(200);
      return new Response(JSON.stringify({ data: MOCK_ACTIONS, object: 'list' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/events')) {
      await delay(400);
      const parsed = new URL(url, 'https://mock.logseal.dev');
      const action = parsed.searchParams.get('action') || undefined;
      const actorId = parsed.searchParams.get('actor_id') || undefined;
      const cursor = parsed.searchParams.get('starting_after') || undefined;
      const limit = Number(parsed.searchParams.get('limit')) || PAGE_SIZE;

      let filtered = MOCK_EVENTS;
      if (action) filtered = filtered.filter((e) => e.action === action);
      if (actorId) filtered = filtered.filter((e) => e.actor.id === actorId);

      const startIdx = cursor ? filtered.findIndex((e) => e.id === cursor) + 1 : 0;
      const page = filtered.slice(startIdx, startIdx + limit);
      const hasMore = startIdx + limit < filtered.length;

      return new Response(
        JSON.stringify({
          data: page,
          has_more: hasMore,
          object: 'list',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return originalFetch(input, init);
  }) as typeof fetch;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

installMockFetch();

function installEmptyMockFetch() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/actions')) {
      await delay(200);
      return new Response(JSON.stringify({ data: [], object: 'list' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/events')) {
      await delay(200);
      return new Response(
        JSON.stringify({ data: [], has_more: false, object: 'list' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}

function installErrorMockFetch() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/actions') || url.includes('/events')) {
      await delay(300);
      return new Response(
        JSON.stringify({ error: { message: 'API rate limit exceeded. Please try again later.' } }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}

// ─── Custom Columns ───

const CUSTOM_COLUMNS: ColumnDef[] = [
  {
    key: 'action',
    header: 'Event',
    render: (event: AuditEvent) => <ActionBadge action={event.action} />,
  },
  {
    key: 'actor',
    header: 'Who',
    render: (event: AuditEvent) => (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <strong>{event.actor.name || event.actor.id}</strong>
        {event.actor.email && (
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {event.actor.email}
          </span>
        )}
      </span>
    ),
  },
  {
    key: 'ip',
    header: 'IP Address',
    render: (event: AuditEvent) => (
      <code style={{ fontSize: '0.75rem', fontFamily: 'var(--logseal-font-family-mono)' }}>
        {event.context.ip_address || '—'}
      </code>
    ),
  },
  {
    key: 'date',
    header: 'When',
    render: (event: AuditEvent) => (
      <time dateTime={event.occurred_at} title={formatDateTime(event.occurred_at)}>
        {formatRelativeTime(event.occurred_at)}
      </time>
    ),
    width: '100px',
  },
];

// ─── Custom Filter Bar ───

const ACTOR_TYPES = [
  { value: '', label: 'All' },
  { value: 'user', label: 'Users' },
  { value: 'api_key', label: 'API Keys' },
  { value: 'system', label: 'System' },
  { value: 'service_account', label: 'Service' },
];

const ACTION_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'user.', label: 'User' },
  { value: 'document.', label: 'Document' },
  { value: 'api.', label: 'API' },
  { value: 'billing.', label: 'Billing' },
  { value: 'team.', label: 'Team' },
  { value: 'settings.', label: 'Settings' },
  { value: 'export.', label: 'Export' },
];

function CustomFilterBar(props: FilterBarProps) {
  const [actorType, setActorType] = useState('');
  const [category, setCategory] = useState('');

  const handleActorType = (type: string) => {
    setActorType(type);
    // Use actorId filter to filter by actor type prefix
    props.onFiltersChange({
      ...props.filters,
      actorId: type || undefined,
    });
  };

  const handleCategory = (cat: string) => {
    setCategory(cat);
    // Find the first action matching the category, or clear
    if (cat) {
      const match = props.actions.find((a) => a.startsWith(cat));
      props.onFiltersChange({ ...props.filters, action: match || undefined });
    } else {
      props.onFiltersChange({ ...props.filters, action: undefined });
    }
  };

  return (
    <div className="custom-filter-bar">
      <div className="custom-filter-bar__section">
        <span className="custom-filter-bar__label">Actor Type</span>
        <div className="custom-filter-bar__toggles">
          {ACTOR_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`custom-filter-bar__toggle ${actorType === t.value ? 'custom-filter-bar__toggle--active' : ''}`}
              onClick={() => handleActorType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="custom-filter-bar__section">
        <span className="custom-filter-bar__label">Category</span>
        <div className="custom-filter-bar__toggles">
          {ACTION_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`custom-filter-bar__toggle ${category === c.value ? 'custom-filter-bar__toggle--active' : ''}`}
              onClick={() => handleCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {/* Still render the default filter bar below for search + date */}
      <DefaultFilterBar {...props} />
    </div>
  );
}

// ─── Scenarios ───

type Scenario = 'default' | 'dark' | 'compact' | 'custom-columns' | 'custom-filters' | 'custom-empty' | 'empty' | 'error';

interface ScenarioDef {
  id: Scenario;
  label: string;
  description: string;
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Out-of-the-box configuration with default columns, header, and branding.',
  },
  {
    id: 'dark',
    label: 'Dark Mode',
    description: 'Apply dark theme via classNames={{ root: "logseal-viewer--dark" }}.',
  },
  {
    id: 'compact',
    label: 'Compact',
    description: 'Constrained height (maxHeight="400px") with sticky headers and scrollable body.',
  },
  {
    id: 'custom-columns',
    label: 'Custom Columns',
    description: 'Override columns to show "Who" with email, IP address, and custom headers.',
  },
  {
    id: 'custom-filters',
    label: 'Custom Filters',
    description: 'Replace the FilterBar via components={{ FilterBar: CustomFilterBar }}. Adds actor type toggles and action category buttons on top of the default filters.',
  },
  {
    id: 'custom-empty',
    label: 'Custom Empty',
    description: 'Replace the empty state with your own JSX via the emptyState prop.',
  },
  {
    id: 'empty',
    label: 'Empty',
    description: 'Default empty state when no events are returned.',
  },
  {
    id: 'error',
    label: 'Error',
    description: 'Error state with retry button when the API returns an error.',
  },
];

function getViewerProps(scenario: Scenario) {
  const base = {
    token: 'vtk_mock_playground',
    title: 'Audit Log' as string,
    organization: 'Acme Corp' as string | undefined,
    maxHeight: '80vh',
    classNames: {} as Record<string, string | undefined>,
    showHeader: true,
    showBranding: true,
    columns: undefined as ColumnDef[] | undefined,
    components: undefined as Components | undefined,
    emptyState: undefined as ReactNode,
  };

  switch (scenario) {
    case 'dark':
      return { ...base, classNames: { root: 'logseal-viewer--dark' } };
    case 'compact':
      return { ...base, maxHeight: '400px' };
    case 'custom-columns':
      return { ...base, columns: CUSTOM_COLUMNS };
    case 'custom-filters':
      return { ...base, components: { FilterBar: CustomFilterBar } };
    case 'custom-empty':
      return {
        ...base,
        emptyState: (
          <div style={{ padding: '3rem', textAlign: 'center' as const }}>
            <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Nothing here yet</p>
            <p style={{ color: '#6b7280' }}>
              Events will appear here once your integration starts sending data.
            </p>
          </div>
        ),
      };
    default:
      return base;
  }
}

export function App() {
  const [scenario, setScenario] = useState<Scenario>('default');
  const [key, setKey] = useState(0);

  const switchScenario = (s: Scenario) => {
    if (s === 'empty' || s === 'custom-empty') {
      installEmptyMockFetch();
    } else if (s === 'error') {
      installErrorMockFetch();
    } else {
      installMockFetch();
    }
    setScenario(s);
    setKey((k) => k + 1);
  };

  const scenarioDef = SCENARIOS.find((s) => s.id === scenario)!;
  const props = getViewerProps(scenario);

  return (
    <div className={`playground ${scenario === 'dark' ? 'playground--dark' : ''}`}>
      <div className="playground__header">
        <h1 className="playground__title">LogSeal Playground</h1>
        <nav className="playground__tabs" role="tablist">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={scenario === s.id}
              className={`playground__tab ${scenario === s.id ? 'playground__tab--active' : ''}`}
              onClick={() => switchScenario(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <p className="playground__description">{scenarioDef.description}</p>
      </div>
      <AuditLogViewer
        key={key}
        token={props.token}
        title={props.title}
        organization={props.organization}
        maxHeight={props.maxHeight}
        classNames={props.classNames}
        showHeader={props.showHeader}
        showBranding={props.showBranding}
        columns={props.columns}
        components={props.components}
        emptyState={props.emptyState}
        onEventClick={(event: AuditEvent) => console.log('Event clicked:', event.id)}
      />
    </div>
  );
}
