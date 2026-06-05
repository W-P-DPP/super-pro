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

  it('filters authorization snapshots to the requested app scope', async () => {
    const repository = createRepositoryMock({
      getAssignedRolesByUserIds: async () =>
        new Map([[identity.userId, [platformRole, editorRole]]]),
      getPermissionSummariesByRoleIds: async () => [
        platformPermission,
        movePermission,
        treePermission,
      ],
    })
    const service = new AuthorizationService(repository)

    const snapshot = await service.getAuthorizationSnapshot(identity, {
      appCode: FILE_SERVER_APP_CODE,
    })

    expect(snapshot.appCode).toBe(FILE_SERVER_APP_CODE)
    expect(snapshot.permissions).toEqual([treePermission, movePermission])
    expect(snapshot.principal.permissionCodes).toEqual([
      FILE_SERVER_PERMISSION_CODES.treeRead,
      FILE_SERVER_PERMISSION_CODES.fileMove,
    ])
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
