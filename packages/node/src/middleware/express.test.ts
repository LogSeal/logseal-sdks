import { describe, it, expect, vi } from 'vitest';
import { createExpressMiddleware } from './express.js';
import type {
  ExpressRequest,
  ExpressResponse,
  ExpressNextFunction,
} from './types.js';

function createMockReq(overrides: Partial<ExpressRequest> = {}): ExpressRequest {
  return {
    method: 'GET',
    url: '/users',
    originalUrl: '/users',
    path: '/users',
    headers: {
      'user-agent': 'test-agent',
      'x-request-id': 'req-123',
    },
    ...overrides,
  };
}

function createMockRes(statusCode = 200): ExpressResponse & { _trigger: (event: string) => void } {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    statusCode,
    on(event: string, listener: () => void) {
      (listeners[event] ??= []).push(listener);
    },
    _trigger(event: string) {
      for (const fn of listeners[event] ?? []) fn();
    },
  };
}

describe('createExpressMiddleware', () => {
  const baseConfig = {
    actor: (req: ExpressRequest) => {
      const userId = (req as ExpressRequest & { user?: { id: string } }).user?.id;
      return userId ? { id: userId } : null;
    },
    organizationId: 'org-1',
  };

  it('calls next() immediately', () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createExpressMiddleware(emit, baseConfig);
    const next = vi.fn() as ExpressNextFunction;
    const req = createMockReq();
    const res = createMockRes();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(emit).not.toHaveBeenCalled();
  });

  it('emits event on res finish', () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createExpressMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
    });
    const next = vi.fn() as ExpressNextFunction;
    const req = createMockReq({
      route: { path: '/users' },
    });
    const res = createMockRes(200);

    middleware(req, res, next);
    res._trigger('finish');

    expect(emit).toHaveBeenCalledOnce();
    const event = emit.mock.calls[0][0];
    expect(event.action).toBe('get.users');
    expect(event.actor).toEqual({ id: 'user-1' });
    expect(event.organizationId).toBe('org-1');
  });

  it('skips excluded paths', () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createExpressMiddleware(emit, {
      ...baseConfig,
      exclude: ['/health'],
    });
    const next = vi.fn() as ExpressNextFunction;
    const req = createMockReq({ path: '/health' });
    const res = createMockRes();

    middleware(req, res, next);
    res._trigger('finish');

    expect(next).toHaveBeenCalledOnce();
    expect(emit).not.toHaveBeenCalled();
  });

  it('silently skips when actor is null (unauthenticated)', () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createExpressMiddleware(emit, baseConfig);
    const next = vi.fn() as ExpressNextFunction;
    const req = createMockReq();
    const res = createMockRes();

    middleware(req, res, next);
    res._trigger('finish');

    expect(emit).not.toHaveBeenCalled();
  });

  it('uses actionMap when matching', () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createExpressMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
      actionMap: { 'POST /users': 'user.created' },
    });
    const next = vi.fn() as ExpressNextFunction;
    const req = createMockReq({
      method: 'POST',
      originalUrl: '/users',
      path: '/users',
      route: { path: '/users' },
    });
    const res = createMockRes(201);

    middleware(req, res, next);
    res._trigger('finish');

    expect(emit.mock.calls[0][0].action).toBe('user.created');
  });

  it('calls onError when emit fails', async () => {
    const onError = vi.fn();
    const error = new Error('emit failed');
    const emit = vi.fn().mockRejectedValue(error);
    const middleware = createExpressMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
      onError,
    });
    const next = vi.fn() as ExpressNextFunction;
    const req = createMockReq({ route: { path: '/users' } });
    const res = createMockRes();

    middleware(req, res, next);
    res._trigger('finish');

    // Wait for the promise rejection to propagate
    await new Promise((r) => setTimeout(r, 10));
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('uses baseUrl + route.path for route pattern with nested routers', () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const middleware = createExpressMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
    });
    const next = vi.fn() as ExpressNextFunction;
    const req = createMockReq({
      method: 'GET',
      originalUrl: '/api/v1/users/123',
      path: '/users/123',
      baseUrl: '/api/v1',
      route: { path: '/users/:id' },
    });
    const res = createMockRes();

    middleware(req, res, next);
    res._trigger('finish');

    expect(emit.mock.calls[0][0].action).toBe('get.api.v1.users.:id');
  });
});
