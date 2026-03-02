import type { EmitEventInput } from '../types.js';
import { isExcluded, buildEvent } from './core.js';
import type {
  ExpressRequest,
  ExpressResponse,
  ExpressNextFunction,
  ExpressMiddlewareConfig,
  ExpressMiddlewareReturn,
} from './types.js';

export function createExpressMiddleware(
  emit: (event: EmitEventInput) => Promise<unknown>,
  config: ExpressMiddlewareConfig
): ExpressMiddlewareReturn {
  const onError = config.onError ?? console.error;

  return (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
    try {
      if (isExcluded(req.path, config.exclude)) {
        next();
        return;
      }

      res.on('finish', () => {
        try {
          const routePattern = req.route
            ? (req.baseUrl ?? '') + req.route.path
            : null;

          const header = (name: string): string | undefined => {
            const val = req.headers[name.toLowerCase()];
            return Array.isArray(val) ? val[0] : val;
          };

          const event = buildEvent(config, req, {
            method: req.method,
            path: req.originalUrl.split('?')[0],
            routePattern,
            statusCode: res.statusCode,
            ipAddress: req.ip ?? header('x-forwarded-for') ?? header('x-real-ip'),
            userAgent: header('user-agent'),
            requestId: header('x-request-id'),
            body: config.captureBody ? req.body : undefined,
          });

          if (event) {
            emit(event).catch(onError);
          }
        } catch (err) {
          onError(err);
        }
      });

      next();
    } catch (err) {
      onError(err);
      next();
    }
  };
}
