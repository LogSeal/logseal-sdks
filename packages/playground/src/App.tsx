import { useState } from 'react';
import { AuditLogViewer } from '@logseal/react';
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

type Scenario = 'default' | 'dark' | 'compact' | 'empty' | 'error';

const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'dark', label: 'Dark Mode' },
  { id: 'compact', label: 'Compact' },
  { id: 'empty', label: 'Empty State' },
  { id: 'error', label: 'Error State' },
];

// Mock fetch that returns empty data
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

// Mock fetch that returns errors
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

export function App() {
  const [scenario, setScenario] = useState<Scenario>('default');
  const [key, setKey] = useState(0);

  const switchScenario = (s: Scenario) => {
    // Re-install the appropriate mock fetch
    if (s === 'empty') {
      installEmptyMockFetch();
    } else if (s === 'error') {
      installErrorMockFetch();
    } else {
      installMockFetch();
    }
    setScenario(s);
    setKey((k) => k + 1); // force remount
  };

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
      </div>
      <AuditLogViewer
        key={key}
        token="vtk_mock_playground"
        title="Audit Log"
        organization="Acme Corp"
        maxHeight={scenario === 'compact' ? '400px' : '80vh'}
        classNames={{
          root: scenario === 'dark' ? 'logseal-viewer--dark' : undefined,
        }}
        onEventClick={(event: AuditEvent) => console.log('Event clicked:', event.id)}
      />
    </div>
  );
}
