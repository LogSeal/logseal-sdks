import { LogSealError, type ErrorType } from './error.js';
import { VERSION } from './version.js';
import type {
  EmitEventInput,
  EmitEventResponse,
  BatchEmitResponse,
  AuditEvent,
  ListEventsParams,
  PaginatedList,
  Organization,
  CreateOrganizationInput,
  EventSchema,
  CreateEventSchemaInput,
  UpdateEventSchemaInput,
  ViewerToken,
  CreateViewerTokenInput,
  Webhook,
  WebhookWithSecret,
  CreateWebhookInput,
  UpdateWebhookInput,
  Export,
  CreateExportInput,
  VerifyParams,
  VerifyResponse,
  VerifyRangeParams,
  VerifyRangeResponse,
  MerkleProofResponse,
} from './types.js';
import type {
  ExpressMiddlewareConfig,
  ExpressMiddlewareReturn,
  FastifyMiddlewareConfig,
  FastifyPluginReturn,
  HonoMiddlewareConfig,
  HonoMiddlewareReturn,
} from './middleware/types.js';
import { createExpressMiddleware } from './middleware/express.js';
import { createFastifyMiddleware } from './middleware/fastify.js';
import { createHonoMiddleware } from './middleware/hono.js';

export interface LogSealConfig {
  apiKey: string;
  baseUrl?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  maxRetries?: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toISOString(date: string | Date | undefined): string | undefined {
  if (!date) return undefined;
  if (date instanceof Date) return date.toISOString();
  return date;
}

export class LogSeal {
  private apiKey: string;
  private baseUrl: string;
  private batchSize: number;
  private flushInterval: number;
  private queue: EmitEventInput[];
  private timer: ReturnType<typeof setInterval> | null;
  private retryConfig: RetryConfig;

  public readonly events: EventsAPI;
  public readonly organizations: OrganizationsAPI;
  public readonly schemas: SchemasAPI;
  public readonly viewerTokens: ViewerTokensAPI;
  public readonly webhooks: WebhooksAPI;
  public readonly exports: ExportsAPI;

  constructor(config: LogSealConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.logseal.dev';
    this.batchSize = config.batchSize ?? 100;
    this.flushInterval = config.flushIntervalMs ?? 5000;
    this.queue = [];
    this.timer = null;
    this.retryConfig = {
      maxRetries: config.maxRetries ?? 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
    };

    // Initialize sub-APIs
    this.events = new EventsAPI(this);
    this.organizations = new OrganizationsAPI(this);
    this.schemas = new SchemasAPI(this);
    this.viewerTokens = new ViewerTokensAPI(this);
    this.webhooks = new WebhooksAPI(this);
    this.exports = new ExportsAPI(this);

    // Start the flush timer
    this.startFlushTimer();
  }

  /**
   * Emit an event (queued for batching)
   */
  async emit(event: EmitEventInput): Promise<{ status: 'queued' }> {
    this.validateEvent(event);
    this.queue.push(event);

    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }

    return { status: 'queued' };
  }

  /**
   * Emit an event and wait for server confirmation
   */
  async emitSync(event: EmitEventInput): Promise<EmitEventResponse> {
    this.validateEvent(event);
    return this.request<EmitEventResponse>('POST', '/v1/events', this.formatEvent(event));
  }

  /**
   * Flush all queued events
   */
  async flush(): Promise<{ sent: number }> {
    if (this.queue.length === 0) {
      return { sent: 0 };
    }

    const events = this.queue.splice(0, this.queue.length);

    try {
      const response = await this.request<BatchEmitResponse>('POST', '/v1/events/batch', {
        events: events.map((e) => this.formatEvent(e)),
      });

      return { sent: response.accepted };
    } catch (err) {
      // Re-queue events that failed to send so they can be retried on the next flush
      this.queue.unshift(...events);
      throw err;
    }
  }

  /**
   * Graceful shutdown - flushes remaining events
   */
  async shutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  /**
   * Create Express middleware that automatically emits audit events for HTTP requests.
   */
  express(config: ExpressMiddlewareConfig): ExpressMiddlewareReturn {
    return createExpressMiddleware(this.emit.bind(this), config);
  }

