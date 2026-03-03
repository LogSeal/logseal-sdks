import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuditLog } from '../hooks/use-audit-log.js';
import type { AuditEvent } from '@logseal/viewer-core';

function makeEvent(id: string, action = 'user.created'): AuditEvent {
  return {
    id,
    action,
    occurred_at: '2026-03-03T12:00:00Z',
    received_at: '2026-03-03T12:00:01Z',
    actor: { id: 'actor_1', type: 'user', name: 'Test User' },
    targets: [{ type: 'document', id: 'doc_1', name: 'Doc' }],
    metadata: {},
    context: {},
    event_hash: 'hash_' + id,
    object: 'event',
  };
}

function mockFetchResponses(responses: Array<{ body: unknown; status?: number }>) {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const resp = responses[callIndex] || responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: (resp.status || 200) >= 200 && (resp.status || 200) < 300,
      status: resp.status || 200,
      json: () => Promise.resolve(resp.body),
    });
  });
}

describe('useAuditLog', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('loads events and actions on mount', async () => {
    globalThis.fetch = mockFetchResponses([
      { body: { data: [makeEvent('evt_1')], has_more: false, object: 'list' } },
      { body: { data: ['user.created'], object: 'list' } },
    ]);

    const { result } = renderHook(() =>
      useAuditLog({ token: 'vtk_test' }),
    );

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe('evt_1');
    expect(result.current.actions).toEqual(['user.created']);
  });

  it('exposes setFilters that triggers re-fetch', async () => {
    globalThis.fetch = mockFetchResponses([
      { body: { data: [makeEvent('evt_1')], has_more: false, object: 'list' } },
      { body: { data: ['user.created', 'user.deleted'], object: 'list' } },
      // After filter change
      { body: { data: [makeEvent('evt_2', 'user.deleted')], has_more: false, object: 'list' } },
      { body: { data: ['user.created', 'user.deleted'], object: 'list' } },
    ]);

    const { result } = renderHook(() =>
      useAuditLog({ token: 'vtk_test' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.setFilters({ action: 'user.deleted' });

    await waitFor(() => {
      expect(result.current.filters.action).toBe('user.deleted');
    });
  });

  it('sets error on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Network error'));

    const { result } = renderHook(() =>
      useAuditLog({ token: 'vtk_test' }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('exposes loadMore for pagination', async () => {
    globalThis.fetch = mockFetchResponses([
      { body: { data: [makeEvent('evt_1')], has_more: true, object: 'list' } },
      { body: { data: ['user.created'], object: 'list' } },
      // loadMore call
      { body: { data: [makeEvent('evt_2')], has_more: false, object: 'list' } },
    ]);

    const { result } = renderHook(() =>
      useAuditLog({ token: 'vtk_test', pageSize: 1 }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);

    result.current.loadMore();

    await waitFor(() => {
      expect(result.current.events).toHaveLength(2);
    });

    expect(result.current.hasMore).toBe(false);
  });
});
