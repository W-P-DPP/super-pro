import {
  createErrorMiddleware,
  createDevExceptionTestRouter,
  createHttpApp,
  createRequestLoggerMiddleware,
  createResponseMiddleware,
  type ServiceRuntime,
} from '@super-pro/shared-server';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import router from './src/index.ts';
import { Logger } from './utils/index.ts';
import { operationLogMiddleware } from './utils/middleware/operationLogMiddleware.ts';

export function createApp(options: { runtime?: ServiceRuntime } = {}) {
  const publicPath = fileURLToPath(new URL('./public', import.meta.url));
  const apiRouter = express.Router();
  const logger = Logger.getInstance();

  if (process.env.NODE_ENV === 'development' && options.runtime) {
    apiRouter.use('/__dev__', createDevExceptionTestRouter(options.runtime));
  }

  apiRouter.use(router);

  return createHttpApp({
    requestLogger: createRequestLoggerMiddleware({
      logger: {
        info: (message) => logger.info(message),
      },
    }),
    staticDir: path.resolve(publicPath),
    staticMountPath: '/public',
    serveStaticAtRoot: true,
    responseMiddleware: createResponseMiddleware({
      successMessage: '成功',
      failMessage: '失败',
    }),
    rootHandler: (req, res) => {
      res.sendSuccess();
    },
    apiMiddlewares: [operationLogMiddleware],
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
