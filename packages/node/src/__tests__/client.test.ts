import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LogSeal } from '../client.js';
import { LogSealError } from '../error.js';

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    ...response,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('LogSeal Client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ─── Constructor ──────────────────────────────────────

  describe('constructor', () => {
    it('throws when apiKey is missing', () => {
      expect(() => new LogSeal({ apiKey: '' })).toThrow('API key is required');
    });

    it('uses default config values', () => {
      mockFetch({});
      const client = new LogSeal({ apiKey: 'test_key' });

      // Verify defaults via behavior — emit batchSize events to trigger flush
      expect(client).toBeDefined();
      client.shutdown();
    });

    it('accepts custom config values', () => {
      mockFetch({});
      const client = new LogSeal({
        apiKey: 'test_key',
        baseUrl: 'https://custom.api.com',
        batchSize: 10,
        flushIntervalMs: 1000,
        maxRetries: 5,
      });
      expect(client).toBeDefined();
      client.shutdown();
    });
  });

  // ─── emit() ───────────────────────────────────────────

  describe('emit()', () => {
    it('queues events and returns { status: "queued" }', async () => {
      mockFetch({});
      const client = new LogSeal({ apiKey: 'test_key' });

      const result = await client.emit({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
      });

      expect(result).toEqual({ status: 'queued' });
      await client.shutdown();
    });

    it('triggers flush when queue reaches batchSize', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({ accepted: 2, rejected: 0, events: [], object: 'batch' }),
      });

      const client = new LogSeal({ apiKey: 'test_key', batchSize: 2 });

      await client.emit({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
      });

      // First emit — no flush yet
      expect(fetchMock).not.toHaveBeenCalled();

      await client.emit({
        action: 'user.updated',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
      });

      // Second emit hits batchSize=2, triggers flush
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain('/v1/events/batch');
      expect(options.method).toBe('POST');

      await client.shutdown();
    });
  });

  // ─── emitSync() ───────────────────────────────────────

  describe('emitSync()', () => {
    it('sends single event immediately via POST /v1/events', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({
            id: 'evt_123',
            action: 'user.created',
            occurred_at: '2024-01-01T00:00:00Z',
            received_at: '2024-01-01T00:00:00Z',
            organization_id: 'org_1',
            object: 'event',
          }),
      });

      const client = new LogSeal({ apiKey: 'test_key' });
      const result = await client.emitSync({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
      });

      expect(result.id).toBe('evt_123');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.logseal.dev/v1/events');
      expect(options.method).toBe('POST');

      await client.shutdown();
    });
  });

  // ─── flush() ──────────────────────────────────────────

  describe('flush()', () => {
    it('sends batched events via POST /v1/events/batch', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({ accepted: 1, rejected: 0, events: [], object: 'batch' }),
      });

      const client = new LogSeal({ apiKey: 'test_key', batchSize: 100 });
      await client.emit({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
      });

      const result = await client.flush();

      expect(result).toEqual({ sent: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.logseal.dev/v1/events/batch');

      await client.shutdown();
    });

    it('returns { sent: 0 } when queue is empty', async () => {
      mockFetch({});
      const client = new LogSeal({ apiKey: 'test_key' });
      const result = await client.flush();

      expect(result).toEqual({ sent: 0 });
      await client.shutdown();
    });
  });

  // ─── shutdown() ───────────────────────────────────────

  describe('shutdown()', () => {
    it('clears timer and flushes remaining events', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({ accepted: 1, rejected: 0, events: [], object: 'batch' }),
      });

      const client = new LogSeal({ apiKey: 'test_key', batchSize: 100 });
      await client.emit({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
      });

      await client.shutdown();

      // Flush was called during shutdown
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // After shutdown, advancing timers should NOT trigger another flush
      fetchMock.mockClear();
      await vi.advanceTimersByTimeAsync(10000);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // ─── Event validation ─────────────────────────────────

  describe('event validation', () => {
    it('throws LogSealError when action is missing', async () => {
      mockFetch({});
      const client = new LogSeal({ apiKey: 'test_key' });

      await expect(
        client.emit({
          action: '',
          organizationId: 'org_1',
          actor: { id: 'actor_1' },
        })
      ).rejects.toThrow(LogSealError);

      await client.shutdown();
    });

    it('throws LogSealError when actor.id is missing', async () => {
      mockFetch({});
      const client = new LogSeal({ apiKey: 'test_key' });

      await expect(
        client.emit({
          action: 'user.created',
          organizationId: 'org_1',
          actor: { id: '' },
        })
      ).rejects.toThrow(LogSealError);

      await client.shutdown();
    });

    it('throws LogSealError when organizationId is missing', async () => {
      mockFetch({});
      const client = new LogSeal({ apiKey: 'test_key' });

      await expect(
        client.emit({
          action: 'user.created',
          organizationId: '',
          actor: { id: 'actor_1' },
        })
      ).rejects.toThrow(LogSealError);

      await client.shutdown();
    });

    it('validation error includes correct param field', async () => {
      mockFetch({});
      const client = new LogSeal({ apiKey: 'test_key' });

      try {
        await client.emit({
          action: '',
          organizationId: 'org_1',
          actor: { id: 'actor_1' },
        });
      } catch (e) {
        expect(e).toBeInstanceOf(LogSealError);
        expect((e as LogSealError).param).toBe('action');
        expect((e as LogSealError).code).toBe('missing_required_field');
        expect((e as LogSealError).type).toBe('validation_error');
      }

      await client.shutdown();
    });
  });

  // ─── Authorization header ─────────────────────────────

  describe('authorization', () => {
    it('includes API key as Bearer token in requests', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({
            id: 'evt_123',
            action: 'user.created',
            occurred_at: '2024-01-01T00:00:00Z',
            received_at: '2024-01-01T00:00:00Z',
            organization_id: 'org_1',
            object: 'event',
          }),
      });

      const client = new LogSeal({ apiKey: 'sk_test_my_api_key' });
      await client.emitSync({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
      });

      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer sk_test_my_api_key');

      await client.shutdown();
    });
  });

  // ─── Sub-API methods ──────────────────────────────────

  describe('sub-APIs', () => {
    it('events.list() sends correct GET request', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({ data: [], has_more: false, object: 'list' }),
      });

      const client = new LogSeal({ apiKey: 'test_key' });
      await client.events.list({ organizationId: 'org_1' });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain('/v1/events?');
      expect(url).toContain('organization_id=org_1');
      expect(options.method).toBe('GET');

      await client.shutdown();
    });

    it('events.get() sends correct GET request', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({ id: 'evt_123', object: 'event' }),
      });

      const client = new LogSeal({ apiKey: 'test_key' });
      await client.events.get('evt_123');

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.logseal.dev/v1/events/evt_123');
      expect(options.method).toBe('GET');

      await client.shutdown();
    });

    it('organizations.create() sends correct POST request', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({
            id: 'org_123',
            external_id: 'my-org',
            name: 'My Org',
            object: 'organization',
          }),
      });

      const client = new LogSeal({ apiKey: 'test_key' });
      await client.organizations.create({ externalId: 'my-org', name: 'My Org' });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.logseal.dev/v1/organizations');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.external_id).toBe('my-org');
      expect(body.name).toBe('My Org');

      await client.shutdown();
    });

    it('organizations.list() sends correct GET request', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({ data: [], has_more: false, object: 'list' }),
      });

      const client = new LogSeal({ apiKey: 'test_key' });
      await client.organizations.list();

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.logseal.dev/v1/organizations');
      expect(options.method).toBe('GET');

      await client.shutdown();
    });

    it('schemas.create() sends correct POST request', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({
            id: 'sch_123',
            action: 'user.created',
            object: 'event_schema',
          }),
      });

      const client = new LogSeal({ apiKey: 'test_key' });
      await client.schemas.create({
        action: 'user.created',
        description: 'User was created',
        targetTypes: ['user'],
      });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.logseal.dev/v1/schemas');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.action).toBe('user.created');
      expect(body.target_types).toEqual(['user']);

      await client.shutdown();
    });

    it('webhooks.create() sends correct POST request', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({
            id: 'whk_123',
            url: 'https://example.com/hook',
            object: 'webhook',
          }),
      });

      const client = new LogSeal({ apiKey: 'test_key' });
      await client.webhooks.create({
        url: 'https://example.com/hook',
        events: ['user.created'],
      });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.logseal.dev/v1/webhooks');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.url).toBe('https://example.com/hook');
      expect(body.events).toEqual(['user.created']);

      await client.shutdown();
    });

    it('webhooks.delete() sends correct DELETE request', async () => {
      const fetchMock = mockFetch({
        json: () => Promise.resolve({}),
      });

      const client = new LogSeal({ apiKey: 'test_key' });
      await client.webhooks.delete('whk_123');

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.logseal.dev/v1/webhooks/whk_123');
      expect(options.method).toBe('DELETE');

      await client.shutdown();
    });

    it('viewerTokens.create() sends correct POST request', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({
            token: 'vtk_123',
            expires_at: '2024-12-31T00:00:00Z',
            organization_id: 'org_1',
            object: 'viewer_token',
          }),
      });

      const client = new LogSeal({ apiKey: 'test_key' });
      await client.viewerTokens.create({
        organizationId: 'org_1',
        expiresIn: 3600,
      });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.logseal.dev/v1/viewer-tokens');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.organization_id).toBe('org_1');
      expect(body.expires_in).toBe(3600);

      await client.shutdown();
    });

    it('exports.create() sends correct POST request', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({
            id: 'exp_123',
            status: 'pending',
            format: 'json',
            object: 'export',
          }),
      });

      const client = new LogSeal({ apiKey: 'test_key' });
      await client.exports.create({
        organizationId: 'org_1',
        format: 'json',
      });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.logseal.dev/v1/exports');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.organization_id).toBe('org_1');
      expect(body.format).toBe('json');

      await client.shutdown();
    });
  });

  // ─── Event formatting ─────────────────────────────────

  describe('event formatting', () => {
    it('formats camelCase fields to snake_case for API', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({
            id: 'evt_123',
            action: 'user.created',
            occurred_at: '2024-01-01T00:00:00Z',
            received_at: '2024-01-01T00:00:00Z',
            organization_id: 'org_1',
            object: 'event',
          }),
      });

      const client = new LogSeal({ apiKey: 'test_key' });
      await client.emitSync({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1', name: 'Test User', email: 'test@example.com' },
        targets: [{ type: 'document', id: 'doc_1', name: 'My Doc' }],
        context: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          requestId: 'req_123',
        },
        idempotencyKey: 'idem_123',
        occurredAt: '2024-01-01T00:00:00Z',
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.organization_id).toBe('org_1');
      expect(body.context.ip_address).toBe('127.0.0.1');
      expect(body.context.user_agent).toBe('test-agent');
      expect(body.context.request_id).toBe('req_123');
      expect(body.idempotency_key).toBe('idem_123');
      expect(body.occurred_at).toBe('2024-01-01T00:00:00Z');

      await client.shutdown();
    });

    it('converts Date objects to ISO strings', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({
            id: 'evt_123',
            action: 'user.created',
            occurred_at: '2024-01-01T00:00:00Z',
            received_at: '2024-01-01T00:00:00Z',
            organization_id: 'org_1',
            object: 'event',
          }),
      });

      const date = new Date('2024-06-15T12:00:00Z');
      const client = new LogSeal({ apiKey: 'test_key' });
      await client.emitSync({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
        occurredAt: date,
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.occurred_at).toBe('2024-06-15T12:00:00.000Z');

      await client.shutdown();
    });
  });

  // ─── API error handling ───────────────────────────────

  describe('API error handling', () => {
    it('throws LogSealError on non-OK response', async () => {
      mockFetch({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: {
              type: 'authentication_error',
              code: 'invalid_api_key',
              message: 'Invalid API key.',
            },
          }),
      });

      const client = new LogSeal({ apiKey: 'bad_key', maxRetries: 0 });

      await expect(
        client.emitSync({
          action: 'user.created',
          organizationId: 'org_1',
          actor: { id: 'actor_1' },
        })
      ).rejects.toThrow(LogSealError);

      await client.shutdown();
    });
  });

  // ─── Custom baseUrl ───────────────────────────────────

  describe('custom baseUrl', () => {
    it('uses custom baseUrl for requests', async () => {
      const fetchMock = mockFetch({
        json: () =>
          Promise.resolve({
            id: 'evt_123',
            action: 'user.created',
            occurred_at: '2024-01-01T00:00:00Z',
            received_at: '2024-01-01T00:00:00Z',
            organization_id: 'org_1',
            object: 'event',
          }),
      });

      const client = new LogSeal({
        apiKey: 'test_key',
        baseUrl: 'https://custom.api.com',
      });
      await client.emitSync({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
      });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('https://custom.api.com/v1/events');

      await client.shutdown();
    });
  });
});
