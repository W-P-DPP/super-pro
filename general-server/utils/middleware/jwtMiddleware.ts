import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { HttpStatus } from '../constant/HttpStatus.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
const PREVIEW_TOKEN_COOKIE_NAME = 'file_preview_token';

export interface JwtPayload {
  [key: string]: unknown
}

declare global {
  namespace Express {
    interface Request {
      jwtPayload?: JwtPayload
    }
  }
}

export function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  if (process.env.JWT_ENABLED !== 'true') {
    return next();
  }

  const token = getRequestToken(req);
  if (!token) {
    return res
      .status(HttpStatus.UNAUTHORIZED)
      .sendFail('缺少授权信息或授权格式错误', HttpStatus.UNAUTHORIZED);
  }

  try {
    req.jwtPayload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return next();
  } catch {
    return res
      .status(HttpStatus.UNAUTHORIZED)
      .sendFail('令牌无效或已过期', HttpStatus.UNAUTHORIZED);
  }
}

export function generateToken(payload: JwtPayload, expiresIn: number = 7200): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function getRequestToken(req: Request): string | null {
  const bearerToken = extractBearerToken(req.headers.authorization);
  if (bearerToken) {
    return bearerToken;
  }

  return extractCookieToken(req.headers.cookie);
}

function extractBearerToken(authorization?: string): string | null {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
}

function extractCookieToken(cookieHeader?: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split('=');
    if (rawName !== PREVIEW_TOKEN_COOKIE_NAME) {
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
