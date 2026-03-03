import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventStore } from '../store.js';
import type { ViewerClient } from '../client.js';
import type { AuditEvent, PaginatedList } from '../types.js';

function makeEvent(id: string, action = 'user.created'): AuditEvent {
  return {
    id,
    action,
    occurred_at: '2026-03-03T12:00:00Z',
    received_at: '2026-03-03T12:00:01Z',
    actor: { id: 'actor_1', type: 'user' },
    targets: [],
    metadata: {},
    context: {},
    event_hash: 'hash_' + id,
    object: 'event',
  };
}

function makeClient(overrides: Partial<ViewerClient> = {}): ViewerClient {
  return {
    listEvents: vi.fn().mockResolvedValue({
      data: [makeEvent('evt_1'), makeEvent('evt_2')],
      has_more: false,
      object: 'list',
    } satisfies PaginatedList<AuditEvent>),
    getActions: vi.fn().mockResolvedValue({
      data: ['user.created', 'user.updated'],
      object: 'list',
    }),
    createExport: vi.fn(),
    getExport: vi.fn(),
    setToken: vi.fn(),
    ...overrides,
  } as unknown as ViewerClient;
}

describe('EventStore', () => {
  let client: ViewerClient;
  let store: EventStore;

  beforeEach(() => {
    client = makeClient();
    store = new EventStore({ client, pageSize: 2 });
  });

  describe('initial state', () => {
    it('starts with empty state', () => {
      const state = store.getSnapshot();
      expect(state.events).toEqual([]);
      expect(state.actions).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.loadingMore).toBe(false);
      expect(state.error).toBeNull();
      expect(state.hasMore).toBe(false);
      expect(state.filters).toEqual({});
    });

    it('accepts initial filters', () => {
      const filtered = new EventStore({
        client,
        initialFilters: { action: 'user.created' },
      });
      expect(filtered.getSnapshot().filters).toEqual({ action: 'user.created' });
    });
  });

  describe('subscribe', () => {
    it('notifies listeners on state change', async () => {
      const listener = vi.fn();
      store.subscribe(listener);

      await store.loadInitial();

      // Should be called multiple times: loading=true, then loading=false with data
      expect(listener).toHaveBeenCalled();
    });

    it('returns unsubscribe function', async () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      unsubscribe();

      await store.loadInitial();

      // Listener called for the loading=true state, but not after unsubscribe
      // Actually, unsubscribe was called before loadInitial, so 0 calls
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('loadInitial', () => {
    it('fetches events and actions in parallel', async () => {
      await store.loadInitial();

      expect(client.listEvents).toHaveBeenCalledOnce();
      expect(client.getActions).toHaveBeenCalledOnce();
    });

    it('sets loading state during fetch', async () => {
      const states: boolean[] = [];
      store.subscribe(() => {
        states.push(store.getSnapshot().loading);
      });

      await store.loadInitial();

      expect(states[0]).toBe(true); // loading started
      expect(states[states.length - 1]).toBe(false); // loading finished
    });

    it('populates events and actions', async () => {
      await store.loadInitial();
      const state = store.getSnapshot();

      expect(state.events).toHaveLength(2);
      expect(state.events[0].id).toBe('evt_1');
      expect(state.actions).toEqual(['user.created', 'user.updated']);
    });

    it('sets hasMore from response', async () => {
      client = makeClient({
        listEvents: vi.fn().mockResolvedValue({
          data: [makeEvent('evt_1')],
          has_more: true,
          object: 'list',
        }),
      });
      store = new EventStore({ client });

      await store.loadInitial();

      expect(store.getSnapshot().hasMore).toBe(true);
    });

    it('sets error on failure', async () => {
      client = makeClient({
        listEvents: vi.fn().mockRejectedValue(new Error('API down')),
      });
      store = new EventStore({ client });

      await store.loadInitial();

      expect(store.getSnapshot().error).toBe('API down');
      expect(store.getSnapshot().loading).toBe(false);
    });

    it('passes filters as params', async () => {
      store = new EventStore({
        client,
        initialFilters: { action: 'user.created', actorId: 'actor_1' },
      });

      await store.loadInitial();

      expect(client.listEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.created',
          actorId: 'actor_1',
        }),
        expect.anything(),
      );
    });
  });

  describe('loadMore', () => {
    it('appends events from next page', async () => {
      client = makeClient({
        listEvents: vi
          .fn()
          .mockResolvedValueOnce({
            data: [makeEvent('evt_1')],
            has_more: true,
            object: 'list',
          })
          .mockResolvedValueOnce({
            data: [makeEvent('evt_2')],
            has_more: false,
            object: 'list',
          }),
      });
      store = new EventStore({ client, pageSize: 1 });

      await store.loadInitial();
      expect(store.getSnapshot().events).toHaveLength(1);

      await store.loadMore();
      expect(store.getSnapshot().events).toHaveLength(2);
      expect(store.getSnapshot().events[1].id).toBe('evt_2');
    });

    it('uses cursor from last event', async () => {
      client = makeClient({
        listEvents: vi
          .fn()
          .mockResolvedValueOnce({
            data: [makeEvent('evt_1')],
            has_more: true,
            object: 'list',
          })
          .mockResolvedValueOnce({
            data: [],
            has_more: false,
            object: 'list',
          }),
      });
      store = new EventStore({ client, pageSize: 1 });

      await store.loadInitial();
      await store.loadMore();

      const secondCall = (client.listEvents as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(secondCall[0]).toEqual(
        expect.objectContaining({ startingAfter: 'evt_1' }),
      );
    });

    it('does nothing if no more pages', async () => {
      await store.loadInitial();
      await store.loadMore();

      // listEvents called only once (for loadInitial)
      expect(client.listEvents).toHaveBeenCalledOnce();
    });

    it('sets loadingMore state', async () => {
      client = makeClient({
        listEvents: vi
          .fn()
          .mockResolvedValueOnce({
            data: [makeEvent('evt_1')],
            has_more: true,
            object: 'list',
          })
          .mockResolvedValueOnce({
            data: [makeEvent('evt_2')],
            has_more: false,
            object: 'list',
          }),
      });
      store = new EventStore({ client, pageSize: 1 });

      await store.loadInitial();

      const states: boolean[] = [];
      store.subscribe(() => {
        states.push(store.getSnapshot().loadingMore);
      });

      await store.loadMore();

      expect(states[0]).toBe(true);
      expect(states[states.length - 1]).toBe(false);
    });
  });

  describe('setFilters', () => {
    it('updates filters and re-fetches', async () => {
      await store.loadInitial();
      await store.setFilters({ action: 'user.deleted' });

      expect(store.getSnapshot().filters).toEqual({ action: 'user.deleted' });
      // listEvents called twice: initial + after filter change
      expect(client.listEvents).toHaveBeenCalledTimes(2);
    });
  });

  describe('refresh', () => {
    it('re-fetches with current filters', async () => {
      await store.loadInitial();
      await store.refresh();

      expect(client.listEvents).toHaveBeenCalledTimes(2);
    });
  });

  describe('destroy', () => {
    it('clears listeners', async () => {
      const listener = vi.fn();
      store.subscribe(listener);
      store.destroy();

      await store.loadInitial();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
