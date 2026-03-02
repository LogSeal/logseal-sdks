import { describe, it, expect } from 'vitest';
import {
  generateAction,
  isExcluded,
  resolveAction,
  buildEvent,
} from './core.js';
import type { MiddlewareConfig, ResolvedRequestData } from './types.js';

describe('generateAction', () => {
  it('converts method and route to dot notation', () => {
    expect(generateAction('POST', '/users/:id')).toBe('post.users.:id');
  });

  it('handles root path', () => {
    expect(generateAction('GET', '/')).toBe('get.root');
  });

  it('handles nested routes', () => {
    expect(generateAction('DELETE', '/orgs/:orgId/members/:id')).toBe(
      'delete.orgs.:orgId.members.:id'
    );
  });

  it('strips trailing slashes', () => {
    expect(generateAction('GET', '/users/')).toBe('get.users');
  });
});

describe('isExcluded', () => {
  it('returns false with no exclusions', () => {
    expect(isExcluded('/health', undefined)).toBe(false);
    expect(isExcluded('/health', [])).toBe(false);
  });

  it('matches exact paths', () => {
    expect(isExcluded('/health', ['/health'])).toBe(true);
    expect(isExcluded('/healthz', ['/health'])).toBe(false);
  });

  it('matches prefix patterns with wildcard', () => {
    expect(isExcluded('/api/internal/status', ['/api/internal/*'])).toBe(true);
    expect(isExcluded('/api/public/status', ['/api/internal/*'])).toBe(false);
  });

  it('handles multiple patterns', () => {
    const exclude = ['/health', '/metrics', '/api/internal/*'];
    expect(isExcluded('/health', exclude)).toBe(true);
    expect(isExcluded('/metrics', exclude)).toBe(true);
    expect(isExcluded('/api/internal/check', exclude)).toBe(true);
    expect(isExcluded('/api/users', exclude)).toBe(false);
  });
});

describe('resolveAction', () => {
  it('uses actionMap exact path match first', () => {
    const actionMap = { 'POST /users': 'user.created' };
    expect(resolveAction('POST', '/users', '/users', actionMap)).toBe(
      'user.created'
    );
  });

  it('uses actionMap route pattern match', () => {
    const actionMap = { 'GET /users/:id': 'user.viewed' };
    expect(
      resolveAction('GET', '/users/123', '/users/:id', actionMap)
    ).toBe('user.viewed');
  });

  it('falls back to auto-generated action', () => {
    expect(resolveAction('POST', '/users', '/users', undefined)).toBe(
      'post.users'
    );
  });

  it('uses path when no route pattern', () => {
    expect(resolveAction('GET', '/users/123', null, undefined)).toBe(
      'get.users.123'
    );
  });
});

describe('buildEvent', () => {
  const baseConfig: MiddlewareConfig<{ user?: { id: string; orgId: string } }> = {
    actor: (req) =>
      req.user ? { id: req.user.id } : null,
    organizationId: (req) => req.user?.orgId ?? null,
  };

  const baseData: ResolvedRequestData = {
    method: 'POST',
    path: '/users',
    routePattern: '/users',
    statusCode: 201,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    requestId: 'req-123',
    body: undefined,
  };

  it('builds a complete event', () => {
    const request = { user: { id: 'user-1', orgId: 'org-1' } };
    const event = buildEvent(baseConfig, request, baseData);

    expect(event).toEqual({
      action: 'post.users',
      organizationId: 'org-1',
      actor: { id: 'user-1' },
      metadata: { statusCode: 201 },
      context: {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        requestId: 'req-123',
      },
    });
  });

  it('returns null when actor is missing', () => {
    const event = buildEvent(baseConfig, {}, baseData);
    expect(event).toBeNull();
  });

  it('returns null when organizationId is missing', () => {
    const config: MiddlewareConfig<{ user?: { id: string } }> = {
      actor: (req) => (req.user ? { id: req.user.id } : null),
      organizationId: () => null,
    };
    const event = buildEvent(config, { user: { id: 'user-1' } }, baseData);
    expect(event).toBeNull();
  });

  it('supports static organizationId', () => {
    const config: MiddlewareConfig<Record<string, never>> = {
      actor: () => ({ id: 'user-1' }),
      organizationId: 'static-org',
    };
    const event = buildEvent(config, {}, baseData);
    expect(event?.organizationId).toBe('static-org');
  });

  it('captures body when captureBody is true', () => {
    const config = { ...baseConfig, captureBody: true };
    const data = { ...baseData, body: { name: 'test' } };
    const request = { user: { id: 'user-1', orgId: 'org-1' } };
    const event = buildEvent(config, request, data);
    expect(event?.metadata?.requestBody).toEqual({ name: 'test' });
  });

  it('skips statusCode when captureStatus is false', () => {
    const config = { ...baseConfig, captureStatus: false };
    const request = { user: { id: 'user-1', orgId: 'org-1' } };
    const event = buildEvent(config, request, baseData);
    expect(event?.metadata).toBeUndefined();
  });

  it('applies enrichMetadata', () => {
    const config = {
      ...baseConfig,
      enrichMetadata: (
        _req: { user?: { id: string; orgId: string } },
        metadata: Record<string, unknown>
      ) => ({
        ...metadata,
        custom: 'value',
      }),
    };
    const request = { user: { id: 'user-1', orgId: 'org-1' } };
    const event = buildEvent(config, request, baseData);
    expect(event?.metadata?.custom).toBe('value');
  });
});
