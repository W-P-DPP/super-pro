import {
  createDevExceptionTestRouter,
  createHttpApp,
  type ServiceRuntime,
} from '@super-pro/shared-server';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import router from './src/index.ts';
import { ErrorLogger, RequestLogger } from './utils/index.ts';
import { operationLogMiddleware } from './utils/middleware/operationLogMiddleware.ts';
import { responseMiddleware } from './utils/middleware/responseMiddleware.ts';

export function createApp(options: { runtime?: ServiceRuntime } = {}) {
  const publicPath = fileURLToPath(new URL('./public', import.meta.url));
  const apiRouter = express.Router();

  if (process.env.NODE_ENV === 'development' && options.runtime) {
    apiRouter.use('/__dev__', createDevExceptionTestRouter(options.runtime));
  }

  apiRouter.use(router);

  return createHttpApp({
    requestLogger: RequestLogger.middleware(),
    staticDir: path.resolve(publicPath),
    staticMountPath: '/public',
    serveStaticAtRoot: true,
    responseMiddleware,
    rootHandler: (req, res) => {
      res.sendSuccess();
    },
    apiMiddlewares: [operationLogMiddleware],
    apiRouter,
    errorMiddleware: ErrorLogger.middleware(options.runtime),
    observability: options.runtime
      ? {
        runtime: options.runtime,
      }
      : undefined,
  });
}
