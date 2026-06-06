import { jest } from '@jest/globals'
import {
  FILE_SERVER_APP_CODE,
  FILE_SERVER_PERMISSION_CODES,
  PROJECT_PERMISSION_CODES,
  type AuthenticatedIdentity,
  type AuthorizationPermissionSummary,
  type AuthorizationRoleSummary,
} from '@super-pro/shared-types'
import { HttpStatus } from '@super-pro/shared-constants'
import type { AuthorizationRepositoryPort } from '../../src/authorization/authorization.repository.ts'
import {
  AuthorizationBusinessError,
  AuthorizationService,
} from '../../src/authorization/authorization.service.ts'

const viewerRole: AuthorizationRoleSummary = {
  id: 1,
  code: 'file-server.viewer',
  name: 'viewer',
}

const editorRole: AuthorizationRoleSummary = {
  id: 2,
  code: 'file-server.editor',
  name: 'editor',
}

const platformRole: AuthorizationRoleSummary = {
  id: 3,
  code: 'platform.admin',
  name: 'platform-admin',
}

const superAdminRole: AuthorizationRoleSummary = {
  id: 4,
  code: 'super-admin',
  name: 'super-admin',
}

const treePermission: AuthorizationPermissionSummary = {
  id: 11,
  code: FILE_SERVER_PERMISSION_CODES.treeRead,
  appCode: FILE_SERVER_APP_CODE,
  status: 1,
  resourceType: 'api',
  resourceCode: 'tree',
  action: 'read',
  name: 'tree',
}

const movePermission: AuthorizationPermissionSummary = {
  id: 12,
  code: FILE_SERVER_PERMISSION_CODES.fileMove,
  appCode: FILE_SERVER_APP_CODE,
  status: 1,
  resourceType: 'button',
  resourceCode: 'file',
  action: 'move',
  name: 'move',
}

const platformPermission: AuthorizationPermissionSummary = {
  id: 13,
  code: 'platform.audit.read',
  appCode: 'platform',
  status: 1,
  resourceType: 'api',
  resourceCode: 'audit',
  action: 'read',
  name: 'audit',
}

const superPermission: AuthorizationPermissionSummary = {
  id: 15,
  code: '*.*.*',
  appCode: '*',
  status: 1,
  resourceType: 'api',
  resourceCode: '*',
  action: '*',
  name: 'super',
}

const disabledPermission: AuthorizationPermissionSummary = {
  id: 14,
  code: 'file-server.disabled.read',
  appCode: FILE_SERVER_APP_CODE,
  status: 0,
  resourceType: 'api',
  resourceCode: 'disabled',
  action: 'read',
  name: 'disabled',
}

function createRepositoryMock(
  overrides: Partial<AuthorizationRepositoryPort> = {},
): AuthorizationRepositoryPort {
  return {
    ensureSeedData: async () => {},
    listPermissions: async () => [],
    getPermissionsByIds: async () => [],
    getPermissionByCode: async () => null,
    listRoles: async () => [],
    getRolesByIds: async () => [],
    getRolesByCodes: async () => [],
    getRoleMemberCounts: async () => new Map(),
    createPermission: async () => {
      throw new Error('not implemented')
    },
    updatePermission: async () => null,
    deletePermission: async () => null,
    createRole: async () => {
      throw new Error('not implemented')
    },
    updateRole: async () => null,
    deleteRole: async () => null,
    replaceRolePermissionAssignments: async () => {},
    replaceUserRoleAssignments: async () => {},
    clearUserRoleAssignments: async () => {},
    getAssignedRolesByUserIds: async () => new Map(),
    getProjectSummariesByRoleIdsMap: async () => new Map(),
    getPermissionSummariesByRoleIdsMap: async () => new Map(),
    getPermissionSummariesByRoleIds: async () => [],
    getFallbackRoleCodes: () => ['file-server.viewer'],
    ...overrides,
  }
}

