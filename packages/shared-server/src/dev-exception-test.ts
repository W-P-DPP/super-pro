import express, { type Router } from 'express';
import type { ServiceRuntime } from './runtime.ts';

export type DevExceptionTestType = 'uncaught_exception' | 'request_error';

function normalizeType(value: unknown): DevExceptionTestType {
  if (typeof value !== 'string') {
    return 'uncaught_exception';
  }

  const normalized = value.trim();
  switch (normalized) {
    case 'uncaught_exception':
    case '未捕获异常':
      return 'uncaught_exception';
    case 'request_error':
    case '请求异常':
      return 'request_error';
    default:
      return 'uncaught_exception';
  }
}

function getTypeLabel(type: DevExceptionTestType) {
  switch (type) {
    case 'uncaught_exception':
      return '未捕获异常';
    case 'request_error':
      return '请求异常';
  }
}

function getSeverity(type: DevExceptionTestType) {
  switch (type) {
    case 'uncaught_exception':
      return 'P0';
    case 'request_error':
      return 'P2';
  }
}

export function createDevExceptionTestRouter(runtime: ServiceRuntime): Router {
  const router: Router = express.Router();

  router.post('/exception-email-test', async (req, res, next) => {
    try {
      const type = normalizeType(req.body?.type);
      const typeLabel = getTypeLabel(type);
      const severity = getSeverity(type);
      const requestId = res.getHeader('x-request-id');
      const event = {
        type,
        error: new Error(`development exception email test: ${type}`),
        serviceName: runtime.getState().serviceName,
        path: req.originalUrl,
        method: req.method,
        timestamp: Date.now(),
        meta: {
          source: 'dev-exception-test-route',
        },
      };

      if (typeof requestId === 'string') {
        Object.assign(event, {
          requestId,
        });
      }

      await runtime.reportException(event);

      res.sendSuccess({
        triggered: true,
        type,
        typeLabel,
        severity,
        severityLabel: `${severity} 级`,
        shouldSendEmail: type === 'uncaught_exception',
        emailBehavior: type === 'uncaught_exception' ? '会发送邮件' : '不会发送邮件',
      }, '测试异常事件已触发');
    } catch (error) {
      next(error);
    }
  });

  return router;
}
