import { createRequire } from 'node:module';
import type { ExceptionReporter, RuntimeExceptionEvent } from './runtime.ts';

export type RuntimeExceptionSeverity = 'P0' | 'P1' | 'P2';
export const DEFAULT_EMAIL_EXCEPTION_MIN_SEVERITY: RuntimeExceptionSeverity = 'P0';

type MailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

type MailTransport = {
  sendMail: (message: MailMessage) => Promise<unknown> | unknown;
};

type MailTransportFactory = (options: {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}) => MailTransport;

export type ExceptionEmailReporterOptions = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string[];
  subjectPrefix?: string;
  minSeverity?: RuntimeExceptionSeverity;
  eventTypes?: RuntimeExceptionEvent['type'][];
  transportFactory?: MailTransportFactory;
};

type EnvLike = Record<string, string | undefined>;

const require = createRequire(import.meta.url);

function splitRecipients(value: string | undefined) {
  return (value ?? '')
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  return {
    message: String(error),
  };
}

function getRuntimeExceptionTypeLabel(type: RuntimeExceptionEvent['type']) {
  switch (type) {
    case 'bootstrap_error':
      return '启动失败';
    case 'uncaught_exception':
      return '未捕获异常';
    case 'unhandled_rejection':
      return '未处理的 Promise 拒绝';
    case 'shutdown_error':
      return '优雅退出失败';
    case 'request_error':
      return '请求异常';
  }
}

function renderEmailBody(event: RuntimeExceptionEvent) {
  const error = formatError(event.error);
  const severity = getRuntimeExceptionSeverity(event.type);
  const typeLabel = getRuntimeExceptionTypeLabel(event.type);
  const lines = [
    'super-pro 服务异常告警',
    '',
    `异常级别: ${severity}`,
    `服务名称: ${event.serviceName}`,
    `异常类型: ${typeLabel}`,
    `事件编码: ${event.type}`,
    `运行环境: ${event.env ?? '-'}`,
    `发生时间: ${new Date(event.timestamp).toISOString()}`,
    `请求 ID: ${event.requestId ?? '-'}`,
    `请求方法: ${event.method ?? '-'}`,
    `请求路径: ${event.path ?? '-'}`,
    `错误名称: ${error.name ?? '-'}`,
    `错误信息: ${error.message}`,
  ];

  if (error.stack) {
    lines.push('', '错误堆栈:', error.stack);
  }

  if (event.meta && Object.keys(event.meta).length > 0) {
    lines.push('', '附加信息:', JSON.stringify(event.meta, null, 2));
  }

  return lines.join('\n');
}

function parseEventTypes(value: string | undefined) {
  if (!value?.trim()) {
    return undefined;
  }

  const requested = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (requested.includes('all')) {
    return [
      'request_error',
      'bootstrap_error',
      'unhandled_rejection',
      'uncaught_exception',
      'shutdown_error',
    ] satisfies RuntimeExceptionEvent['type'][];
  }

  const allowed = new Set<RuntimeExceptionEvent['type']>([
    'request_error',
    'bootstrap_error',
    'unhandled_rejection',
    'uncaught_exception',
    'shutdown_error',
  ]);

  return requested.filter((item): item is RuntimeExceptionEvent['type'] =>
    allowed.has(item as RuntimeExceptionEvent['type']));
}

function parseSeverity(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'P0' || normalized === 'P1' || normalized === 'P2') {
    return normalized;
  }

  return undefined;
}

function getSeverityRank(severity: RuntimeExceptionSeverity) {
  switch (severity) {
    case 'P0':
      return 0;
    case 'P1':
      return 1;
    case 'P2':
      return 2;
  }
}

export function getRuntimeExceptionSeverity(type: RuntimeExceptionEvent['type']): RuntimeExceptionSeverity {
  switch (type) {
    case 'bootstrap_error':
    case 'uncaught_exception':
      return 'P0';
    case 'unhandled_rejection':
    case 'shutdown_error':
      return 'P1';
    case 'request_error':
      return 'P2';
  }
}

function createNodeMailerTransportFactory(): MailTransportFactory {
  return (options) => {
    const nodemailer = require('nodemailer') as {
      createTransport: MailTransportFactory;
    };

    return nodemailer.createTransport(options);
  };
}

export function createExceptionEmailReporter(options: ExceptionEmailReporterOptions): ExceptionReporter {
  const transporter = (options.transportFactory ?? createNodeMailerTransportFactory())({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: {
      user: options.user,
      pass: options.pass,
    },
  });
  const minSeverity = options.minSeverity ?? DEFAULT_EMAIL_EXCEPTION_MIN_SEVERITY;
  const eventTypes = options.eventTypes?.length
    ? new Set(options.eventTypes)
    : undefined;

  return {
    async report(event) {
      const severity = getRuntimeExceptionSeverity(event.type);
      if (getSeverityRank(severity) > getSeverityRank(minSeverity)) {
        return;
      }

      if (eventTypes && !eventTypes.has(event.type)) {
        return;
      }

      const subjectPrefix = options.subjectPrefix?.trim() || '[super-pro]';
      const typeLabel = getRuntimeExceptionTypeLabel(event.type);
      await transporter.sendMail({
        from: options.from,
        to: options.to.join(', '),
        subject: `${subjectPrefix} [${severity}] [${event.serviceName}] ${typeLabel}`,
        text: renderEmailBody(event),
      });
    },
  };
}

export function createExceptionEmailReporterFromEnv(env: EnvLike = process.env) {
  const host = env.MAILER_HOST?.trim();
  const port = Number(env.MAILER_PORT);
  const user = env.MAILER_USER?.trim();
  const pass = env.MAILER_PASS?.trim();
  const to = splitRecipients(env.EXCEPTION_EMAIL_TO ?? env.MAILER_ALERT_TO);

  if (!host || !Number.isFinite(port) || !user || !pass || to.length === 0) {
    return undefined;
  }

  const secure = parseBoolean(env.MAILER_SECURE) ?? port === 465;
  const from = env.EXCEPTION_EMAIL_FROM?.trim() || env.MAILER_FROM?.trim() || user;
  const subjectPrefix = env.EXCEPTION_EMAIL_SUBJECT_PREFIX?.trim() || '[super-pro]';
  const minSeverity = parseSeverity(env.EXCEPTION_EMAIL_MIN_SEVERITY) ?? DEFAULT_EMAIL_EXCEPTION_MIN_SEVERITY;
  const eventTypes = parseEventTypes(env.EXCEPTION_EMAIL_EVENT_TYPES);

  const options: ExceptionEmailReporterOptions = {
    host,
    port,
    secure,
    user,
    pass,
    from,
    to,
    subjectPrefix,
    minSeverity,
  };

  if (eventTypes?.length) {
    options.eventTypes = eventTypes;
  }

  return createExceptionEmailReporter(options);
}
