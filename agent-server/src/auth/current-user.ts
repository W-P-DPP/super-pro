import { resolveAuthenticatedIdentityFromJwtPayload } from '@super-pro/shared-server';
import type { Request } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';

export interface CurrentUserDto {
  userId: number;
  username: string;
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

export function resolveCurrentUser(req: Request): CurrentUserDto {
  try {
    const identity = resolveAuthenticatedIdentityFromJwtPayload(req.jwtPayload);
    return {
      userId: identity.userId,
      username: identity.username,
    };
  } catch {
    throw new AuthBusinessError('当前登录状态无效');
  }
}
