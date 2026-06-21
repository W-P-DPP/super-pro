import request from 'supertest';
import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import { createDevExceptionTestRouter } from './dev-exception-test.ts';
import { createResponseMiddleware } from './http.ts';
import { createServiceRuntime } from './runtime.ts';

describe('shared-server dev exception test router', () => {
  it('accepts Chinese exception type aliases and returns localized payload', async () => {
    const runtime = createServiceRuntime({
      serviceName: 'dev-exception-test',
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    });

    const app = express();
    app.use(express.json());
    app.use(createResponseMiddleware());
    app.use('/api/__dev__', createDevExceptionTestRouter(runtime));

    const response = await request(app)
      .post('/api/__dev__/exception-email-test')
      .send({
        type: '请求异常',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      code: 200,
      msg: '测试异常事件已触发',
      data: {
        type: 'request_error',
        typeLabel: '请求异常',
        severity: 'P2',
        severityLabel: 'P2 级',
        shouldSendEmail: false,
        emailBehavior: '不会发送邮件',
      },
    });
  });
});
