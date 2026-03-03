import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ViewerClient } from '../client.js';
import { ViewerError } from '../errors.js';

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('ViewerClient', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends Authorization header with token', async () => {
    const fetchMock = mockFetch({ data: [], has_more: false, object: 'list' });
    globalThis.fetch = fetchMock;

    const client = new ViewerClient({ token: 'vtk_test123' });
    await client.listEvents();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer vtk_test123');
  });

  it('uses default base URL', async () => {
    const fetchMock = mockFetch({ data: [], has_more: false, object: 'list' });
    globalThis.fetch = fetchMock;

    const client = new ViewerClient({ token: 'vtk_test' });
    await client.listEvents();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('https://api.logseal.dev/v1/events');
  });

  it('uses custom base URL', async () => {
    const fetchMock = mockFetch({ data: [], has_more: false, object: 'list' });
    globalThis.fetch = fetchMock;

    const client = new ViewerClient({
      token: 'vtk_test',
      baseUrl: 'https://custom.api.com/',
    });
    await client.listEvents();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('https://custom.api.com/v1/events');
  });

  it('strips trailing slash from base URL', async () => {
    const fetchMock = mockFetch({ data: [], has_more: false, object: 'list' });
    globalThis.fetch = fetchMock;

    const client = new ViewerClient({
      token: 'vtk_test',
      baseUrl: 'https://api.example.com///',
    });
    await client.listEvents();

    const [url] = fetchMock.mock.calls[0];
    expect(url).not.toContain('///');
  });

  describe('listEvents', () => {
    it('converts camelCase params to snake_case query string', async () => {
      const fetchMock = mockFetch({ data: [], has_more: false, object: 'list' });
      globalThis.fetch = fetchMock;

      const client = new ViewerClient({ token: 'vtk_test' });
      await client.listEvents({
        actionPrefix: 'user.',
        actorId: 'actor_1',
        limit: 10,
        startingAfter: 'evt_abc',
      });

      const [url] = fetchMock.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get('action_prefix')).toBe('user.');
      expect(parsed.searchParams.get('actor_id')).toBe('actor_1');
      expect(parsed.searchParams.get('limit')).toBe('10');
      expect(parsed.searchParams.get('starting_after')).toBe('evt_abc');
    });

    it('omits undefined params', async () => {
      const fetchMock = mockFetch({ data: [], has_more: false, object: 'list' });
      globalThis.fetch = fetchMock;

      const client = new ViewerClient({ token: 'vtk_test' });
      await client.listEvents({ action: 'user.created' });

      const [url] = fetchMock.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get('action')).toBe('user.created');
      expect(parsed.searchParams.has('actor_id')).toBe(false);
    });

    it('returns paginated event list', async () => {
      const body = {
        data: [{ id: 'evt_1', action: 'user.created', object: 'event' }],
        has_more: true,
        next_cursor: 'evt_1',
        object: 'list',
      };
      globalThis.fetch = mockFetch(body);

      const client = new ViewerClient({ token: 'vtk_test' });
      const result = await client.listEvents();

      expect(result.data).toHaveLength(1);
      expect(result.has_more).toBe(true);
    });
  });

  describe('getActions', () => {
    it('fetches distinct actions', async () => {
      const body = { data: ['user.created', 'user.updated'], object: 'list' };
      globalThis.fetch = mockFetch(body);

      const client = new ViewerClient({ token: 'vtk_test' });
      const result = await client.getActions();

      expect(result.data).toEqual(['user.created', 'user.updated']);
    });
  });

  describe('createExport', () => {
    it('sends POST with format and filters', async () => {
      const body = { id: 'exp_1', status: 'pending', format: 'csv', object: 'export' };
      const fetchMock = mockFetch(body);
      globalThis.fetch = fetchMock;

      const client = new ViewerClient({ token: 'vtk_test' });
      await client.createExport({
        format: 'csv',
        filters: { action: 'user.created', actorId: 'actor_1' },
      });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.method).toBe('POST');
      const parsed = JSON.parse(init.body);
      expect(parsed.format).toBe('csv');
      expect(parsed.filters.action).toBe('user.created');
      expect(parsed.filters.actor_id).toBe('actor_1');
    });
  });

  describe('getExport', () => {
    it('fetches export by id', async () => {
      const body = { id: 'exp_1', status: 'completed', format: 'csv', object: 'export' };
      globalThis.fetch = mockFetch(body);

      const client = new ViewerClient({ token: 'vtk_test' });
      const result = await client.getExport('exp_1');

      expect(result.id).toBe('exp_1');
      expect(result.status).toBe('completed');
    });
  });

  describe('error handling', () => {
    it('throws ViewerError on non-ok response', async () => {
      globalThis.fetch = mockFetch(
        { error: { message: 'Not found', code: 'not_found' } },
        404,
      );

      const client = new ViewerClient({ token: 'vtk_test' });
      await expect(client.listEvents()).rejects.toThrow(ViewerError);
      await expect(client.listEvents()).rejects.toThrow('Not found');
    });

    it('throws network error on fetch failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const client = new ViewerClient({ token: 'vtk_test' });
      await expect(client.listEvents()).rejects.toThrow(ViewerError);
    });

    it('retries on 401 when onTokenExpired is set', async () => {
      const expired = mockFetch({ error: { message: 'Unauthorized' } }, 401);
      const success = mockFetch({ data: [], has_more: false, object: 'list' });

      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? expired() : success();
      });

      const onTokenExpired = vi.fn().mockResolvedValue('vtk_new_token');
      const client = new ViewerClient({ token: 'vtk_old', onTokenExpired });
      const result = await client.listEvents();

      expect(onTokenExpired).toHaveBeenCalledOnce();
      expect(result.data).toEqual([]);
      // Verify the second call used the new token
      const [, secondInit] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(secondInit.headers.Authorization).toBe('Bearer vtk_new_token');
    });

    it('does not retry on 401 without onTokenExpired', async () => {
      globalThis.fetch = mockFetch({ error: { message: 'Unauthorized' } }, 401);

      const client = new ViewerClient({ token: 'vtk_bad' });
      await expect(client.listEvents()).rejects.toThrow(ViewerError);
    });

    it('does not retry more than once', async () => {
      globalThis.fetch = mockFetch({ error: { message: 'Unauthorized' } }, 401);

      const onTokenExpired = vi.fn().mockResolvedValue('vtk_still_bad');
      const client = new ViewerClient({ token: 'vtk_old', onTokenExpired });
      await expect(client.listEvents()).rejects.toThrow(ViewerError);
      expect(onTokenExpired).toHaveBeenCalledOnce();
    });
  });

  describe('setToken', () => {
    it('updates the token for subsequent requests', async () => {
      const fetchMock = mockFetch({ data: [], has_more: false, object: 'list' });
      globalThis.fetch = fetchMock;

      const client = new ViewerClient({ token: 'vtk_old' });
      client.setToken('vtk_new');
      await client.listEvents();

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers.Authorization).toBe('Bearer vtk_new');
    });
  });
});
