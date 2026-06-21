import type { NextFunction, Request, Response } from 'express'
import { HttpStatus } from '@super-pro/shared-constants'
import type { PermissionCode } from '@super-pro/shared-types'
import { AuthorizationBusinessError, authorizationService } from '../../src/authorization/authorization.service.ts'

async function ensureRequestPrincipal(req: Request) {
  if (req.authPrincipal) {
    return req.authPrincipal
  }

  const identity = authorizationService.resolveAuthenticatedIdentityFromJwtPayload(req.jwtPayload)
  const principal = await authorizationService.getAuthenticatedPrincipal(identity)
  req.authPrincipal = principal
  return principal
}

export function createModulePermissionGuard(
  permissionCodes: readonly PermissionCode[],
  message: string,
  mode: 'any' | 'all' = 'all',
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const principal = await ensureRequestPrincipal(req)

      if (mode === 'any') {
        await authorizationService.requireAnyPermission(principal, permissionCodes, message)
      } else {
        await authorizationService.requireAllPermissions(principal, permissionCodes, message)
      }

      return next()
    } catch (error) {
      if (error instanceof AuthorizationBusinessError) {
        return res.status(error.statusCode).sendFail(error.message, error.statusCode)
      }

      return res.status(HttpStatus.ERROR).sendFail('Permission check failed', HttpStatus.ERROR)
    }
  }
}
