import type { NextFunction, Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import {
  AuthorizationBusinessError,
  authorizationService,
} from './authorization.service.ts';

async function ensureRequestPrincipal(req: Request) {
  if (req.authPrincipal) {
    return req.authPrincipal;
  }

  const identity = authorizationService.resolveAuthenticatedIdentityFromJwtPayload(
    req.jwtPayload,
  );
  const principal = await authorizationService.getAuthenticatedPrincipal(identity);
  req.authPrincipal = principal;
  return principal;
}

export async function loadAuthenticatedPrincipal(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await ensureRequestPrincipal(req);
    return next();
  } catch (error) {
    if (error instanceof AuthorizationBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res
      .status(HttpStatus.ERROR)
      .sendFail('加载当前用户权限失败', HttpStatus.ERROR);
  }
}

export function requirePermission(permissionCode: string, message: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const principal = await ensureRequestPrincipal(req);
      await authorizationService.requirePermission(principal, permissionCode, message);
      return next();
    } catch (error) {
      if (error instanceof AuthorizationBusinessError) {
        return res.status(error.statusCode).sendFail(error.message, error.statusCode);
      }

      return res
        .status(HttpStatus.ERROR)
        .sendFail('权限校验失败', HttpStatus.ERROR);
    }
  };
}
