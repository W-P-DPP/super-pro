import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import { createInMemoryMetricsRegistry, type MetricsRegistry } from './metrics.ts';
import { getRequestContext } from './request-context.ts';

export const BOOTSTRAP_FAILURE_EXIT_CODE = 78;

export type RuntimeLifecycleStatus =
  | 'created'
  | 'starting'
  | 'ready'
  | 'draining'
  | 'stopped'
  | 'failed';

export type RuntimeLogger = {
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
};

export type RuntimeState = {
  serviceName: string;
  status: RuntimeLifecycleStatus;
  startedAt?: number;
  shutdownStartedAt?: number;
  env?: string;
};

export type HealthLevel = 'live' | 'ready' | 'optional';

export type HealthCheckResult = {
  ok: boolean;
  message?: string;
  meta?: Record<string, unknown>;
};

export type HealthCheck = () => Promise<HealthCheckResult> | HealthCheckResult;

export type HealthCheckSnapshot = HealthCheckResult & {
  name: string;
  level: HealthLevel;
};

export type RuntimeHealthSnapshot = {
  serviceName: string;
  state: RuntimeState;
  live: {
    ok: boolean;
  };
  ready: {
    ok: boolean;
    checks: HealthCheckSnapshot[];
  };
  optional: {
    ok: boolean;
    checks: HealthCheckSnapshot[];
  };
  uptimeSeconds: number;
};

export type RuntimeExceptionEvent = {
  type:
    | 'request_error'
    | 'bootstrap_error'
    | 'unhandled_rejection'
    | 'uncaught_exception'
    | 'shutdown_error';
  error: unknown;
  serviceName: string;
  env?: string;
  requestId?: string;
  path?: string;
  method?: string;
  meta?: Record<string, unknown>;
  timestamp: number;
};

export type ExceptionReporter = {
  report: (event: RuntimeExceptionEvent) => Promise<void> | void;
};

export type ShutdownTask = () => Promise<void> | void;

export type RegisterShutdownTaskOptions = {
  timeoutMs?: number;
  order?: number;
};

export type StartHttpServerOptions = {
  app: Express;
  port: number;
  host?: string;
};

export type ServiceRuntimeOptions = {
  serviceName: string;
  logger: RuntimeLogger;
  version?: string;
  env?: string;
  shutdownTimeoutMs?: number;
  requestDrainTimeoutMs?: number;
  reporters?: ExceptionReporter[];
};

export type ServiceRuntime = {
  getState: () => RuntimeState;
  markStarted: () => void;
  beginDraining: (reason: string) => void;
  shutdown: (reason: string, exitCode?: number) => Promise<void>;
  registerHealthCheck: (name: string, level: HealthLevel, check: HealthCheck) => void;
  getHealthSnapshot: () => Promise<RuntimeHealthSnapshot>;
  registerShutdownTask: (
    name: string,
    task: ShutdownTask,
    options?: RegisterShutdownTaskOptions,
  ) => void;
  installProcessHandlers: () => void;
  startHttpServer: (options: StartHttpServerOptions) => Promise<Server>;
  reportException: (event: RuntimeExceptionEvent) => Promise<void>;
  incrementMetric: (name: string, value?: number, labels?: Record<string, string>) => void;
  observeMetric: (name: string, value: number, labels?: Record<string, string>) => void;
  setMetric: (name: string, value: number, labels?: Record<string, string>) => void;
  renderMetrics: () => string;
};

type RegisteredHealthCheck = {
  name: string;
  level: HealthLevel;
  check: HealthCheck;
};

type RegisteredShutdownTask = {
  name: string;
  task: ShutdownTask;
  timeoutMs?: number;
  order: number;
};

type InternalServiceRuntime = ServiceRuntime & {
  metrics: MetricsRegistry;
};

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 15_000;
const DEFAULT_REQUEST_DRAIN_TIMEOUT_MS = 10_000;

function createDefaultReporter(logger: RuntimeLogger): ExceptionReporter {
  return {
    report(event) {
      logger.error('Runtime exception', {
        type: event.type,
        serviceName: event.serviceName,
        env: event.env,
        requestId: event.requestId,
        path: event.path,
        method: event.method,
        timestamp: event.timestamp,
        error: event.error instanceof Error ? event.error.message : String(event.error),
        stack: event.error instanceof Error ? event.error.stack : undefined,
        meta: event.meta,
      });
    },
  };
}

function assignOptionalProp<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
) {
  if (value !== undefined) {
    target[key] = value;
  }
}

function toRuntimeError(value: unknown) {
  if (value instanceof Error) {
    return value;
  }

  return new Error(String(value));
}

