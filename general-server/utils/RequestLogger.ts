// src/logger/RequestLogger.ts
import morgan from 'morgan';
import type { Request } from 'express';
import { Logger } from './Logger.ts';

const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
]);

function sanitizeLogValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeLogValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, currentValue] of Object.entries(value)) {
    sanitized[key] = SENSITIVE_FIELD_NAMES.has(key) ? '[REDACTED]' : sanitizeLogValue(currentValue);
  }

  return sanitized;
}

export class RequestLogger {
  private static logger = Logger.getInstance();

  public static middleware() {
    morgan.token('body', (req: Request) =>
      JSON.stringify(sanitizeLogValue(req.body || {}))
    );

    return morgan(
      ':method :url :status :res[content-length] - :response-time ms :body',
      {
        stream: {
          write: (message: string) => {
            RequestLogger.logger.info(message.trim());
          }
        }
      }
    );
  }
}
