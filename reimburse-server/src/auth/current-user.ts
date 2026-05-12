import { resolveAuthenticatedIdentityFromJwtPayload } from '@super-pro/shared-server';
import type { Request } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';

export type CurrentUserRole = 'admin' | 'employee' | 'approver' | 'guest';

export interface CurrentUserDto {
  userId: number;
  username: string;
  role: CurrentUserRole;
}

export class AuthBusinessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = HttpStatus.UNAUTHORIZED,
  ) {
    super(message);
    this.name = 'AuthBusinessError';
  }
}

function normalizeRole(value: unknown): CurrentUserRole {
  if (value === 'admin' || value === 'employee' || value === 'approver' || value === 'guest') {
    return value;
  }

  return 'guest';
}

export function resolveCurrentUser(req: Request): CurrentUserDto {
  try {
    const identity = resolveAuthenticatedIdentityFromJwtPayload(req.jwtPayload);
    return {
      userId: identity.userId,
      username: identity.username,
      role: normalizeRole(req.jwtPayload?.role),
    };
  } catch {
    throw new AuthBusinessError('当前登录状态无效');
  }
}
