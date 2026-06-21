import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export const DEFAULT_REQUEST_ID_HEADER = 'x-request-id';
export const DEFAULT_CORRELATION_ID_HEADER = 'x-correlation-id';

export type RequestContextValue = {
  requestId: string;
  correlationId?: string;
};

export type RequestContextMiddlewareOptions = {
  requestIdHeader?: string;
  correlationIdHeader?: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContextValue>();

function normalizeHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function getRequestContext() {
  return requestContextStorage.getStore();
}

export function createRequestContextMiddleware(
  options: RequestContextMiddlewareOptions = {},
): RequestHandler {
  const requestIdHeader = (options.requestIdHeader ?? DEFAULT_REQUEST_ID_HEADER).toLowerCase();
  const correlationIdHeader = (options.correlationIdHeader ?? DEFAULT_CORRELATION_ID_HEADER).toLowerCase();

  return function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
    const requestId = normalizeHeaderValue(req.headers[requestIdHeader]) ?? randomUUID();
    const correlationId = normalizeHeaderValue(req.headers[correlationIdHeader]);
    const context: RequestContextValue = {
      requestId,
      ...(correlationId ? { correlationId } : {}),
    };

    res.setHeader(requestIdHeader, requestId);

    if (correlationId) {
      res.setHeader(correlationIdHeader, correlationId);
    }

    requestContextStorage.run(context, () => {
      next();
    });
  };
}
