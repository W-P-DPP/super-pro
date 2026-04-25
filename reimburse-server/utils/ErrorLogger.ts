import { createErrorMiddleware, type ServiceRuntime } from '@super-pro/shared-server';
import { Logger } from './Logger.ts';

export class ErrorLogger {
  private static logger = Logger.getInstance();

  public static middleware(runtime?: ServiceRuntime) {
    return createErrorMiddleware({
      logger: {
        error: (message, meta) => ErrorLogger.logger.error(message, meta),
      },
      fallbackMessage: '服务器内部错误',
      onError: runtime
        ? ({ err, req }) => runtime.reportException({
          type: 'request_error',
          error: err,
          serviceName: runtime.getState().serviceName,
          path: req.originalUrl,
          method: req.method,
          timestamp: Date.now(),
        })
        : undefined,
    });
  }
}