describe('AuthorizationService', () => {
  const identity: AuthenticatedIdentity = {
    userId: 1,
    username: 'zhangsan',
    compatibilityRole: 'guest',
  }

  it('prefers explicit role assignments over compatibility fallback roles', async () => {
    const getRolesByCodes = jest.fn(async () => [viewerRole])
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () => new Map([[identity.userId, [editorRole]]]),
      getRolesByCodes,
      getPermissionSummariesByRoleIds: async (roleIds) =>
        roleIds.includes(editorRole.id) ? [treePermission, movePermission] : [],
    })
    const service = new AuthorizationService(repository)

    const principal = await service.getAuthenticatedPrincipal(identity)

    expect(getRolesByCodes).not.toHaveBeenCalled()
    expect(principal.roles).toEqual([editorRole])
    expect(principal.permissionCodes).toEqual([
      FILE_SERVER_PERMISSION_CODES.treeRead,
      FILE_SERVER_PERMISSION_CODES.fileMove,
    ])
  })

  it('aggregates user project permissions by assigned roles', async () => {
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () =>
        new Map([[identity.userId, [editorRole, platformRole]]]),
      getProjectSummariesByRoleIdsMap: async () =>
        new Map([
          [
            editorRole.id,
            [{ id: 101, projectCode: 'project', projectName: '项目中心' }],
          ],
          [
            platformRole.id,
            [{ id: 102, projectCode: 'platform', projectName: '平台中心' }],
          ],
        ]),
      getPermissionSummariesByRoleIdsMap: async () =>
        new Map([
          [
            editorRole.id,
            [
              {
                ...treePermission,
                id: 21,
                appCode: 'project',
                code: PROJECT_PERMISSION_CODES.projectRead,
                resourceCode: 'project',
                action: 'read',
                name: 'project-read',
              },
            ],
          ],
          [[platformRole.id, [platformPermission]]][0],
        ]),
    })
    const service = new AuthorizationService(repository)

    const result = await service.listUserProjectPermissions(identity.userId)

    expect(result.items).toEqual([
      expect.objectContaining({
        projectCode: 'platform',
        roles: [platformRole],
        permissions: [platformPermission],
      }),
      expect.objectContaining({
        projectCode: 'project',
        roles: [editorRole],
        permissions: [
          expect.objectContaining({
            code: PROJECT_PERMISSION_CODES.projectRead,
          }),
        ],
      }),
    ])
  })

  it('gets current user permission for a single project from the authenticated identity', async () => {
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () =>
        new Map([[identity.userId, [editorRole]]]),
      getProjectSummariesByRoleIdsMap: async () =>
        new Map([
          [
            editorRole.id,
            [{ id: 101, projectCode: FILE_SERVER_APP_CODE, projectName: '文件服务' }],
          ],
        ]),
      getPermissionSummariesByRoleIdsMap: async () =>
        new Map([
          [
            editorRole.id,
            [treePermission, movePermission],
          ],
        ]),
    })
    const service = new AuthorizationService(repository)

    const result = await service.getCurrentUserProjectPermission(
      identity,
      FILE_SERVER_APP_CODE,
    )

    expect(result.item).toEqual(
      expect.objectContaining({
        projectCode: FILE_SERVER_APP_CODE,
        roles: [editorRole],
        permissions: [treePermission, movePermission],
      }),
    )
  })

  it('filters disabled permissions from user project permission lists', async () => {
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () =>
        new Map([[identity.userId, [editorRole]]]),
      getProjectSummariesByRoleIdsMap: async () =>
        new Map([
          [
            editorRole.id,
            [{ id: 101, projectCode: FILE_SERVER_APP_CODE, projectName: '文件服务' }],
          ],
        ]),
      getPermissionSummariesByRoleIdsMap: async () =>
        new Map([
          [
            editorRole.id,
            [treePermission, disabledPermission],
          ],
        ]),
    })
    const service = new AuthorizationService(repository)

    const result = await service.listUserProjectPermissions(identity.userId)

    expect(result.items).toEqual([
      expect.objectContaining({
        projectCode: FILE_SERVER_APP_CODE,
        permissions: [treePermission],
      }),
    ])
  })

  it('filters disabled permissions from current project permission queries', async () => {
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () =>
        new Map([[identity.userId, [editorRole]]]),
      getProjectSummariesByRoleIdsMap: async () =>
        new Map([
          [
            editorRole.id,
            [{ id: 101, projectCode: FILE_SERVER_APP_CODE, projectName: '文件服务' }],
          ],
        ]),
      getPermissionSummariesByRoleIdsMap: async () =>
        new Map([
          [
            editorRole.id,
            [treePermission, disabledPermission],
          ],
        ]),
    })
    const service = new AuthorizationService(repository)

    const result = await service.getCurrentUserProjectPermission(
      identity,
      FILE_SERVER_APP_CODE,
    )

    expect(result.item).toEqual(
      expect.objectContaining({
        projectCode: FILE_SERVER_APP_CODE,
        permissions: [treePermission],
      }),
    )
  })

  it('ignores disabled permissions when calculating granted permission codes', async () => {
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () => new Map([[identity.userId, [editorRole]]]),
      getPermissionSummariesByRoleIds: async () => [
        treePermission,
        disabledPermission,
      ],
    })
    const service = new AuthorizationService(repository)

    const principal = await service.getAuthenticatedPrincipal(identity)

    expect(principal.permissionCodes).toEqual([FILE_SERVER_PERMISSION_CODES.treeRead])
  })

  it('grants the global wildcard permission to platform administrators even when assignments are stale', async () => {
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () => new Map([[identity.userId, [platformRole]]]),
      getPermissionSummariesByRoleIds: async () => [],
    })
    const service = new AuthorizationService(repository)

    const principal = await service.getAuthenticatedPrincipal(identity)

    expect(principal.roles).toEqual([platformRole])
    expect(principal.permissionCodes).toEqual(['*.*.*'])
  })

  it('grants the global wildcard permission to super-admin roles even when assignments are stale', async () => {
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () => new Map([[identity.userId, [superAdminRole]]]),
      getPermissionSummariesByRoleIds: async () => [],
    })
    const service = new AuthorizationService(repository)

    const principal = await service.getAuthenticatedPrincipal(identity)

    expect(principal.roles).toEqual([superAdminRole])
    expect(principal.permissionCodes).toEqual(['*.*.*'])
  })

  it('creates a permission', async () => {
    const repository = createRepositoryMock({
      createPermission: async (input) => ({
        id: 88,
        ...input,
        updateTime: '2026-06-04 12:00:00',
      }),
    })
    const service = new AuthorizationService(repository)

    const result = await service.createPermission({
      code: 'project.project.audit',
      appCode: 'project',
      status: 1,
      resourceType: 'button',
      resourceCode: 'project',
      action: 'audit',
      name: '项目审核',
      description: '允许审核项目',
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: 88,
        code: 'project.project.audit',
        appCode: 'project',
        status: 1,
      }),
    )
  })

  it('accepts the global wildcard permission code', async () => {
    const repository = createRepositoryMock({
      createPermission: async (input) => ({
        id: 89,
        ...input,
        updateTime: '2026-06-05 12:00:00',
      }),
    })
    const service = new AuthorizationService(repository)

    const result = await service.createPermission({
      code: '*.*.*',
      appCode: '*',
      status: 1,
      resourceType: 'api',
      resourceCode: '*',
      action: '*',
      name: '超级管理员全部权限',
      description: '拥有所有项目、所有项目下的权限和所有行为的全部权限。',
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: 89,
        code: '*.*.*',
        appCode: '*',
        status: 1,
      }),
    )
  })

  it('accepts role codes with underscores', async () => {
    const createdRole = {
      id: 66,
      code: 'fs_full_permission',
      name: '文件服务全权限',
      description: '文件服务全权限',
      status: 1,
      updateTime: '2026-06-05 09:00:00',
    }
    const repository = createRepositoryMock({
      createRole: async (input) => ({
        id: createdRole.id,
        ...input,
        updateTime: createdRole.updateTime,
      }),
      getRolesByIds: async () => [createdRole],
    })
    const service = new AuthorizationService(repository)

    const result = await service.createRole({
      name: '文件服务全权限',
      code: 'fs_full_permission',
      description: '文件服务全权限',
      status: 1,
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: 66,
        code: 'fs_full_permission',
        name: '文件服务全权限',
        status: 1,
      }),
    )
  })

  it('converts invalid JWT payloads into authorization business errors', () => {
    const service = new AuthorizationService(createRepositoryMock())

    expect(() =>
      service.resolveAuthenticatedIdentityFromJwtPayload({
        userId: 'bad-id',
        username: 'zhangsan',
        role: 'guest',
      }),
    ).toThrow(
      expect.objectContaining<Partial<AuthorizationBusinessError>>({
        statusCode: HttpStatus.UNAUTHORIZED,
      }),
    )
  })

  it('returns controlled 403 errors when an authenticated principal lacks a permission', async () => {
    const service = new AuthorizationService(createRepositoryMock())

    await expect(
      service.requirePermission(
        {
          ...identity,
          roles: [viewerRole],
          permissionCodes: [FILE_SERVER_PERMISSION_CODES.treeRead],
        },
        FILE_SERVER_PERMISSION_CODES.fileMove,
        'forbidden',
      ),
    ).rejects.toMatchObject<Partial<AuthorizationBusinessError>>({
      message: 'forbidden',
      statusCode: HttpStatus.FORBIDDEN,
    })
  })

  it('passes when the authenticated principal has the global wildcard permission', async () => {
    const service = new AuthorizationService(createRepositoryMock())

    await expect(
      service.requirePermission(
        {
          ...identity,
          roles: [platformRole],
          permissionCodes: ['*.*.*'],
        },
        FILE_SERVER_PERMISSION_CODES.fileMove,
        'forbidden',
      ),
    ).resolves.toBeUndefined()
  })

  it('passes when the authenticated principal has any configured permission', async () => {
    const service = new AuthorizationService(createRepositoryMock())

    await expect(
      service.requireAnyPermission(
        {
          ...identity,
          roles: [viewerRole],
          permissionCodes: [FILE_SERVER_PERMISSION_CODES.treeRead],
        },
        [PROJECT_PERMISSION_CODES.projectRead, FILE_SERVER_PERMISSION_CODES.treeRead],
        'forbidden',
      ),
    ).resolves.toBeUndefined()
  })

  it('includes wildcard permission codes in authenticated principals', async () => {
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () =>
        new Map([[identity.userId, [platformRole]]]),
      getPermissionSummariesByRoleIds: async () => [superPermission],
    })
    const service = new AuthorizationService(repository)

    const principal = await service.getAuthenticatedPrincipal(identity)

    expect(principal.roles).toEqual([platformRole])
    expect(principal.permissionCodes).toEqual(['*.*.*'])
  })

  it('includes wildcard permissions in current project permission queries', async () => {
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () =>
        new Map([[identity.userId, [platformRole]]]),
      getProjectSummariesByRoleIdsMap: async () =>
        new Map([
          [
            platformRole.id,
            [{ id: 102, projectCode: 'admin-console', projectName: '管理后台' }],
          ],
        ]),
      getPermissionSummariesByRoleIdsMap: async () =>
        new Map([[platformRole.id, [superPermission]]]),
    })
    const service = new AuthorizationService(repository)

    const result = await service.getCurrentUserProjectPermission(identity, 'admin-console')

    expect(result.item).toEqual(
      expect.objectContaining({
        projectCode: 'admin-console',
        roles: [platformRole],
        permissions: [superPermission],
      }),
    )
  })

  it('falls back to permission-derived current project access when the project mapping is missing', async () => {
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () =>
        new Map([[identity.userId, [superAdminRole]]]),
      getProjectSummariesByRoleIdsMap: async () =>
        new Map([
          [
            superAdminRole.id,
            [{ id: 201, projectCode: 'BMS', projectName: '后台管理系统' }],
          ],
        ]),
      getPermissionSummariesByRoleIdsMap: async () =>
        new Map([[superAdminRole.id, [superPermission]]]),
    })
    const service = new AuthorizationService(repository)

    const result = await service.getCurrentUserProjectPermission(identity, 'admin-console')

    expect(result.item).toEqual(
      expect.objectContaining({
        id: 0,
        projectCode: 'admin-console',
        roles: [superAdminRole],
        permissions: [superPermission],
      }),
    )
  })

  it('includes wildcard permissions across user project permission lists', async () => {
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () =>
        new Map([[identity.userId, [platformRole]]]),
      getProjectSummariesByRoleIdsMap: async () =>
        new Map([
          [
            platformRole.id,
            [
              { id: 101, projectCode: 'admin-console', projectName: '管理后台' },
              { id: 102, projectCode: 'file-server', projectName: '文件服务' },
            ],
          ],
        ]),
      getPermissionSummariesByRoleIdsMap: async () =>
        new Map([[platformRole.id, [superPermission]]]),
    })
    const service = new AuthorizationService(repository)

    const result = await service.listUserProjectPermissions(identity.userId)

    expect(result.items).toEqual([
      expect.objectContaining({
        projectCode: 'admin-console',
        permissions: [superPermission],
      }),
      expect.objectContaining({
        projectCode: 'file-server',
        permissions: [superPermission],
      }),
    ])
  })

  it('returns controlled 403 errors when the authenticated principal lacks one of all required permissions', async () => {
    const service = new AuthorizationService(createRepositoryMock())

    await expect(
      service.requireAllPermissions(
        {
          ...identity,
          roles: [viewerRole],
          permissionCodes: [
            FILE_SERVER_PERMISSION_CODES.treeRead,
            PROJECT_PERMISSION_CODES.projectRead,
          ],
        },
        [
          FILE_SERVER_PERMISSION_CODES.treeRead,
          PROJECT_PERMISSION_CODES.projectRead,
          FILE_SERVER_PERMISSION_CODES.fileMove,
        ],
        'forbidden',
      ),
    ).rejects.toMatchObject<Partial<AuthorizationBusinessError>>({
      message: 'forbidden',
      statusCode: HttpStatus.FORBIDDEN,
    })
  })
})
