import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getRuntimeExceptionSeverity,
  createExceptionEmailReporter,
  createExceptionEmailReporterFromEnv,
} from './exception-email-reporter.ts';

describe('shared-server exception email reporter', () => {
  const sendMail = vi.fn();
  const transportFactory = vi.fn(() => ({
    sendMail,
  }));

  beforeEach(() => {
    sendMail.mockReset();
    transportFactory.mockClear();
  });

  it('sends mail for configured exception types', async () => {
    const reporter = createExceptionEmailReporter({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      user: 'bot@qq.com',
      pass: 'auth-code',
      from: 'bot@qq.com',
      to: ['owner@qq.com'],
      subjectPrefix: '[alarm]',
      minSeverity: 'P0',
      transportFactory,
    });

    await reporter.report({
      type: 'uncaught_exception',
      error: new Error('boom'),
      serviceName: 'general-server',
      env: 'production',
      requestId: 'req-1',
      path: '/api/demo',
      method: 'GET',
      timestamp: Date.parse('2026-04-25T08:00:00.000Z'),
    });

    expect(transportFactory).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
    }));
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'bot@qq.com',
      to: 'owner@qq.com',
      subject: '[alarm] [P0] [general-server] 未捕获异常',
      text: expect.stringContaining('异常级别: P0'),
    }));
  });

  it('skips lower-priority exceptions when threshold is P0', async () => {
    const reporter = createExceptionEmailReporter({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      user: 'bot@qq.com',
      pass: 'auth-code',
      from: 'bot@qq.com',
      to: ['owner@qq.com'],
      minSeverity: 'P0',
      transportFactory,
    });

    await reporter.report({
      type: 'request_error',
      error: new Error('request failed'),
      serviceName: 'general-server',
      timestamp: Date.now(),
    });

    expect(sendMail).not.toHaveBeenCalled();
  });

  it('supports severity classification by exception type', () => {
    expect(getRuntimeExceptionSeverity('bootstrap_error')).toBe('P0');
    expect(getRuntimeExceptionSeverity('uncaught_exception')).toBe('P0');
    expect(getRuntimeExceptionSeverity('unhandled_rejection')).toBe('P1');
    expect(getRuntimeExceptionSeverity('shutdown_error')).toBe('P1');
    expect(getRuntimeExceptionSeverity('request_error')).toBe('P2');
  });

  it('builds a reporter from env using shared mailer settings', () => {
    const reporter = createExceptionEmailReporterFromEnv({
      MAILER_HOST: 'smtp.qq.com',
      MAILER_PORT: '465',
      MAILER_SECURE: 'true',
      MAILER_USER: 'bot@qq.com',
      MAILER_PASS: 'auth-code',
      EXCEPTION_EMAIL_TO: 'owner1@qq.com, owner2@qq.com',
      EXCEPTION_EMAIL_SUBJECT_PREFIX: '[prod-alarm]',
      EXCEPTION_EMAIL_MIN_SEVERITY: 'P0',
    });

    expect(reporter).toBeTruthy();
  });
});