  /**
   * Create a Fastify plugin that automatically emits audit events for HTTP requests.
   */
  fastify(config: FastifyMiddlewareConfig): FastifyPluginReturn {
    return createFastifyMiddleware(this.emit.bind(this), config);
  }

  /**
   * Create Hono middleware that automatically emits audit events for HTTP requests.
   */
  hono(config: HonoMiddlewareConfig): HonoMiddlewareReturn {
    return createHonoMiddleware(this.emit.bind(this), config);
  }

  // Internal methods

  private startFlushTimer(): void {
    this.timer = setInterval(() => {
      this.flush().catch((err) => {
        console.error('LogSeal: Failed to flush events:', err.message);
      });
    }, this.flushInterval);

    // Don't prevent process exit
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  private validateEvent(event: EmitEventInput): void {
    if (!event.action) {
      throw new LogSealError({
        type: 'validation_error',
        code: 'missing_required_field',
        message: "The 'action' field is required.",
        param: 'action',
      });
    }
    if (!event.actor?.id) {
      throw new LogSealError({
        type: 'validation_error',
        code: 'missing_required_field',
        message: "The 'actor.id' field is required.",
        param: 'actor.id',
      });
    }
    if (!event.organizationId) {
      throw new LogSealError({
        type: 'validation_error',
        code: 'missing_required_field',
        message: "The 'organizationId' field is required.",
        param: 'organizationId',
      });
    }
  }

  private formatEvent(event: EmitEventInput): Record<string, unknown> {
    return {
      action: event.action,
      organization_id: event.organizationId,
      actor: {
        id: event.actor.id,
        type: event.actor.type,
        name: event.actor.name,
        email: event.actor.email,
        metadata: event.actor.metadata,
      },
      targets: event.targets?.map((t) => ({
        type: t.type,
        id: t.id,
        name: t.name,
        metadata: t.metadata,
      })),
      metadata: event.metadata,
      context: event.context
        ? {
            ip_address: event.context.ipAddress,
            user_agent: event.context.userAgent,
            request_id: event.context.requestId,
          }
        : undefined,
      occurred_at: toISOString(event.occurredAt),
      idempotency_key: event.idempotencyKey,
    };
  }

  /** @internal */
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': `logseal-node/${VERSION}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Retry on rate limit or server errors
    if (response.status === 429 || response.status >= 500) {
      if (retryCount < this.retryConfig.maxRetries) {
        const delay = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(2, retryCount),
          this.retryConfig.maxDelayMs
        );
        const jitter = delay * 0.2 * Math.random();
        await sleep(delay + jitter);
        return this.request(method, path, body, retryCount + 1);
      }
    }

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const errorData = data.error as { type: ErrorType; code: string; message: string; param?: string; doc_url?: string };
      throw new LogSealError(errorData, response.status);
    }

    return data as T;
  }
}

// Sub-API classes

class EventsAPI {
  constructor(private client: LogSeal) {}

  async list(params: ListEventsParams): Promise<PaginatedList<AuditEvent>> {
    const query = new URLSearchParams();
    query.set('organization_id', params.organizationId);
    if (params.action) query.set('action', params.action);
    if (params.actionPrefix) query.set('action_prefix', params.actionPrefix);
    if (params.actorId) query.set('actor_id', params.actorId);
    if (params.targetType) query.set('target_type', params.targetType);
    if (params.targetId) query.set('target_id', params.targetId);
    if (params.after) query.set('after', toISOString(params.after)!);
    if (params.before) query.set('before', toISOString(params.before)!);
    if (params.search) query.set('search', params.search);
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.cursor) query.set('cursor', params.cursor);

    return this.client.request('GET', `/v1/events?${query.toString()}`);
  }

  async get(id: string): Promise<AuditEvent> {
    return this.client.request('GET', `/v1/events/${id}`);
  }

  async verify(params: VerifyParams): Promise<VerifyResponse> {
    return this.client.request('POST', '/v1/events/verify', {
      organization_id: params.organizationId,
      after: toISOString(params.after),
      before: toISOString(params.before),
    });
  }

  async verifyRange(params: VerifyRangeParams): Promise<VerifyRangeResponse> {
    return this.client.request('POST', '/v1/events/verify-range', {
      organization_id: params.organizationId,
      from_sequence: params.fromSequence,
      to_sequence: params.toSequence,
    });
  }

  async getProof(eventId: string): Promise<MerkleProofResponse> {
    return this.client.request('GET', `/v1/events/${eventId}/proof`);
  }

  async *listAll(params: Omit<ListEventsParams, 'cursor'>): AsyncGenerator<AuditEvent> {
    let cursor: string | undefined;

    do {
      const response = await this.list({ ...params, cursor });
      for (const event of response.data) {
        yield event;
      }
      cursor = response.next_cursor;
    } while (cursor);
  }
}

