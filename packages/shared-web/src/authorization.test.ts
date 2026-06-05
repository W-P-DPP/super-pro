import { describe, expect, it } from 'vitest';
import type { AuthorizationUserProjectPermission } from '@super-pro/shared-types';
import {
  createProjectPermissionChecker,
  getGrantedPermissionCodes,
  hasAllProjectPermissions,
  hasAnyProjectPermission,
  hasProjectPermission,
} from './authorization.ts';

const projectPermission: AuthorizationUserProjectPermission = {
  id: 1,
  projectCode: 'file-server',
  projectName: '文件服务',
  roles: [],
  permissions: [
    {
      id: 11,
      code: 'file-server.tree.read',
      appCode: 'file-server',
      resourceType: 'api',
      resourceCode: 'tree',
      action: 'read',
      name: '读取文件树',
      status: 1,
    },
    {
      id: 12,
      code: 'file-server.button.upload',
      appCode: 'file-server',
      resourceType: 'button',
      resourceCode: 'upload',
      action: 'click',
      name: '上传按钮',
      status: 1,
    },
    {
      id: 13,
      code: 'file-server.menu.manage.view',
      appCode: 'file-server',
      resourceType: 'menu',
      resourceCode: 'manage',
      action: 'view',
      name: '管理菜单',
      status: 1,
    },
    {
      id: 14,
      code: 'file-server.tree.read',
      appCode: 'file-server',
      resourceType: 'api',
      resourceCode: 'tree',
      action: 'read',
      name: '读取文件树-重复',
      status: 1,
    },
    {
      id: 15,
      code: 'file-server.button.delete',
      appCode: 'file-server',
      resourceType: 'button',
      resourceCode: 'delete',
      action: 'click',
      name: '删除按钮',
      status: 0,
    },
  ],
};

const superAdminPermission: AuthorizationUserProjectPermission = {
  id: 2,
  projectCode: 'platform',
  projectName: '超级管理员',
  roles: [],
  permissions: [
    {
      id: 99,
      code: '*.*.*',
      appCode: '*',
      resourceType: 'api',
      resourceCode: '*',
      action: '*',
      name: '全部权限',
      status: 1,
    },
  ],
};

describe('shared-web authorization helpers', () => {
  it('checks granted permissions by permission code', () => {
    expect(hasProjectPermission(projectPermission, 'file-server.tree.read')).toBe(true);
    expect(hasProjectPermission(projectPermission, 'file-server.button.delete')).toBe(false);
  });

  it('checks granted permissions by resource dimensions', () => {
    expect(
      hasProjectPermission(projectPermission, {
        resourceType: 'button',
        resourceCode: 'upload',
        action: 'click',
      }),
    ).toBe(true);
    expect(
      hasProjectPermission(projectPermission, {
        resourceType: 'menu',
        resourceCode: 'manage',
        action: 'view',
      }),
    ).toBe(true);
    expect(
      hasProjectPermission(projectPermission, {
        resourceType: 'api',
        resourceCode: 'tree',
        action: 'write',
      }),
    ).toBe(false);
  });

  it('supports any and all permission checks', () => {
    expect(
      hasAnyProjectPermission(projectPermission, [
        'file-server.button.delete',
        'file-server.tree.read',
      ]),
    ).toBe(true);
    expect(
      hasAllProjectPermissions(projectPermission, [
        'file-server.tree.read',
        {
          resourceType: 'menu',
          resourceCode: 'manage',
          action: 'view',
        },
      ]),
    ).toBe(true);
    expect(
      hasAllProjectPermissions(projectPermission, [
        'file-server.tree.read',
        'file-server.button.delete',
      ]),
    ).toBe(false);
  });

  it('can include disabled permissions only when explicitly requested', () => {
    expect(
      hasProjectPermission(projectPermission, {
        code: 'file-server.button.delete',
        requireEnabled: false,
      }),
    ).toBe(true);
    expect(
      hasProjectPermission(projectPermission, {
        code: 'file-server.button.delete',
      }),
    ).toBe(false);
  });

  it('returns deduplicated granted permission codes', () => {
    expect(getGrantedPermissionCodes(projectPermission)).toEqual([
      'file-server.tree.read',
      'file-server.button.upload',
      'file-server.menu.manage.view',
    ]);
  });

  it('creates a reusable checker for repeated permission checks', () => {
    const checker = createProjectPermissionChecker(projectPermission);

    expect(checker.permissionCodes).toEqual([
      'file-server.tree.read',
      'file-server.button.upload',
      'file-server.menu.manage.view',
    ]);
    expect(checker.has('file-server.tree.read')).toBe(true);
    expect(
      checker.has({
        resourceType: 'button',
        resourceCode: 'upload',
        action: 'click',
      }),
    ).toBe(true);
    expect(
      checker.hasAny([
        'file-server.button.delete',
        'file-server.menu.manage.view',
      ]),
    ).toBe(true);
    expect(
      checker.hasAll([
        'file-server.tree.read',
        'file-server.menu.manage.view',
      ]),
    ).toBe(true);
  });

  it('supports wildcard permissions for super administrators', () => {
    const checker = createProjectPermissionChecker(superAdminPermission);

    expect(
      hasProjectPermission(superAdminPermission, 'admin-console.button.roles.create'),
    ).toBe(true);
    expect(
      hasProjectPermission(superAdminPermission, {
        appCode: 'admin-console',
        resourceType: 'button',
        resourceCode: 'roles',
        action: 'create',
      }),
    ).toBe(true);
    expect(checker.has('file-server.tree.read')).toBe(true);
  });
});
