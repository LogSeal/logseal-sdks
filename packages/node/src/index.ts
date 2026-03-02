export { LogSeal, type LogSealConfig } from './client.js';
export { LogSealError } from './error.js';
export type {
  EmitEventInput,
  EmitEventResponse,
  BatchEmitInput,
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
  CreateWebhookInput,
  UpdateWebhookInput,
  Export,
  CreateExportInput,
  VerifyParams,
  VerifyResponse,
} from './types.js';

// Middleware types
export type {
  MiddlewareConfig,
  ResolvedRequestData,
  ExpressMiddlewareConfig,
  ExpressMiddlewareReturn,
  FastifyMiddlewareConfig,
  FastifyPluginReturn,
  HonoMiddlewareConfig,
  HonoMiddlewareReturn,
} from './middleware/types.js';
