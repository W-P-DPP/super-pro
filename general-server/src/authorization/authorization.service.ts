import {
  AuthenticationRequiredError,
  ensurePermission,
  hasPermission,
  resolveAuthenticatedIdentityFromJwtPayload,
} from '@super-pro/shared-server';
import { HttpStatus } from '@super-pro/shared-constants';
import {
  AUTHORIZATION_RESOURCE_TYPES,
  type AuthenticatedIdentity,
  type AuthenticatedPrincipal,
  type AuthorizationPermissionSummary,
  type AuthorizationRoleDetail,
  type AuthorizationRoleSummary,
  type PermissionCode,
} from '@super-pro/shared-types';
import type {
  AuthorizationCurrentUserProjectPermissionResponseDto,
  AuthorizationPermissionListDto,
  AuthorizationRoleListDto,
  AuthorizationUserProjectPermissionListDto,
  AuthorizationUserProjectPermissionResponseDto,
  AuthorizationValidationErrorContextDto,
  CreatePermissionRequestDto,
  CreateRoleRequestDto,
  UpdatePermissionRequestDto,
  UpdateRoleRequestDto,
} from './authorization.dto.ts';
import {
  authorizationRepository,
  type AuthorizationRepositoryPort,
} from './authorization.repository.ts';

export class AuthorizationBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: AuthorizationValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AuthorizationBusinessError';
  }
}

