import type { Express } from 'express';
import request from 'supertest';
import { createServiceRuntime } from '@super-pro/shared-server';
import { createApp } from '../../app.ts';
import { Logger } from '../../utils/index.ts';

function createTestApp() {
  const runtime = createServiceRuntime({
    serviceName: 'general-server-test',
    logger: Logger.getInstance(),
    env: 'test',
  });
  runtime.registerHealthCheck('database', 'ready', () => ({
    ok: true,
  }));
  runtime.markStarted();

  return {
    app: createApp({
      runtime,
    }),
    runtime,
  };
}

describe('backend observability integration', () => {
  let app: Express;
  let runtime: ReturnType<typeof createServiceRuntime>;

  beforeEach(() => {
    const testContext = createTestApp();
    app = testContext.app;
    runtime = testContext.runtime;
  });

  it('exposes live and ready endpoints with request ids', async () => {
    const liveRes = await request(app).get('/live');
    const readyRes = await request(app).get('/ready');

    expect(liveRes.status).toBe(200);
    expect(liveRes.headers['x-request-id']).toBeTruthy();
    expect(liveRes.body).toMatchObject({
      ok: true,
      service: 'general-server-test',
      state: 'ready',
    });

    expect(readyRes.status).toBe(200);
    expect(readyRes.headers['x-request-id']).toBeTruthy();
    expect(readyRes.body).toMatchObject({
      ok: true,
      service: 'general-server-test',
      state: 'ready',
    });
    expect(readyRes.body.checks).toEqual([
      expect.objectContaining({
        name: 'database',
        ok: true,
      }),
    ]);
  });

  it('fails readiness while draining and keeps liveness available', async () => {
    runtime.beginDraining('test');

    const liveRes = await request(app).get('/live');
    const readyRes = await request(app).get('/ready');

    expect(liveRes.status).toBe(200);
    expect(readyRes.status).toBe(503);
    expect(readyRes.body).toMatchObject({
      ok: false,
      state: 'draining',
    });
  });

  it('exports metrics after requests are processed', async () => {
    await request(app).get('/live');
    const metricsRes = await request(app).get('/metrics');

    expect(metricsRes.status).toBe(200);
    expect(metricsRes.headers['content-type']).toContain('text/plain');
    expect(metricsRes.text).toContain('http_requests_total');
    expect(metricsRes.text).toContain('service_uptime_seconds');
    expect(metricsRes.text).toContain('service_dependency_up');
  });

  it('exposes a development-only exception test endpoint', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      const testContext = createTestApp();
      const devApp = testContext.app;
      const response = await request(devApp)
        .post('/api/__dev__/exception-email-test')
        .send({
          type: 'request_error',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        code: 200,
        msg: '测试异常事件已触发',
        data: {
          triggered: true,
          type: 'request_error',
          typeLabel: '请求异常',
          severity: 'P2',
          severityLabel: 'P2 级',
          shouldSendEmail: false,
          emailBehavior: '不会发送邮件',
        },
      });
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
