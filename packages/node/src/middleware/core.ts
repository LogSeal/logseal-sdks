import type { EmitEventInput } from '../types.js';
import type { MiddlewareConfig, ResolvedRequestData } from './types.js';

export function generateAction(method: string, routePattern: string): string {
  const normalized = routePattern
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/\//g, '.');
  return `${method.toLowerCase()}.${normalized || 'root'}`;
}

export function isExcluded(path: string, exclude?: string[]): boolean {
  if (!exclude || exclude.length === 0) return false;
  for (const pattern of exclude) {
    if (pattern.endsWith('*')) {
      if (path.startsWith(pattern.slice(0, -1))) return true;
    } else {
      if (path === pattern) return true;
    }
  }
  return false;
}

export function resolveAction(
  method: string,
  path: string,
  routePattern: string | null,
  actionMap?: Record<string, string>
): string {
  if (actionMap) {
    const key = `${method.toUpperCase()} ${path}`;
    if (actionMap[key]) return actionMap[key];

    if (routePattern) {
      const routeKey = `${method.toUpperCase()} ${routePattern}`;
      if (actionMap[routeKey]) return actionMap[routeKey];
    }
  }

  return generateAction(method, routePattern ?? path);
}

const EXCLUDED_METHODS = new Set(['OPTIONS', 'HEAD']);

export function buildEvent<TRequest>(
  config: MiddlewareConfig<TRequest>,
  request: TRequest,
  data: ResolvedRequestData
): EmitEventInput | null {
  if (EXCLUDED_METHODS.has(data.method.toUpperCase())) return null;

  const actor = config.actor(request);
  if (!actor?.id) return null;

  const organizationId =
    typeof config.organizationId === 'function'
      ? config.organizationId(request)
      : config.organizationId;
  if (!organizationId) return null;

  const action = resolveAction(
    data.method,
    data.path,
    data.routePattern,
    config.actionMap
  );

  let metadata: Record<string, unknown> = {};
  if ((config.captureStatus ?? true) && data.statusCode) {
    metadata.statusCode = data.statusCode;
  }
  if (config.captureBody && data.body !== undefined) {
    metadata.requestBody = data.body;
  }
  if (config.enrichMetadata) {
    metadata = config.enrichMetadata(request, metadata);
  }

  return {
    action,
    organizationId,
    actor,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    context: {
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      requestId: data.requestId,
    },
  };
}
