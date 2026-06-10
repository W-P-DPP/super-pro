import { describe, expect, it } from 'vitest';
import {
  AuthenticationRequiredError,
  AuthorizationRequiredError,
  ensurePermission,
  hasPermission,
  resolveAuthenticatedIdentityFromJwtPayload,
} from './authorization.ts';

describe('shared-server authorization helpers', () => {
  it('resolves authenticated identity from jwt payload', () => {
    expect(
      resolveAuthenticatedIdentityFromJwtPayload({
        userId: '7',
        username: 'alice',
        role: 'employee',
      }),
    ).toEqual({
      userId: 7,
      username: 'alice',
      compatibilityRole: 'employee',
    });
  });

  it('falls back to guest compatibility role for unexpected jwt roles', () => {
    expect(
      resolveAuthenticatedIdentityFromJwtPayload({
        userId: 8,
        username: 'bob',
        role: 'unknown-role',
      }),
    ).toEqual({
      userId: 8,
      username: 'bob',
      compatibilityRole: 'guest',
    });
  });

  it('rejects payloads without a valid user id', () => {
    expect(() =>
      resolveAuthenticatedIdentityFromJwtPayload({
        username: 'invalid-user',
      }),
    ).toThrow(AuthenticationRequiredError);
  });

  it('checks granted permission codes', () => {
    expect(
      hasPermission(
        {
          permissionCodes: ['file-server.tree.read'],
        },
        'file-server.tree.read',
      ),
    ).toBe(true);
    expect(
      hasPermission(
        {
          permissionCodes: ['file-server.tree.read'],
        },
        'file-server.file.upload',
      ),
    ).toBe(false);
  });

  it('supports wildcard permission codes for super administrators', () => {
    expect(
      hasPermission(
        {
          permissionCodes: ['*.*.*'],
        },
        'admin-console.button.roles.create',
      ),
    ).toBe(true);
  });

  it('supports segment wildcards when permission code dimensions align', () => {
    expect(
      hasPermission(
        {
          permissionCodes: ['admin-console.*.*.*'],
        },
        'admin-console.api.site-menu.read',
      ),
    ).toBe(true);
    expect(
      hasPermission(
        {
          permissionCodes: ['admin-console.*.*.*'],
        },
        'file-server.tree.read',
      ),
    ).toBe(false);
  });

  it('throws controlled forbidden errors when permission is missing', () => {
    expect(() =>
      ensurePermission(
        {
          permissionCodes: ['file-server.tree.read'],
        },
        'file-server.file.upload',
        '当前用户没有上传权限',
      ),
    ).toThrowError(
      expect.objectContaining<Partial<AuthorizationRequiredError>>({
        statusCode: 403,
        permissionCode: 'file-server.file.upload',
        message: '当前用户没有上传权限',
      }),
    );
  });
});
