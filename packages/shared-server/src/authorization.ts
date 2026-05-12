import type {
  AuthenticatedIdentity,
  AuthenticatedPrincipal,
  CompatibilityUserRole,
  PermissionCode,
} from '@super-pro/shared-types';

function normalizeCompatibilityRole(value: unknown): CompatibilityUserRole {
  if (
    value === 'admin' ||
    value === 'employee' ||
    value === 'approver' ||
    value === 'guest'
  ) {
    return value;
  }

  return 'guest';
}

function normalizePositiveInteger(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return Number.NaN;
}

export class AuthenticationRequiredError extends Error {
  readonly statusCode = 401;

  constructor(message = '当前登录状态无效') {
    super(message);
    this.name = 'AuthenticationRequiredError';
  }
}

export class AuthorizationRequiredError extends Error {
  readonly statusCode = 403;

  constructor(
    public readonly permissionCode: PermissionCode,
    message = '当前用户没有权限执行该操作',
  ) {
    super(message);
    this.name = 'AuthorizationRequiredError';
  }
}

export function resolveAuthenticatedIdentityFromJwtPayload(
  payload: Record<string, unknown> | null | undefined,
): AuthenticatedIdentity {
  const userId = normalizePositiveInteger(payload?.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AuthenticationRequiredError();
  }

  const rawUsername = payload?.username;

  return {
    userId,
    username:
      typeof rawUsername === 'string' && rawUsername.trim()
        ? rawUsername.trim()
        : `user-${userId}`,
    compatibilityRole: normalizeCompatibilityRole(payload?.role),
  };
}

export function hasPermission(
  principal: Pick<AuthenticatedPrincipal, 'permissionCodes'>,
  permissionCode: PermissionCode,
): boolean {
  return principal.permissionCodes.includes(permissionCode);
}

export function ensurePermission(
  principal: Pick<AuthenticatedPrincipal, 'permissionCodes'>,
  permissionCode: PermissionCode,
  message?: string,
): void {
  if (!hasPermission(principal, permissionCode)) {
    throw new AuthorizationRequiredError(permissionCode, message);
  }
}

declare global {
  namespace Express {
    interface Request {
      authPrincipal?: AuthenticatedPrincipal;
    }
  }
}