function withTimeout(task: Promise<void>, timeoutMs: number, taskName: string) {
  if (!timeoutMs || timeoutMs <= 0) {
    return task;
  }

  return Promise.race([
    task,
    new Promise<void>((_, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Shutdown task timed out: ${taskName}`));
      }, timeoutMs);
      timeout.unref?.();
    }),
  ]);
}

function closeHttpServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });

    server.closeIdleConnections?.();
  });
}

export function createServiceRuntime(options: ServiceRuntimeOptions): ServiceRuntime {
  const metrics = createInMemoryMetricsRegistry();
  const reporters = [
    createDefaultReporter(options.logger),
    ...(options.reporters ?? []),
  ];
  const checks = new Map<string, RegisteredHealthCheck>();
  const shutdownTasks = new Map<string, RegisteredShutdownTask>();
  let state: RuntimeState = {
    serviceName: options.serviceName,
    status: 'created',
  };
  assignOptionalProp(state, 'env', options.env);
  let handlersInstalled = false;
  let shutdownPromise: Promise<void> | null = null;
  let server: Server | undefined;
  const createdAt = Date.now();

  const runtime: InternalServiceRuntime = {
    metrics,
    getState() {
      return { ...state };
    },
    markStarted() {
      if (state.status === 'stopped' || state.status === 'failed') {
        return;
      }

      state = {
        ...state,
        status: 'ready',
        startedAt: state.startedAt ?? Date.now(),
      };
      metrics.observe('service_bootstrap_duration_ms', Date.now() - createdAt, {
        service: options.serviceName,
      });
    },
    beginDraining(reason) {
      if (state.status === 'draining' || state.status === 'stopped') {
        return;
      }

      state = {
        ...state,
        status: 'draining',
        shutdownStartedAt: state.shutdownStartedAt ?? Date.now(),
      };
      options.logger.warn('Service is draining', {
        serviceName: options.serviceName,
        reason,
      });
    },
    async shutdown(reason, exitCode = 0) {
      if (shutdownPromise) {
        return shutdownPromise;
      }

      shutdownPromise = (async () => {
        runtime.beginDraining(reason);

        const orderedTasks = Array.from(shutdownTasks.values())
          .sort((left, right) => left.order - right.order);

        for (const task of orderedTasks) {
          try {
            await withTimeout(
              Promise.resolve(task.task()),
              task.timeoutMs ?? options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
              task.name,
            );
          } catch (error) {
            const shutdownErrorEvent: RuntimeExceptionEvent = {
              type: 'shutdown_error',
              error,
              serviceName: options.serviceName,
              timestamp: Date.now(),
              meta: {
                taskName: task.name,
                reason,
              },
            };
            assignOptionalProp(shutdownErrorEvent, 'env', options.env);
            await runtime.reportException(shutdownErrorEvent);
          }
        }

        if (state.shutdownStartedAt) {
          metrics.observe('service_shutdown_duration_ms', Date.now() - state.shutdownStartedAt, {
            service: options.serviceName,
          });
        }

        state = {
          ...state,
          status: exitCode === 0 ? 'stopped' : 'failed',
        };
      })();

      return shutdownPromise;
    },
    registerHealthCheck(name, level, check) {
      checks.set(name, {
        name,
        level,
        check,
      });
    },
    async getHealthSnapshot() {
      const readyChecks = Array.from(checks.values()).filter((check) => check.level === 'ready');
      const optionalChecks = Array.from(checks.values()).filter((check) => check.level === 'optional');
      const toSnapshot = async (check: RegisteredHealthCheck): Promise<HealthCheckSnapshot> => {
        try {
          return {
            ...(await check.check()),
            name: check.name,
            level: check.level,
          };
        } catch (error) {
          return {
            name: check.name,
            level: check.level,
            ok: false,
            message: error instanceof Error ? error.message : String(error),
          };
        }
      };
      const readySnapshots = await Promise.all(readyChecks.map(toSnapshot));
      const optionalSnapshots = await Promise.all(optionalChecks.map(toSnapshot));
      const liveOk = state.status !== 'stopped' && state.status !== 'failed';
      const readyOk = state.status === 'ready' && readySnapshots.every((check) => check.ok);
      const optionalOk = optionalSnapshots.every((check) => check.ok);

      for (const check of readySnapshots) {
        metrics.set('service_dependency_up', check.ok ? 1 : 0, {
          service: options.serviceName,
          dependency: check.name,
          level: check.level,
        });
      }

      for (const check of optionalSnapshots) {
        metrics.set('service_dependency_up', check.ok ? 1 : 0, {
          service: options.serviceName,
          dependency: check.name,
          level: check.level,
        });
      }

      return {
        serviceName: options.serviceName,
        state: runtime.getState(),
        live: {
          ok: liveOk,
        },
        ready: {
          ok: readyOk,
          checks: readySnapshots,
        },
        optional: {
          ok: optionalOk,
          checks: optionalSnapshots,
        },
        uptimeSeconds: state.startedAt ? Math.max(0, (Date.now() - state.startedAt) / 1000) : 0,
      };
    },
    registerShutdownTask(name, task, taskOptions = {}) {
      const shutdownTask: RegisteredShutdownTask = {
        name,
        task,
        order: taskOptions.order ?? 1000,
      };
      assignOptionalProp(shutdownTask, 'timeoutMs', taskOptions.timeoutMs);
      shutdownTasks.set(name, shutdownTask);
    },
    installProcessHandlers() {
      if (handlersInstalled) {
        return;
      }

      handlersInstalled = true;

      process.on('SIGINT', () => {
        void runtime.shutdown('SIGINT').finally(() => {
          process.exit(0);
        });
      });

      process.on('SIGTERM', () => {
        void runtime.shutdown('SIGTERM').finally(() => {
          process.exit(0);
        });
      });

      process.on('unhandledRejection', (error) => {
        const event: RuntimeExceptionEvent = {
          type: 'unhandled_rejection',
          error,
          serviceName: options.serviceName,
          timestamp: Date.now(),
        };
        assignOptionalProp(event, 'env', options.env);
        assignOptionalProp(event, 'requestId', getRequestContext()?.requestId);
        void runtime.reportException(event);
      });

      process.on('uncaughtException', (error) => {
        const event: RuntimeExceptionEvent = {
          type: 'uncaught_exception',
          error,
          serviceName: options.serviceName,
          timestamp: Date.now(),
        };
        assignOptionalProp(event, 'env', options.env);
        assignOptionalProp(event, 'requestId', getRequestContext()?.requestId);
        void runtime.reportException(event).finally(() => {
          void runtime.shutdown('uncaught_exception', 1).finally(() => {
            process.exit(1);
          });
        });
      });
    },
    async startHttpServer(startOptions) {
      if (server) {
        throw new Error('HTTP server already started');
      }

      state = {
        ...state,
        status: 'starting',
      };

      server = startOptions.host
        ? startOptions.app.listen(startOptions.port, startOptions.host)
        : startOptions.app.listen(startOptions.port);

      await new Promise<void>((resolve, reject) => {
        const handleError = (error: Error) => {
          server?.off('listening', handleListening);
          reject(error);
        };
        const handleListening = () => {
          server?.off('error', handleError);
          resolve();
        };

        server?.once('error', handleError);
        server?.once('listening', handleListening);
      });

      runtime.registerShutdownTask('http-server', async () => {
        if (!server) {
          return;
        }

        await closeHttpServer(server);
      }, {
        order: 100,
        timeoutMs: options.requestDrainTimeoutMs ?? DEFAULT_REQUEST_DRAIN_TIMEOUT_MS,
      });

      const address = server.address() as AddressInfo | null;
      options.logger.info('HTTP server listening', {
        serviceName: options.serviceName,
        host: address?.address ?? startOptions.host ?? '0.0.0.0',
        port: address?.port ?? startOptions.port,
      });
      runtime.markStarted();
      return server;
    },
    async reportException(event) {
      const normalizedEvent: RuntimeExceptionEvent = {
        ...event,
        serviceName: options.serviceName,
      };
      assignOptionalProp(normalizedEvent, 'env', event.env ?? options.env);
      assignOptionalProp(normalizedEvent, 'requestId', event.requestId ?? getRequestContext()?.requestId);

      for (const reporter of reporters) {
        try {
          await reporter.report(normalizedEvent);
        } catch (error) {
          options.logger.error('Exception reporter failed', {
            serviceName: options.serviceName,
            reporterError: toRuntimeError(error).message,
            eventType: normalizedEvent.type,
          });
        }
      }
    },
    incrementMetric(name, value = 1, labels) {
      metrics.increment(name, value, labels);
    },
    observeMetric(name, value, labels) {
      metrics.observe(name, value, labels);
    },
    setMetric(name, value, labels) {
      metrics.set(name, value, labels);
    },
    renderMetrics() {
      metrics.set('service_uptime_seconds', state.startedAt ? (Date.now() - state.startedAt) / 1000 : 0, {
        service: options.serviceName,
      });
      metrics.set('service_process_resident_memory_bytes', process.memoryUsage().rss, {
        service: options.serviceName,
      });

      return metrics.render();
    },
  };

  return runtime;
}
