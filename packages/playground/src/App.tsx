import { AuditLogViewer } from '@logseal/react';
import '@logseal/react/styles.css';
import { MOCK_EVENTS, MOCK_ACTIONS } from './mock-data';
import type { AuditEvent } from '@logseal/viewer-core';
import './App.css';

// Mock fetch so the viewer works without a real API
const PAGE_SIZE = 25;

function installMockFetch() {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    // Mock actions endpoint
    if (url.includes('/actions')) {
      await delay(200);
      return new Response(JSON.stringify({ data: MOCK_ACTIONS, object: 'list' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Mock events endpoint
    if (url.includes('/events')) {
      await delay(400);
      const parsed = new URL(url, 'https://mock.logseal.dev');
      const action = parsed.searchParams.get('action') || undefined;
      const actorId = parsed.searchParams.get('actor_id') || undefined;
      const cursor = parsed.searchParams.get('cursor') || undefined;
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

    // Pass through anything else
    return originalFetch(input, init);
  }) as typeof fetch;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

installMockFetch();

export function App() {
  return (
    <div className="playground">
      <h1 className="playground__title">LogSeal Playground</h1>
      <AuditLogViewer
        token="vtk_mock_playground"
        title="Audit Log"
        organization="Acme Corp"
        maxHeight="80vh"
        onEventClick={(event: AuditEvent) => console.log('Event clicked:', event.id)}
      />
    </div>
  );
}
