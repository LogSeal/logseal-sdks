import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LogSeal } from '../client.js';
import { LogSealError } from '../error.js';

describe('Retry logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries on 429 with exponential backoff', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: () =>
            Promise.resolve({
              error: {
                type: 'rate_limit_error',
                code: 'rate_limit_exceeded',
                message: 'Rate limit exceeded.',
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
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
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new LogSeal({ apiKey: 'test_key', maxRetries: 3 });

    // Run the request in a non-blocking way so we can advance timers
    const resultPromise = client.emitSync({
      action: 'user.created',
      organizationId: 'org_1',
      actor: { id: 'actor_1' },
    });

    // Advance through retry delays
    await vi.advanceTimersByTimeAsync(2000); // 1st retry delay (~1000ms + jitter)
    await vi.advanceTimersByTimeAsync(3000); // 2nd retry delay (~2000ms + jitter)

    const result = await resultPromise;

    expect(result.id).toBe('evt_123');
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await client.shutdown();
  });

  it('retries on 500 server errors', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () =>
            Promise.resolve({
              error: {
                type: 'internal_error',
                code: 'internal',
                message: 'Internal server error.',
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'evt_456',
            action: 'user.created',
            occurred_at: '2024-01-01T00:00:00Z',
            received_at: '2024-01-01T00:00:00Z',
            organization_id: 'org_1',
            object: 'event',
          }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new LogSeal({ apiKey: 'test_key', maxRetries: 3 });
    const resultPromise = client.emitSync({
      action: 'user.created',
      organizationId: 'org_1',
      actor: { id: 'actor_1' },
    });

    await vi.advanceTimersByTimeAsync(2000);
    const result = await resultPromise;

    expect(result.id).toBe('evt_456');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await client.shutdown();
  });

  it('retries on 502 and 503 server errors', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 502,
          json: () =>
            Promise.resolve({
              error: { type: 'internal_error', code: 'bad_gateway', message: 'Bad gateway.' },
            }),
        });
      }
      if (callCount === 2) {
        return Promise.resolve({
          ok: false,
          status: 503,
          json: () =>
            Promise.resolve({
              error: { type: 'internal_error', code: 'service_unavailable', message: 'Service unavailable.' },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'evt_789',
            action: 'user.created',
            occurred_at: '2024-01-01T00:00:00Z',
            received_at: '2024-01-01T00:00:00Z',
            organization_id: 'org_1',
            object: 'event',
          }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new LogSeal({ apiKey: 'test_key', maxRetries: 3 });
    const resultPromise = client.emitSync({
      action: 'user.created',
      organizationId: 'org_1',
      actor: { id: 'actor_1' },
    });

    await vi.advanceTimersByTimeAsync(5000);
    const result = await resultPromise;

    expect(result.id).toBe('evt_789');
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await client.shutdown();
  });

  it('respects maxRetries and throws after exhausting retries', async () => {
    // Use real timers for this test to avoid timer interaction issues
    vi.useRealTimers();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          error: {
            type: 'internal_error',
            code: 'internal',
            message: 'Internal server error.',
          },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    // Use very short retry delays to keep test fast
    const client = new LogSeal({ apiKey: 'test_key', maxRetries: 2 });
    // Override the retry config to use minimal delays
    (client as any).retryConfig = { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 };

    await expect(
      client.emitSync({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
      })
    ).rejects.toThrow(LogSealError);

    // 1 initial + 2 retries = 3 total
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await client.shutdown();
  });

  it('does NOT retry on 400 errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: {
            type: 'validation_error',
            code: 'invalid_param',
            message: 'Invalid parameter.',
          },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new LogSeal({ apiKey: 'test_key', maxRetries: 3 });

    await expect(
      client.emitSync({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
      })
    ).rejects.toThrow(LogSealError);

    // Should NOT retry — only 1 call
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await client.shutdown();
  });

  it('does NOT retry on 401 errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
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
    vi.stubGlobal('fetch', fetchMock);

    const client = new LogSeal({ apiKey: 'bad_key', maxRetries: 3 });

    await expect(
      client.emitSync({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
      })
    ).rejects.toThrow(LogSealError);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await client.shutdown();
  });

  it('does NOT retry on 403 errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          error: {
            type: 'authorization_error',
            code: 'insufficient_permissions',
            message: 'Insufficient permissions.',
          },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new LogSeal({ apiKey: 'test_key', maxRetries: 3 });

    await expect(
      client.emitSync({
        action: 'user.created',
        organizationId: 'org_1',
        actor: { id: 'actor_1' },
      })
    ).rejects.toThrow(LogSealError);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await client.shutdown();
  });

  it('successful retry returns correct response', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: () =>
            Promise.resolve({
              error: {
                type: 'rate_limit_error',
                code: 'rate_limit_exceeded',
                message: 'Too many requests.',
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'evt_success',
            action: 'user.created',
            occurred_at: '2024-01-01T00:00:00Z',
            received_at: '2024-01-01T00:00:00Z',
            organization_id: 'org_1',
            object: 'event',
          }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new LogSeal({ apiKey: 'test_key', maxRetries: 3 });
    const resultPromise = client.emitSync({
      action: 'user.created',
      organizationId: 'org_1',
      actor: { id: 'actor_1' },
    });

    await vi.advanceTimersByTimeAsync(2000);
    const result = await resultPromise;

    expect(result.id).toBe('evt_success');
    expect(result.action).toBe('user.created');
    expect(result.object).toBe('event');

    await client.shutdown();
  });
});
