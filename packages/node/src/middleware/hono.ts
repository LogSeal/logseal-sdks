import type { EmitEventInput } from '../types.js';
import { isExcluded, buildEvent } from './core.js';
import type {
  HonoContext,
  HonoNextFunction,
  HonoMiddlewareConfig,
  HonoMiddlewareReturn,
} from './types.js';

export function createHonoMiddleware(
  emit: (event: EmitEventInput) => Promise<unknown>,
  config: HonoMiddlewareConfig
): HonoMiddlewareReturn {
  const onError = config.onError ?? console.error;

  return async (c: HonoContext, next: HonoNextFunction) => {
    const path = c.req.path;

    if (isExcluded(path, config.exclude)) {
      await next();
      return;
    }

    await next();

    try {
      const event = buildEvent(config, c, {
        method: c.req.method,
        path,
        routePattern: c.req.routePath ?? null,
        statusCode: c.res.status,
        ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        requestId: c.req.header('x-request-id'),
        body: config.captureBody ? c.req.raw.body : undefined,
      });

      if (event) {
        emit(event).catch(onError);
      }
    } catch (err) {
      onError(err);
    }
  };
}
