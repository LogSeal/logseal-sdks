import { describe, it, expect, vi } from 'vitest';
import { createHonoMiddleware } from './hono.js';
import type { HonoContext } from './types.js';

function createMockContext(overrides: Partial<{
  method: string;
  url: string;
  path: string;
  routePath: string;
  status: number;
  headers: Record<string, string>;
}> = {}): HonoContext {
  const headers = overrides.headers ?? {
    'user-agent': 'test-agent',
    'x-request-id': 'req-123',
  };
  return {
    req: {
      method: overrides.method ?? 'GET',
      url: overrides.url ?? 'http://localhost/users',
      path: overrides.path ?? '/users',
      routePath: overrides.routePath ?? '/users',
      header: (name: string) => headers[name.toLowerCase()],
      raw: { body: undefined },
    },
    res: {
      status: overrides.status ?? 200,
    },
  };
}

describe('createHonoMiddleware', () => {
  it('calls next() and emits event after', async () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createHonoMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
    });

    const c = createMockContext();
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware(c, next);

    expect(next).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledOnce();
    const event = emit.mock.calls[0][0];
    expect(event.action).toBe('get.users');
    expect(event.organizationId).toBe('org-1');
    expect(event.actor).toEqual({ id: 'user-1' });
  });

  it('skips excluded paths', async () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createHonoMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
      exclude: ['/health'],
    });

    const c = createMockContext({ path: '/health' });
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware(c, next);

    expect(next).toHaveBeenCalledOnce();
    expect(emit).not.toHaveBeenCalled();
  });

  it('silently skips when actor is null', async () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createHonoMiddleware(emit, {
      actor: () => null,
      organizationId: 'org-1',
    });

    const c = createMockContext();
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware(c, next);

    expect(emit).not.toHaveBeenCalled();
  });

  it('uses routePath for action generation', async () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createHonoMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
    });

    const c = createMockContext({
      method: 'GET',
      path: '/users/123',
      routePath: '/users/:id',
    });
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware(c, next);

    expect(emit.mock.calls[0][0].action).toBe('get.users.:id');
  });

  it('uses actionMap when matching', async () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createHonoMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
      actionMap: { 'POST /users': 'user.created' },
    });

    const c = createMockContext({
      method: 'POST',
      path: '/users',
      routePath: '/users',
    });
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware(c, next);

    expect(emit.mock.calls[0][0].action).toBe('user.created');
  });

  it('captures IP from x-forwarded-for header', async () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createHonoMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
    });

    const c = createMockContext({
      headers: {
        'x-forwarded-for': '10.0.0.1',
        'user-agent': 'test',
      },
    });
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware(c, next);

    expect(emit.mock.calls[0][0].context.ipAddress).toBe('10.0.0.1');
  });

  it('calls onError when emit fails', async () => {
    const onError = vi.fn();
    const error = new Error('emit failed');
    const emit = vi.fn().mockRejectedValue(error);
    const middleware = createHonoMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
      onError,
    });

    const c = createMockContext();
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware(c, next);

    await new Promise((r) => setTimeout(r, 10));
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('captures status code in metadata by default', async () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createHonoMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
    });

    const c = createMockContext({ status: 201 });
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware(c, next);

    expect(emit.mock.calls[0][0].metadata.statusCode).toBe(201);
  });
});
