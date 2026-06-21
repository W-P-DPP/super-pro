import { describe, expect, it, vi } from 'vitest';
import { createServiceRuntime } from './runtime.ts';

describe('shared-server runtime', () => {
  it('runs shutdown tasks in ascending order', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const runtime = createServiceRuntime({
      serviceName: 'runtime-order-test',
      logger,
    });
    const executed: string[] = [];

    runtime.registerShutdownTask('database', async () => {
      executed.push('database');
    }, {
      order: 400,
    });
    runtime.registerShutdownTask('http-server', async () => {
      executed.push('http-server');
    }, {
      order: 100,
    });
    runtime.registerShutdownTask('redis', async () => {
      executed.push('redis');
    }, {
      order: 300,
    });

    await runtime.shutdown('test');

    expect(executed).toEqual(['http-server', 'redis', 'database']);
    expect(runtime.getState().status).toBe('stopped');
  });

  it('reports exceptions through configured reporters', async () => {
    const report = vi.fn();
    const runtime = createServiceRuntime({
      serviceName: 'runtime-reporter-test',
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      reporters: [
        {
          report,
        },
      ],
    });

    await runtime.reportException({
      type: 'bootstrap_error',
      error: new Error('boom'),
      serviceName: 'ignored-by-runtime',
      timestamp: Date.now(),
    });

    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.calls[0]?.[0]).toMatchObject({
      type: 'bootstrap_error',
      serviceName: 'runtime-reporter-test',
    });
  });
});
