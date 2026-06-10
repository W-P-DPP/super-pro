import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { HttpStatus } from '@super-pro/shared-constants';

export interface JwtPayload {
  [key: string]: unknown;
}

declare global {
  namespace Express {
    interface Request {
      jwtPayload?: JwtPayload;
    }
  }
}

export type SharedJwtMiddlewareOptions = {
  enabled?: boolean;
  getSecret?: () => string;
  cookieNames?: string[];
  missingTokenMessage?: string;
  invalidTokenMessage?: string;
};

function getDefaultJwtSecret() {
  return process.env.JWT_SECRET || 'default_secret_key';
}

function extractBearerToken(authorization?: string): string | null {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
}

function extractCookieToken(cookieHeader: string | undefined, cookieNames: string[]): string | null {
  if (!cookieHeader || cookieNames.length === 0) {
    return null;
  }

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split('=');
    if (!rawName || !cookieNames.includes(rawName)) {
      continue;
    }

    const rawValue = rawValueParts.join('=').trim();
    if (!rawValue) {
      return null;
    }

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

function getRequestToken(req: Request, cookieNames: string[]): string | null {
  const bearerToken = extractBearerToken(req.headers.authorization);
  if (bearerToken) {
    return bearerToken;
  }

  return extractCookieToken(req.headers.cookie, cookieNames);
}

export function createJwtMiddleware(
  options: SharedJwtMiddlewareOptions = {},
): RequestHandler {
  const getSecret = options.getSecret ?? getDefaultJwtSecret;
  const cookieNames = options.cookieNames ?? [];
  const missingTokenMessage = options.missingTokenMessage ?? '缺少授权信息或授权格式错误';
  const invalidTokenMessage = options.invalidTokenMessage ?? '令牌无效或已过期';

  return function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
    const isEnabled = options.enabled ?? process.env.JWT_ENABLED === 'true';
    if (!isEnabled) {
      return next();
    }

    const token = getRequestToken(req, cookieNames);
    if (!token) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .sendFail(missingTokenMessage, HttpStatus.UNAUTHORIZED);
    }

    try {
      req.jwtPayload = jwt.verify(token, getSecret()) as JwtPayload;
      return next();
    } catch {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .sendFail(invalidTokenMessage, HttpStatus.UNAUTHORIZED);
    }
  };
}

export function generateJwtToken(payload: JwtPayload, expiresIn = 7200): string {
  return jwt.sign(payload, getDefaultJwtSecret(), { expiresIn });
}
