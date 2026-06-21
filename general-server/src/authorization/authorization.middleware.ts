import type { NextFunction, Request, Response } from 'express';
import type { PermissionCode } from '@super-pro/shared-types';
import { HttpStatus } from '@super-pro/shared-constants';
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
      .sendFail('Failed to load current user permissions', HttpStatus.ERROR);
  }
}

type PermissionGuardMode = 'any' | 'all';

function createPermissionGuard(
  permissionCodes: readonly PermissionCode[],
  message: string,
  mode: PermissionGuardMode,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const principal = await ensureRequestPrincipal(req);
      if (mode === 'any') {
        await authorizationService.requireAnyPermission(
          principal,
          permissionCodes,
          message,
        );
      } else {
        await authorizationService.requireAllPermissions(
          principal,
          permissionCodes,
          message,
        );
      }
      return next();
    } catch (error) {
      if (error instanceof AuthorizationBusinessError) {
        return res.status(error.statusCode).sendFail(error.message, error.statusCode);
      }

      return res
        .status(HttpStatus.ERROR)
        .sendFail('Permission check failed', HttpStatus.ERROR);
    }
  };
}

export function requirePermission(permissionCode: PermissionCode, message: string) {
  return createPermissionGuard([permissionCode], message, 'all');
}

export function requireAnyPermission(
  permissionCodes: readonly PermissionCode[],
  message: string,
) {
  return createPermissionGuard(permissionCodes, message, 'any');
}

export function requireAllPermissions(
  permissionCodes: readonly PermissionCode[],
  message: string,
) {
  return createPermissionGuard(permissionCodes, message, 'all');
}
