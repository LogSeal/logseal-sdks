import type { ActorInput } from '../types.js';

// ============================================
// Shared Middleware Config
// ============================================

export interface MiddlewareConfig<TRequest> {
  actor: (req: TRequest) => ActorInput | null | undefined;
  organizationId: string | ((req: TRequest) => string | null | undefined);
  exclude?: string[];
  actionMap?: Record<string, string>;
  captureBody?: boolean;
  captureStatus?: boolean;
  enrichMetadata?: (
    req: TRequest,
    metadata: Record<string, unknown>
  ) => Record<string, unknown>;
  onError?: (error: unknown) => void;
}

export interface ResolvedRequestData {
  method: string;
  path: string;
  routePattern: string | null;
  statusCode: number;
  ipAddress: string | undefined;
  userAgent: string | undefined;
  requestId: string | undefined;
  body: unknown | undefined;
}

// ============================================
// Express Types (duck-typed)
// ============================================

export interface ExpressRequest {
  method: string;
  url: string;
  originalUrl: string;
  path: string;
  baseUrl?: string;
  route?: { path: string };
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ExpressResponse {
  statusCode: number;
  on(event: string, listener: () => void): void;
}

export type ExpressNextFunction = (err?: unknown) => void;

export type ExpressMiddlewareConfig = MiddlewareConfig<ExpressRequest>;
export type ExpressMiddlewareReturn = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: ExpressNextFunction
) => void;

// ============================================
// Fastify Types (duck-typed)
// ============================================

export interface FastifyRequest {
  method: string;
  url: string;
  routeOptions?: { url?: string };
  routerPath?: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface FastifyReply {
  statusCode: number;
}

export interface FastifyInstance {
  addHook(
    name: 'onResponse',
    handler: (
      request: FastifyRequest,
      reply: FastifyReply,
      done: () => void
    ) => void
  ): void;
}

export type FastifyMiddlewareConfig = MiddlewareConfig<FastifyRequest>;
export type FastifyPluginReturn = ((
  instance: FastifyInstance,
  opts: Record<string, unknown>,
  done: (err?: Error) => void
) => void) & { [key: symbol]: boolean };

// ============================================
// Hono Types (duck-typed)
// ============================================

export interface HonoContext {
  req: {
    method: string;
    url: string;
    path: string;
    routePath: string;
    header(name: string): string | undefined;
    raw: { body?: unknown };
  };
  res: {
    status: number;
  };
}

export type HonoNextFunction = () => Promise<void>;

export type HonoMiddlewareConfig = MiddlewareConfig<HonoContext>;
export type HonoMiddlewareReturn = (
  c: HonoContext,
  next: HonoNextFunction
) => Promise<void>;
