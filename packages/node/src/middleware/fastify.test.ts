import { describe, it, expect, vi } from 'vitest';
import { createFastifyMiddleware } from './fastify.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from './types.js';

function createMockInstance(): FastifyInstance & {
  _hooks: Record<string, ((...args: unknown[]) => void)[]>;
  _triggerHook: (name: string, ...args: unknown[]) => void;
} {
  const hooks: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    _hooks: hooks,
    addHook(name: string, handler: (...args: unknown[]) => void) {
      (hooks[name] ??= []).push(handler);
    },
    _triggerHook(name: string, ...args: unknown[]) {
      for (const fn of hooks[name] ?? []) fn(...args);
    },
  };
}

function createMockRequest(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  return {
    method: 'GET',
    url: '/users',
    headers: {
      'user-agent': 'test-agent',
      'x-request-id': 'req-123',
    },
    ...overrides,
  };
}

function createMockReply(statusCode = 200): FastifyReply {
  return { statusCode };
}

describe('createFastifyMiddleware', () => {
  it('registers an onResponse hook', () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const plugin = createFastifyMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
    });

    const instance = createMockInstance();
    const done = vi.fn();
    plugin(instance, {}, done);

    expect(done).toHaveBeenCalledOnce();
    expect(instance._hooks['onResponse']).toHaveLength(1);
  });

  it('has skip-override symbol set', () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const plugin = createFastifyMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
    });

    expect(plugin[Symbol.for('skip-override')]).toBe(true);
  });

  it('emits event on response', () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const plugin = createFastifyMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
    });

    const instance = createMockInstance();
    plugin(instance, {}, vi.fn());

    const request = createMockRequest({
      routeOptions: { url: '/users' },
    });
    const reply = createMockReply(200);
    const hookDone = vi.fn();

    instance._triggerHook('onResponse', request, reply, hookDone);

    expect(emit).toHaveBeenCalledOnce();
    expect(hookDone).toHaveBeenCalledOnce();
    const event = emit.mock.calls[0][0];
    expect(event.action).toBe('get.users');
    expect(event.organizationId).toBe('org-1');
  });

  it('uses routerPath fallback', () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const plugin = createFastifyMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
    });

    const instance = createMockInstance();
    plugin(instance, {}, vi.fn());

    const request = createMockRequest({
      routerPath: '/users/:id',
    });
    const hookDone = vi.fn();
    instance._triggerHook('onResponse', request, createMockReply(), hookDone);

    expect(emit.mock.calls[0][0].action).toBe('get.users.:id');
  });

  it('skips excluded paths', () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const plugin = createFastifyMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
      exclude: ['/health'],
    });

    const instance = createMockInstance();
    plugin(instance, {}, vi.fn());

    const request = createMockRequest({ url: '/health' });
    const hookDone = vi.fn();
    instance._triggerHook('onResponse', request, createMockReply(), hookDone);

    expect(emit).not.toHaveBeenCalled();
    expect(hookDone).toHaveBeenCalledOnce();
  });

  it('silently skips when actor returns null', () => {
    const emit = vi.fn().mockResolvedValue({ status: 'queued' });
    const plugin = createFastifyMiddleware(emit, {
      actor: () => null,
      organizationId: 'org-1',
    });

    const instance = createMockInstance();
    plugin(instance, {}, vi.fn());

    const request = createMockRequest();
    const hookDone = vi.fn();
    instance._triggerHook('onResponse', request, createMockReply(), hookDone);

    expect(emit).not.toHaveBeenCalled();
    expect(hookDone).toHaveBeenCalledOnce();
  });

  it('calls onError on failure', async () => {
    const onError = vi.fn();
    const error = new Error('emit failed');
    const emit = vi.fn().mockRejectedValue(error);
    const plugin = createFastifyMiddleware(emit, {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'org-1',
      onError,
    });

    const instance = createMockInstance();
    plugin(instance, {}, vi.fn());

    const request = createMockRequest({ routeOptions: { url: '/users' } });
    const hookDone = vi.fn();
    instance._triggerHook('onResponse', request, createMockReply(), hookDone);

    await new Promise((r) => setTimeout(r, 10));
    expect(onError).toHaveBeenCalledWith(error);
  });
});
