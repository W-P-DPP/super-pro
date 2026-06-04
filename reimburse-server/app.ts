import {
  createErrorMiddleware,
  createDevExceptionTestRouter,
  createHttpApp,
  createJwtMiddleware,
  createRequestLoggerMiddleware,
  createResponseMiddleware,
  type ServiceRuntime,
} from '@super-pro/shared-server';
import express from 'express';
import router from './src/index.ts';
import { Logger } from './utils/index.ts';

export function createApp(options: { runtime?: ServiceRuntime } = {}) {
  const apiRouter = express.Router();
  const logger = Logger.getInstance();
  const jwtMiddleware = createJwtMiddleware({
    missingTokenMessage: '缺少授权信息或授权格式错误',
    invalidTokenMessage: '令牌无效或已过期',
  });

  if (process.env.NODE_ENV === 'development' && options.runtime) {
    apiRouter.use('/__dev__', createDevExceptionTestRouter(options.runtime));
  }

  apiRouter.use('/', jwtMiddleware, router);

  return createHttpApp({
    requestLogger: createRequestLoggerMiddleware({
      logger: {
        info: (message) => logger.info(message),
      },
    }),
    responseMiddleware: createResponseMiddleware({
      successMessage: 'success',
      failMessage: 'fail',
    }),
    apiRouter,
    errorMiddleware: createErrorMiddleware({
      logger: {
        error: (message, meta) => logger.error(message, meta),
      },
      fallbackMessage: '服务器内部错误',
      onError: options.runtime
        ? ({ err, req }) => options.runtime!.reportException({
          type: 'request_error',
          error: err,
          serviceName: options.runtime!.getState().serviceName,
          path: req.originalUrl,
          method: req.method,
          timestamp: Date.now(),
        })
        : undefined,
    }),
    observability: options.runtime
      ? {
        runtime: options.runtime,
      }
      : undefined,
  });
}
