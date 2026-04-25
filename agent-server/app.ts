import {
  createDevExceptionTestRouter,
  createHttpApp,
  type ServiceRuntime,
} from '@super-pro/shared-server';
import express from 'express';
import router from './src/index.ts';
import { ErrorLogger, RequestLogger } from './utils/index.ts';
import { jwtMiddleware } from './utils/middleware/jwtMiddleware.ts';
import { responseMiddleware } from './utils/middleware/responseMiddleware.ts';

export function createApp(options: { runtime?: ServiceRuntime } = {}) {
  const apiRouter = express.Router();

  if (process.env.NODE_ENV === 'development' && options.runtime) {
    apiRouter.use('/__dev__', createDevExceptionTestRouter(options.runtime));
  }

  apiRouter.use('/', jwtMiddleware, router);

  return createHttpApp({
    requestLogger: RequestLogger.middleware(),
    responseMiddleware,
    apiRouter,
    errorMiddleware: ErrorLogger.middleware(options.runtime),
    observability: options.runtime
      ? {
        runtime: options.runtime,
      }
      : undefined,
  });
}
