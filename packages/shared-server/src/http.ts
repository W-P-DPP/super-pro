import bodyParser from 'body-parser';
import cors from 'cors';
import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import morgan from 'morgan';
import path from 'node:path';
import { sanitizeLogValue } from './logging.ts';
import {
  createRequestContextMiddleware,
  DEFAULT_REQUEST_ID_HEADER,
  getRequestContext,
} from './request-context.ts';
import type { ServiceRuntime } from './runtime.ts';

declare global {
  namespace Express {
    interface Response {
      sendSuccess: <T>(data?: T, msg?: string) => void;
      sendFail: (msg?: string, code?: number) => void;
    }
  }
}

export type ResponseEnvelope<T = unknown> = {
  code: number;
  msg: string;
  data?: T;
  timestamp: number;
};

export type ResponseMiddlewareOptions = {
  successMessage?: string;
  failMessage?: string;
};

export type ErrorLoggerLike = {
  error: (message: string, meta?: unknown) => void;
};

export type ErrorMiddlewareOptions = {
  logger?: ErrorLoggerLike;
  fallbackMessage?: string;
  onError?: (event: {
    err: unknown;
    req: Request;
  }) => void | Promise<void>;
};

export type CreateHttpAppOptions = {
  requestLogger?: RequestHandler;
  responseMiddleware?: RequestHandler;
  errorMiddleware?: ErrorRequestHandler;
  rootHandler?: RequestHandler;
  apiRouter?: RequestHandler;
  apiMiddlewares?: RequestHandler[];
  staticDir?: string;
  staticMountPath?: string;
  serveStaticAtRoot?: boolean;
  xmlTextType?: string;
  apiBasePath?: string;
  observability?: SharedObservabilityHttpOptions;
};

export type RequestLoggerLike = {
  info: (message: string) => void;
};

export type RequestLoggerMiddlewareOptions = {
  logger: RequestLoggerLike;
  format?: string;
};

export type SharedObservabilityHttpOptions = {
  runtime: ServiceRuntime;
  enableLiveEndpoint?: boolean;
  enableReadyEndpoint?: boolean;
  enableMetricsEndpoint?: boolean;
  livePath?: string;
  readyPath?: string;
  metricsPath?: string;
};

export function createResponseMiddleware(
  options: ResponseMiddlewareOptions = {},
): RequestHandler {
  const successMessage = options.successMessage ?? '成功';
  const failMessage = options.failMessage ?? '失败';

  return function responseMiddleware(req: Request, res: Response, next: NextFunction) {
    res.sendSuccess = function sendSuccess<T>(data?: T, msg?: string) {
      const result: ResponseEnvelope<T> = {
        code: 200,
        msg: msg ?? successMessage,
        timestamp: Date.now(),
      };

      if (data !== undefined) {
        result.data = data;
      }

      res.json(result);
    };

    res.sendFail = function sendFail(msg?: string, code?: number) {
      const result: ResponseEnvelope = {
        code: code ?? 500,
        msg: msg ?? failMessage,
        timestamp: Date.now(),
      };

      res.json(result);
    };

    next();
  };
}

export function createErrorMiddleware(
  options: ErrorMiddlewareOptions = {},
): ErrorRequestHandler {
  const fallbackMessage = options.fallbackMessage ?? '服务器内部错误';

  return function errorMiddleware(err, req, res, next) {
    void options.onError?.({
      err,
      req,
    });

    options.logger?.error('Unhandled request error', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });

    if (res.headersSent) {
      return next(err);
    }

    if (typeof res.sendFail === 'function') {
      return res.status(500).sendFail(fallbackMessage, 500);
    }

    return res.status(500).json({
      code: 500,
      msg: fallbackMessage,
      timestamp: Date.now(),
    });
  };
}