function ensurePositiveInteger(value: unknown, field: string, label: string): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AuthorizationBusinessError(
      `${label} is invalid`,
      {
        nodePath: 'authorization',
        field,
        reason: `${label} must be a positive integer`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return parsed;
}

function ensureNonEmptyString(value: unknown, field: string, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AuthorizationBusinessError(
      `${label} is required`,
      {
        nodePath: 'authorization',
        field,
        reason: `${label} must be a non-empty string`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value.trim();
}

function normalizeOptionalString(value: unknown, field: string, label: string): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new AuthorizationBusinessError(
      `${label} is invalid`,
      {
        nodePath: 'authorization',
        field,
        reason: `${label} must be a string`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value.trim();
}

function normalizeRoleCode(value: unknown, field: string): string {
  const roleCode = ensureNonEmptyString(value, field, 'roleCode');

  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i.test(roleCode)) {
    throw new AuthorizationBusinessError(
      'invalid role code',
      {
        nodePath: 'authorization',
        field,
        reason: 'role code may contain letters, numbers, dots, underscores, and hyphens',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return roleCode;
}

function normalizePermissionCode(value: unknown, field: string): string {
  const permissionCode = ensureNonEmptyString(value, field, 'permissionCode');

  if (!/^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/i.test(permissionCode)) {
    throw new AuthorizationBusinessError(
      'invalid permission code',
      {
        nodePath: 'authorization',
        field,
        reason:
          'permission code may contain letters, numbers, dots, underscores, hyphens, and colons',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return permissionCode;
}

function normalizePermissionStatus(value: unknown, field: string): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN;

  if (parsed !== 0 && parsed !== 1) {
    throw new AuthorizationBusinessError(
      'invalid status',
      {
        nodePath: 'authorization',
        field,
        reason: 'status only supports 0 or 1',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return parsed;
}

function normalizeResourceType(
  value: unknown,
  field: string,
): AuthorizationPermissionSummary['resourceType'] {
  const resourceType = ensureNonEmptyString(value, field, 'resourceType');

  if (
    !AUTHORIZATION_RESOURCE_TYPES.includes(
      resourceType as AuthorizationPermissionSummary['resourceType'],
    )
  ) {
    throw new AuthorizationBusinessError(
      'invalid resource type',
      {
        nodePath: 'authorization',
        field,
        reason: `resource type only supports ${AUTHORIZATION_RESOURCE_TYPES.join(', ')}`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return resourceType as AuthorizationPermissionSummary['resourceType'];
}

function normalizeIdList(value: unknown, field: string, label: string): number[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new AuthorizationBusinessError(
      `${label} is invalid`,
      {
        nodePath: 'authorization',
        field,
        reason: `${label} must be an array`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return Array.from(
    new Set(
      value.map((item, index) =>
        ensurePositiveInteger(item, `${field}.${index}`, label),
      ),
    ),
  );
}

function ensureProjectCode(value: unknown, field: string): string {
  return ensureNonEmptyString(value, field, 'projectCode');
}

function validateCreateRoleInput(
  input: CreateRoleRequestDto | Record<string, unknown>,
): CreateRoleRequestDto {
  return {
    code: normalizeRoleCode(input.code, 'code'),
    name: ensureNonEmptyString(input.name, 'name', 'roleName'),
    description: normalizeOptionalString(
      input.description,
      'description',
      'roleDescription',
    ),
    status:
      input.status === undefined
        ? 1
        : normalizePermissionStatus(input.status, 'status'),
    permissionIds: normalizeIdList(input.permissionIds, 'permissionIds', 'permissionIds'),
  };
}

function validateCreatePermissionInput(
  input: CreatePermissionRequestDto | Record<string, unknown>,
): CreatePermissionRequestDto {
  return {
    code: normalizePermissionCode(input.code, 'code'),
    appCode: ensureNonEmptyString(input.appCode, 'appCode', 'appCode'),
    resourceType: normalizeResourceType(input.resourceType, 'resourceType'),
    resourceCode: ensureNonEmptyString(
      input.resourceCode,
      'resourceCode',
      'resourceCode',
    ),
    action: ensureNonEmptyString(input.action, 'action', 'action'),
    name: ensureNonEmptyString(input.name, 'name', 'permissionName'),
    description: normalizeOptionalString(
      input.description,
      'description',
      'permissionDescription',
    ),
    status:
      input.status === undefined
        ? 1
        : normalizePermissionStatus(input.status, 'status'),
  };
}

function validateUpdateRoleInput(
  input: UpdateRoleRequestDto | Record<string, unknown>,
): UpdateRoleRequestDto {
  const payload: UpdateRoleRequestDto = {};

  if (Object.prototype.hasOwnProperty.call(input, 'code')) {
    payload.code = normalizeRoleCode(input.code, 'code');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    payload.name = ensureNonEmptyString(input.name, 'name', 'roleName');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    payload.description = normalizeOptionalString(
      input.description,
      'description',
      'roleDescription',
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, 'status')) {
    payload.status = normalizePermissionStatus(input.status, 'status');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'permissionIds')) {
    payload.permissionIds = normalizeIdList(
      input.permissionIds,
      'permissionIds',
      'permissionIds',
    );
  }

  if (Object.keys(payload).length === 0) {
    throw new AuthorizationBusinessError(
      'update role payload is empty',
      {
        nodePath: 'authorization',
        field: 'payload',
        reason: 'at least one role field must be provided',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return payload;
}

function validateUpdatePermissionInput(
  input: UpdatePermissionRequestDto | Record<string, unknown>,
): UpdatePermissionRequestDto {
  const payload: UpdatePermissionRequestDto = {};

  if (Object.prototype.hasOwnProperty.call(input, 'code')) {
    payload.code = normalizePermissionCode(input.code, 'code');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'appCode')) {
    payload.appCode = ensureNonEmptyString(input.appCode, 'appCode', 'appCode');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'resourceType')) {
    payload.resourceType = normalizeResourceType(input.resourceType, 'resourceType');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'resourceCode')) {
    payload.resourceCode = ensureNonEmptyString(
      input.resourceCode,
      'resourceCode',
      'resourceCode',
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, 'action')) {
    payload.action = ensureNonEmptyString(input.action, 'action', 'action');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    payload.name = ensureNonEmptyString(input.name, 'name', 'permissionName');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    payload.description = normalizeOptionalString(
      input.description,
      'description',
      'permissionDescription',
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, 'status')) {
    payload.status = normalizePermissionStatus(input.status, 'status');
  }

  if (Object.keys(payload).length === 0) {
    throw new AuthorizationBusinessError(
      'update permission payload is empty',
      {
        nodePath: 'authorization',
        field: 'payload',
        reason: 'at least one permission field must be provided',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return payload;
}

function sortPermissions(
  permissions: readonly AuthorizationPermissionSummary[],
): AuthorizationPermissionSummary[] {
  return [...permissions].sort((left, right) => {
    return (
      left.appCode.localeCompare(right.appCode) ||
      left.resourceType.localeCompare(right.resourceType) ||
      left.resourceCode.localeCompare(right.resourceCode) ||
      left.action.localeCompare(right.action) ||
      left.code.localeCompare(right.code) ||
      left.id - right.id
    );
  });
}

function getGrantedPermissionCodes(
  permissions: readonly AuthorizationPermissionSummary[],
): PermissionCode[] {
  return Array.from(
    new Set(
      sortPermissions(permissions)
        .filter((permission) => permission.status !== 0)
        .map((permission) => permission.code),
    ),
  );
}

function sortRoles(
  roles: readonly AuthorizationRoleSummary[],
): AuthorizationRoleSummary[] {
  return [...roles].sort((left, right) => {
    return (
      left.code.localeCompare(right.code) ||
      left.name.localeCompare(right.name) ||
      left.id - right.id
    );
  });
}

export class AuthorizationService {
  constructor(
    private readonly repository: AuthorizationRepositoryPort = authorizationRepository,
  ) {}

  private async ensureSeedData(): Promise<void> {
    await this.repository.ensureSeedData();
  }

  resolveAuthenticatedIdentityFromJwtPayload(
    payload: Record<string, unknown> | null | undefined,
  ): AuthenticatedIdentity {
    try {
      return resolveAuthenticatedIdentityFromJwtPayload(payload);
    } catch (error) {
      if (error instanceof AuthenticationRequiredError) {
        throw new AuthorizationBusinessError(
          error.message,
          {
            nodePath: 'authorization',
            field: 'jwtPayload',
            reason: 'missing or invalid authenticated identity',
            value: payload,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw error;
    }
  }

  async getAuthenticatedPrincipal(
    identity: AuthenticatedIdentity,
  ): Promise<AuthenticatedPrincipal> {
    await this.ensureSeedData();

    const assignedRolesMap = await this.repository.getAssignedRolesByUserIds([
      identity.userId,
    ]);
    const assignedRoles = assignedRolesMap.get(identity.userId) ?? [];
    const roles =
      assignedRoles.length > 0
        ? assignedRoles
        : await this.repository.getRolesByCodes(this.repository.getFallbackRoleCodes(identity));
    const permissions = await this.repository.getPermissionSummariesByRoleIds(
      roles.map((role) => role.id),
    );

    return {
      ...identity,
      roles,
      permissionCodes: getGrantedPermissionCodes(permissions),
    };
  }

  async listPermissions(appCode?: string): Promise<AuthorizationPermissionListDto> {
    await this.ensureSeedData();

    return {
      items: sortPermissions(await this.repository.listPermissions(appCode)),
    };
  }

  async listRoles(appCode?: string): Promise<AuthorizationRoleListDto> {
    await this.ensureSeedData();

    const roles = await this.repository.listRoles(appCode);
    const roleIds = roles.map((role) => role.id);
    const memberCounts = await this.repository.getRoleMemberCounts(roleIds);
    const permissionsByRoleId = await this.repository.getPermissionSummariesByRoleIdsMap(
      roleIds,
    );

    return {
      items: roles.map((role) => ({
        ...role,
        memberCount: memberCounts.get(role.id) ?? 0,
        permissions: sortPermissions(permissionsByRoleId.get(role.id) ?? []),
      })),
    };
  }

  async listUserProjectPermissions(
    userIdInput: number | string,
  ): Promise<AuthorizationUserProjectPermissionListDto> {
    await this.ensureSeedData();

    const userId = ensurePositiveInteger(userIdInput, 'userId', 'userId');
    const assignedRolesMap = await this.repository.getAssignedRolesByUserIds([userId]);
    const assignedRoles = assignedRolesMap.get(userId) ?? [];

    if (assignedRoles.length === 0) {
      return { items: [] };
    }

    const roleIds = assignedRoles.map((role) => role.id);
    const [projectsByRoleId, permissionsByRoleId] = await Promise.all([
      this.repository.getProjectSummariesByRoleIdsMap(roleIds),
      this.repository.getPermissionSummariesByRoleIdsMap(roleIds),
    ]);

    const itemsByProjectCode = new Map<string, AuthorizationUserProjectPermissionResponseDto>();
    const roleById = new Map(assignedRoles.map((role) => [role.id, role]));

    for (const roleId of roleIds) {
      const role = roleById.get(roleId);
      if (!role) {
        continue;
      }

      const roleProjects = projectsByRoleId.get(roleId) ?? [];
      const rolePermissions = permissionsByRoleId.get(roleId) ?? [];

      for (const project of roleProjects) {
        const current =
          itemsByProjectCode.get(project.projectCode) ??
          {
            id: project.id,
            projectCode: project.projectCode,
            projectName: project.projectName,
            roles: [],
            permissions: [],
          };

        if (!current.roles.some((item) => item.id === role.id)) {
          current.roles.push(role);
        }

        for (const permission of rolePermissions) {
          if (permission.appCode !== project.projectCode) {
            continue;
          }

          if (!current.permissions.some((item) => item.id === permission.id)) {
            current.permissions.push(permission);
          }
        }

        itemsByProjectCode.set(project.projectCode, current);
      }
    }

    return {
      items: Array.from(itemsByProjectCode.values())
        .map((item) => ({
          ...item,
          roles: sortRoles(item.roles),
          permissions: sortPermissions(item.permissions),
        }))
        .sort((left, right) => {
          return (
            left.projectCode.localeCompare(right.projectCode) ||
            left.projectName.localeCompare(right.projectName) ||
            left.id - right.id
          );
        }),
    };
  }

  async getCurrentUserProjectPermission(
    identity: AuthenticatedIdentity,
    projectCodeInput: unknown,
  ): Promise<AuthorizationCurrentUserProjectPermissionResponseDto> {
    await this.ensureSeedData();

    const projectCode = ensureProjectCode(projectCodeInput, 'projectCode');
    const assignedRolesMap = await this.repository.getAssignedRolesByUserIds([identity.userId]);
    const assignedRoles = assignedRolesMap.get(identity.userId) ?? [];

    if (assignedRoles.length === 0) {
      return { item: null };
    }

    const roleIds = assignedRoles.map((role) => role.id);
    const [projectsByRoleId, permissionsByRoleId] = await Promise.all([
      this.repository.getProjectSummariesByRoleIdsMap(roleIds),
      this.repository.getPermissionSummariesByRoleIdsMap(roleIds),
    ]);

    const roleById = new Map(assignedRoles.map((role) => [role.id, role]));
    let currentItem: AuthorizationUserProjectPermissionResponseDto | null = null;

    for (const roleId of roleIds) {
      const role = roleById.get(roleId);
      if (!role) {
        continue;
      }

      const project = (projectsByRoleId.get(roleId) ?? []).find(
        (item) => item.projectCode === projectCode,
      );

      if (!project) {
        continue;
      }

      const rolePermissions = permissionsByRoleId.get(roleId) ?? [];
      const nextItem =
        currentItem ??
        {
          id: project.id,
          projectCode: project.projectCode,
          projectName: project.projectName,
          roles: [],
          permissions: [],
        };

      if (!nextItem.roles.some((item) => item.id === role.id)) {
        nextItem.roles.push(role);
      }

      for (const permission of rolePermissions) {
        if (permission.appCode !== projectCode) {
          continue;
        }

        if (!nextItem.permissions.some((item) => item.id === permission.id)) {
          nextItem.permissions.push(permission);
        }
      }

      currentItem = nextItem;
    }

    if (!currentItem) {
      return { item: null };
    }

    return {
      item: {
        ...currentItem,
        roles: sortRoles(currentItem.roles),
        permissions: sortPermissions(currentItem.permissions),
      },
    };
  }

  async createRole(
    input: CreateRoleRequestDto | Record<string, unknown>,
  ): Promise<AuthorizationRoleDetail> {
    await this.ensureSeedData();

    const payload = validateCreateRoleInput(input);
    const roles = await this.repository.listRoles();

    if (roles.some((role) => role.code === payload.code)) {
      throw new AuthorizationBusinessError(
        'role code already exists',
        {
          nodePath: 'authorization',
          field: 'code',
          reason: 'role code must be unique',
          value: payload.code,
        },
        HttpStatus.CONFLICT,
      );
    }

    await this.ensurePermissionIdsExist(payload.permissionIds ?? []);

    const created = await this.repository.createRole({
      code: payload.code,
      name: payload.name,
      status: payload.status ?? 1,
      description: payload.description ?? '',
    });

    await this.repository.replaceRolePermissionAssignments(
      created.id,
      payload.permissionIds ?? [],
    );

    return this.getRoleDetailById(created.id);
  }

  async createPermission(
    input: CreatePermissionRequestDto | Record<string, unknown>,
  ): Promise<AuthorizationPermissionSummary> {
    await this.ensureSeedData();

    const payload = validateCreatePermissionInput(input);
    const existing = await this.repository.getPermissionByCode(payload.code);

    if (existing) {
      throw new AuthorizationBusinessError(
        'permission code already exists',
        {
          nodePath: 'authorization',
          field: 'code',
          reason: 'permission code must be unique',
          value: payload.code,
        },
        HttpStatus.CONFLICT,
      );
    }

    return this.repository.createPermission({
      code: payload.code,
      appCode: payload.appCode,
      status: payload.status ?? 1,
      resourceType: payload.resourceType,
      resourceCode: payload.resourceCode,
      action: payload.action,
      name: payload.name,
      description: payload.description ?? '',
    });
  }

  async updateRole(
    id: number,
    input: UpdateRoleRequestDto | Record<string, unknown>,
  ): Promise<AuthorizationRoleDetail> {
    await this.ensureSeedData();

    const roleId = ensurePositiveInteger(id, 'id', 'roleId');
    const payload = validateUpdateRoleInput(input);
    const roles = await this.repository.listRoles();

    if (payload.code && roles.some((role) => role.code === payload.code && role.id !== roleId)) {
      throw new AuthorizationBusinessError(
        'role code already exists',
        {
          nodePath: 'authorization',
          field: 'code',
          reason: 'role code must be unique',
          value: payload.code,
        },
        HttpStatus.CONFLICT,
      );
    }

    if (payload.permissionIds !== undefined) {
      await this.ensurePermissionIdsExist(payload.permissionIds);
    }

    const updated = await this.repository.updateRole(roleId, {
      ...(payload.code !== undefined ? { code: payload.code } : {}),
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description }
        : {}),
    });

    if (!updated) {
      throw new AuthorizationBusinessError(
        'role not found',
        {
          nodePath: 'authorization',
          field: 'id',
          reason: 'role does not exist',
          value: roleId,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (payload.permissionIds !== undefined) {
      await this.repository.replaceRolePermissionAssignments(roleId, payload.permissionIds);
    }

    return this.getRoleDetailById(roleId);
  }

  async updatePermission(
    id: number,
    input: UpdatePermissionRequestDto | Record<string, unknown>,
  ): Promise<AuthorizationPermissionSummary> {
    await this.ensureSeedData();

    const permissionId = ensurePositiveInteger(id, 'id', 'permissionId');
    const payload = validateUpdatePermissionInput(input);

    if (payload.code) {
      const existing = await this.repository.getPermissionByCode(payload.code);

      if (existing && existing.id !== permissionId) {
        throw new AuthorizationBusinessError(
          'permission code already exists',
          {
            nodePath: 'authorization',
            field: 'code',
            reason: 'permission code must be unique',
            value: payload.code,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    const updated = await this.repository.updatePermission(permissionId, {
      ...(payload.code !== undefined ? { code: payload.code } : {}),
      ...(payload.appCode !== undefined ? { appCode: payload.appCode } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.resourceType !== undefined ? { resourceType: payload.resourceType } : {}),
      ...(payload.resourceCode !== undefined ? { resourceCode: payload.resourceCode } : {}),
      ...(payload.action !== undefined ? { action: payload.action } : {}),
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description }
        : {}),
    });

    if (!updated) {
      throw new AuthorizationBusinessError(
        'permission not found',
        {
          nodePath: 'authorization',
          field: 'id',
          reason: 'permission does not exist',
          value: permissionId,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return updated;
  }

  async removeRole(id: number): Promise<AuthorizationRoleSummary> {
    await this.ensureSeedData();

    const roleId = ensurePositiveInteger(id, 'id', 'roleId');
    const deleted = await this.repository.deleteRole(roleId);

    if (!deleted) {
      throw new AuthorizationBusinessError(
        'role not found',
        {
          nodePath: 'authorization',
          field: 'id',
          reason: 'role does not exist',
          value: roleId,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return deleted;
  }

  async deletePermission(id: number): Promise<AuthorizationPermissionSummary> {
    await this.ensureSeedData();

    const permissionId = ensurePositiveInteger(id, 'id', 'permissionId');
    const deleted = await this.repository.deletePermission(permissionId);

    if (!deleted) {
      throw new AuthorizationBusinessError(
        'permission not found',
        {
          nodePath: 'authorization',
          field: 'id',
          reason: 'permission does not exist',
          value: permissionId,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return deleted;
  }

  async requirePermission(
    principal: AuthenticatedPrincipal,
    permissionCode: PermissionCode,
    message: string,
  ): Promise<void> {
    try {
      ensurePermission(principal, permissionCode, message);
    } catch {
      throw new AuthorizationBusinessError(
        message,
        {
          nodePath: 'authorization',
          field: 'permissionCode',
          reason: 'missing required permission',
          value: permissionCode,
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async requireAnyPermission(
    principal: AuthenticatedPrincipal,
    permissionCodes: readonly PermissionCode[],
    message: string,
  ): Promise<void> {
    if (permissionCodes.some((permissionCode) => hasPermission(principal, permissionCode))) {
      return;
    }

    throw new AuthorizationBusinessError(
      message,
      {
        nodePath: 'authorization',
        field: 'permissionCodes',
        reason: 'missing any required permission',
        value: permissionCodes,
      },
      HttpStatus.FORBIDDEN,
    );
  }

  async requireAllPermissions(
    principal: AuthenticatedPrincipal,
    permissionCodes: readonly PermissionCode[],
    message: string,
  ): Promise<void> {
    const missingPermissionCode = permissionCodes.find(
      (permissionCode) => !hasPermission(principal, permissionCode),
    );

    if (!missingPermissionCode) {
      return;
    }

    throw new AuthorizationBusinessError(
      message,
      {
        nodePath: 'authorization',
        field: 'permissionCodes',
        reason: 'missing one or more required permissions',
        value: permissionCodes,
      },
      HttpStatus.FORBIDDEN,
    );
  }

  async getAssignedRolesByUserIds(
    userIds: number[],
  ): Promise<Map<number, AuthorizationRoleSummary[]>> {
    await this.ensureSeedData();
    return this.repository.getAssignedRolesByUserIds(userIds);
  }

  async replaceUserRoleAssignments(userId: number, roleIds: number[]): Promise<void> {
    await this.ensureSeedData();
    await this.ensureRoleIdsExist(roleIds);
    await this.repository.replaceUserRoleAssignments(userId, roleIds);
  }

  async clearUserRoleAssignments(userId: number): Promise<void> {
    await this.ensureSeedData();
    await this.repository.clearUserRoleAssignments(userId);
  }

  async ensureRoleIdsExist(roleIds: number[]): Promise<void> {
    await this.ensureSeedData();

    if (roleIds.length === 0) {
      return;
    }

    const roles = await this.repository.getRolesByIds(roleIds);

    if (roles.length !== roleIds.length) {
      const roleIdSet = new Set(roles.map((role) => role.id));
      const missingRoleId = roleIds.find((roleId) => !roleIdSet.has(roleId));

      throw new AuthorizationBusinessError(
        'role ids are invalid',
        {
          nodePath: 'authorization',
          field: 'roleIds',
          reason: 'one or more roles do not exist',
          value: missingRoleId,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async ensurePermissionIdsExist(permissionIds: number[]): Promise<void> {
    if (permissionIds.length === 0) {
      return;
    }

    const permissions = await this.repository.getPermissionsByIds(permissionIds);

    if (permissions.length !== permissionIds.length) {
      const permissionIdSet = new Set(permissions.map((permission) => permission.id));
      const missingPermissionId = permissionIds.find(
        (permissionId) => !permissionIdSet.has(permissionId),
      );

      throw new AuthorizationBusinessError(
        'permission ids are invalid',
        {
          nodePath: 'authorization',
          field: 'permissionIds',
          reason: 'one or more permissions do not exist',
          value: missingPermissionId,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getRoleDetailById(id: number): Promise<AuthorizationRoleDetail> {
    const roles = await this.repository.getRolesByIds([id]);
    const role = roles[0];

    if (!role) {
      throw new AuthorizationBusinessError(
        'role not found',
        {
          nodePath: 'authorization',
          field: 'id',
          reason: 'role does not exist',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const permissions = await this.repository.getPermissionSummariesByRoleIds([id]);
    const memberCounts = await this.repository.getRoleMemberCounts([id]);

    return {
      ...role,
      memberCount: memberCounts.get(id) ?? 0,
      permissions: sortPermissions(permissions),
    };
  }
}

export const authorizationService = new AuthorizationService();
