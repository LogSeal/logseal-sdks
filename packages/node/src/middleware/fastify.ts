import type { EmitEventInput } from '../types.js';
import { isExcluded, buildEvent } from './core.js';
import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyMiddlewareConfig,
  FastifyPluginReturn,
} from './types.js';

export function createFastifyMiddleware(
  emit: (event: EmitEventInput) => Promise<unknown>,
  config: FastifyMiddlewareConfig
): FastifyPluginReturn {
  const onError = config.onError ?? console.error;

  const plugin = function (
    instance: FastifyInstance,
    _opts: Record<string, unknown>,
    done: (err?: Error) => void
  ) {
    instance.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, hookDone: () => void) => {
      try {
        const urlPath = request.url.split('?')[0];

        if (isExcluded(urlPath, config.exclude)) {
          hookDone();
          return;
        }

        const routePattern =
          request.routeOptions?.url ?? request.routerPath ?? null;

        const header = (name: string): string | undefined => {
          const val = request.headers[name.toLowerCase()];
          return Array.isArray(val) ? val[0] : val;
        };

        const event = buildEvent(config, request, {
          method: request.method,
          path: urlPath,
          routePattern,
          statusCode: reply.statusCode,
          ipAddress: request.ip ?? header('x-forwarded-for') ?? header('x-real-ip'),
          userAgent: header('user-agent'),
          requestId: header('x-request-id'),
          body: config.captureBody ? request.body : undefined,
        });

        if (event) {
          emit(event).catch(onError);
        }
      } catch (err) {
        onError(err);
      }

      hookDone();
    });

    done();
  } as FastifyPluginReturn;

  // Equivalent to fastify-plugin: prevents Fastify encapsulation
  plugin[Symbol.for('skip-override')] = true;

  return plugin;
}