export function createHttpApp(options: CreateHttpAppOptions): Express {
  const app = express();
  const apiBasePath = options.apiBasePath ?? '/api';
  const xmlTextType = options.xmlTextType ?? 'text/xml';
  const observability = options.observability;

  app.use(cors());
  if (observability?.runtime) {
    app.use(createRequestContextMiddleware());
    app.use(createObservabilityMiddleware(observability.runtime));
  }
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(bodyParser.text({ type: xmlTextType }));

  if (options.requestLogger) {
    app.use(options.requestLogger);
  }

  if (options.staticDir) {
    const resolvedStaticDir = path.resolve(options.staticDir);
    const staticMountPath = options.staticMountPath ?? '/public';

    app.use(staticMountPath, express.static(resolvedStaticDir));

    if (options.serveStaticAtRoot) {
      app.use(express.static(resolvedStaticDir));
    }
  }

  if (options.responseMiddleware) {
    app.use(options.responseMiddleware);
  }

  if (observability) {
    mountObservabilityEndpoints(app, observability);
  }

  if (options.rootHandler) {
    app.get('/', options.rootHandler);
  }

  if (options.apiRouter) {
    app.use(apiBasePath, ...(options.apiMiddlewares ?? []), options.apiRouter);
  }

  if (options.errorMiddleware) {
    app.use(options.errorMiddleware);
  }

  return app;
}

export function createRequestLoggerMiddleware(
  options: RequestLoggerMiddlewareOptions,
): RequestHandler {
  const format = options.format
    ?? ':request-id :method :url :status :res[content-length] - :response-time ms :body';

  morgan.token('request-id', (req: Request, res: Response) => {
    const responseRequestId = res.getHeader(DEFAULT_REQUEST_ID_HEADER);
    if (typeof responseRequestId === 'string' && responseRequestId) {
      return responseRequestId;
    }

    const requestIdHeader = req.headers[DEFAULT_REQUEST_ID_HEADER];
    if (typeof requestIdHeader === 'string' && requestIdHeader) {
      return requestIdHeader;
    }

    return getRequestContext()?.requestId ?? '-';
  });

  morgan.token('body', (req: Request) =>
    JSON.stringify(sanitizeLogValue(req.body || {})),
  );

  return morgan(format, {
    stream: {
      write: (message: string) => {
        options.logger.info(message.trim());
      },
    },
  });
}

function createObservabilityMiddleware(runtime: ServiceRuntime): RequestHandler {
  const inFlightRequests = new Map<string, number>();

  return function observabilityMiddleware(req, res, next) {
    const labels = {
      service: runtime.getState().serviceName,
      method: req.method.toUpperCase(),
      route: req.path,
    };
    const inFlightKey = JSON.stringify(labels);
    const startTime = process.hrtime.bigint();

    const nextInFlightCount = (inFlightRequests.get(inFlightKey) ?? 0) + 1;
    inFlightRequests.set(inFlightKey, nextInFlightCount);
    runtime.setMetric('http_in_flight_requests', nextInFlightCount, labels);

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      runtime.incrementMetric('http_requests_total', 1, {
        ...labels,
        status: String(res.statusCode),
      });
      runtime.observeMetric('http_request_duration_ms', durationMs, labels);
      const updatedInFlightCount = Math.max(0, (inFlightRequests.get(inFlightKey) ?? 1) - 1);
      inFlightRequests.set(inFlightKey, updatedInFlightCount);
      runtime.setMetric('http_in_flight_requests', updatedInFlightCount, labels);
    });

    next();
  };
}

function mountObservabilityEndpoints(app: Express, options: SharedObservabilityHttpOptions) {
  const livePath = options.livePath ?? '/live';
  const readyPath = options.readyPath ?? '/ready';
  const metricsPath = options.metricsPath ?? '/metrics';

  if (options.enableLiveEndpoint ?? true) {
    app.get(livePath, async (_req, res) => {
      const snapshot = await options.runtime.getHealthSnapshot();
      res.status(snapshot.live.ok ? 200 : 503).json({
        ok: snapshot.live.ok,
        service: snapshot.serviceName,
        state: snapshot.state.status,
      });
    });
  }

  if (options.enableReadyEndpoint ?? true) {
    app.get(readyPath, async (_req, res) => {
      const snapshot = await options.runtime.getHealthSnapshot();
      res.status(snapshot.ready.ok ? 200 : 503).json({
        ok: snapshot.ready.ok,
        service: snapshot.serviceName,
        state: snapshot.state.status,
        checks: snapshot.ready.checks,
        optional: snapshot.optional.checks,
      });
    });
  }

  if (options.enableMetricsEndpoint ?? true) {
    app.get(metricsPath, (_req, res) => {
      res.type('text/plain').send(options.runtime.renderMetrics());
    });
  }
}
