import type { NextFunction, Request, Response } from 'express'
import { sanitizeLogValue } from '@super-pro/shared-server'
import type { CreateOperationLogDto, OperationLogRuntimeConfig } from '../../src/operationLog/operationLog.dto.ts'
import { OperationLogService } from '../../src/operationLog/operationLog.service.ts'
import { OperationLogRepository } from '../../src/operationLog/operationLog.repository.ts'
import { Logger } from '../../utils/index.ts'

const METHOD_TYPE_MAP: Record<string, string> = {
  GET: '查询',
  POST: '新增',
  PUT: '修改',
  PATCH: '修改',
  DELETE: '删除',
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded.join(',') : forwarded
    return raw.split(',')[0]?.trim() ?? 'unknown'
  }

  return req.socket?.remoteAddress ?? 'unknown'
}

function getModule(path: string): string {
  const segments = path.replace(/\?.*$/, '').split('/').filter(Boolean)
  return segments[segments.length - 1] || 'unknown'
}

export function create__Resource__OperationLogMiddleware(config: OperationLogRuntimeConfig) {
  const operationLogService = new OperationLogService({
    repository: new OperationLogRepository(),
    logger: Logger.getInstance(),
    batchSize: config.batchSize,
    flushIntervalMs: config.flushIntervalMs,
    maxRequestParamsLength: config.maxRequestParamsLength,
  })

  return function __resource__OperationLogMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!config.enabled) {
      return next()
    }

    const startTime = Date.now()

    res.on('finish', () => {
      const requestParams =
        Object.keys(req.body || {}).length > 0
          ? JSON.stringify(sanitizeLogValue(req.body))
          : Object.keys(req.query || {}).length > 0
            ? JSON.stringify(sanitizeLogValue(req.query))
            : undefined

      const logEntry: CreateOperationLogDto = {
        user: String(req.jwtPayload?.username || req.jwtPayload?.name || req.jwtPayload?.sub || 'anonymous'),
        module: getModule(req.path),
        operationType: METHOD_TYPE_MAP[req.method.toUpperCase()] || req.method,
        requestUrl: req.originalUrl,
        requestMethod: req.method.toUpperCase(),
        requestParams,
        ip: getClientIp(req),
        status: res.statusCode < 400 ? 'success' : 'fail',
        responseCode: res.statusCode,
        costTime: Date.now() - startTime,
      }

      operationLogService.record(logEntry)
    })

    next()
  }
}