class OrganizationsAPI {
  constructor(private client: LogSeal) {}

  async list(): Promise<PaginatedList<Organization>> {
    return this.client.request('GET', '/v1/organizations');
  }

  async create(input: CreateOrganizationInput): Promise<Organization> {
    return this.client.request('POST', '/v1/organizations', {
      external_id: input.externalId,
      name: input.name,
    });
  }

  async get(id: string): Promise<Organization> {
    return this.client.request('GET', `/v1/organizations/${id}`);
  }
}

class SchemasAPI {
  constructor(private client: LogSeal) {}

  async list(): Promise<PaginatedList<EventSchema>> {
    return this.client.request('GET', '/v1/schemas');
  }

  async create(input: CreateEventSchemaInput): Promise<EventSchema> {
    return this.client.request('POST', '/v1/schemas', {
      action: input.action,
      description: input.description,
      target_types: input.targetTypes,
      metadata_schema: input.metadataSchema,
    });
  }

  async get(id: string): Promise<EventSchema> {
    return this.client.request('GET', `/v1/schemas/${id}`);
  }

  async update(id: string, input: UpdateEventSchemaInput): Promise<EventSchema> {
    return this.client.request('PATCH', `/v1/schemas/${id}`, {
      description: input.description,
      target_types: input.targetTypes,
      metadata_schema: input.metadataSchema,
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.request('DELETE', `/v1/schemas/${id}`);
  }
}

class ViewerTokensAPI {
  constructor(private client: LogSeal) {}

  async create(input: CreateViewerTokenInput): Promise<ViewerToken> {
    return this.client.request('POST', '/v1/viewer-tokens', {
      organization_id: input.organizationId,
      expires_in: input.expiresIn,
    });
  }
}

class WebhooksAPI {
  constructor(private client: LogSeal) {}

  async list(): Promise<PaginatedList<Webhook>> {
    return this.client.request('GET', '/v1/webhooks');
  }

  async create(input: CreateWebhookInput): Promise<WebhookWithSecret> {
    return this.client.request('POST', '/v1/webhooks', {
      url: input.url,
      organization_id: input.organizationId,
      events: input.events,
      enabled: input.enabled,
    });
  }

  async get(id: string): Promise<Webhook> {
    return this.client.request('GET', `/v1/webhooks/${id}`);
  }

  async update(id: string, input: UpdateWebhookInput): Promise<Webhook> {
    return this.client.request('PATCH', `/v1/webhooks/${id}`, {
      url: input.url,
      events: input.events,
      enabled: input.enabled,
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.request('DELETE', `/v1/webhooks/${id}`);
  }
}

class ExportsAPI {
  constructor(private client: LogSeal) {}

  async create(input: CreateExportInput): Promise<Export> {
    return this.client.request('POST', '/v1/exports', {
      organization_id: input.organizationId,
      format: input.format,
      filters: input.filters
        ? {
            after: toISOString(input.filters.after),
            before: toISOString(input.filters.before),
            action: input.filters.action,
            actor_id: input.filters.actorId,
          }
        : undefined,
    });
  }

  async get(id: string): Promise<Export> {
    return this.client.request('GET', `/v1/exports/${id}`);
  }

  async poll(id: string, intervalMs = 1000, maxWaitMs = 60000): Promise<Export> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const exportJob = await this.get(id);
      if (exportJob.status === 'completed' || exportJob.status === 'failed') {
        return exportJob;
      }
      await sleep(intervalMs);
    }
    throw new LogSealError({
      type: 'internal_error',
      code: 'export_timeout',
      message: 'Export did not complete within the timeout period.',
    });
  }
}
