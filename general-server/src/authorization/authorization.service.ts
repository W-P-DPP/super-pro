import {
  ensurePermission,
  hasPermission,
  resolveAuthenticatedIdentityFromJwtPayload,
  type AuthenticationRequiredError,
} from '@super-pro/shared-server';
import {
  AUTHORIZATION_RESOURCE_TYPES,
} from '@super-pro/shared-types';
import type {
  AppAuthorizationSnapshot,
  AuthenticatedIdentity,
  AuthenticatedPrincipal,
  AuthorizationPermissionSummary,
  AuthorizationRoleDetail,
  AuthorizationRoleSummary,
  PermissionCode,
} from '@super-pro/shared-types';
import { HttpStatus } from '@super-pro/shared-constants';
import type {
  AuthorizationPermissionListDto,
  AuthorizationRoleListDto,
  AuthorizationSnapshotQueryDto,
  AuthorizationSnapshotResponseDto,
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
      `${label}不合法`,
      {
        nodePath: 'authorization',
        field,
        reason: `${label}必须是正整数`,
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
      `${label}不能为空`,
      {
        nodePath: 'authorization',
        field,
        reason: `${label}必须是非空字符串`,
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
      `${label}必须是字符串`,
      {
        nodePath: 'authorization',
        field,
        reason: `${label}必须是字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value.trim();
}

function normalizeRoleCode(value: unknown, field: string): string {
  const roleCode = ensureNonEmptyString(value, field, '角色编码');

  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i.test(roleCode)) {
    throw new AuthorizationBusinessError(
      '角色编码不合法',
      {
        nodePath: 'authorization',
        field,
        reason: '角色编码只能包含字母、数字、点号和中划线',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return roleCode;
}

function normalizePermissionCode(value: unknown, field: string): string {
  const permissionCode = ensureNonEmptyString(value, field, '权限编码');

  if (!/^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/i.test(permissionCode)) {
    throw new AuthorizationBusinessError(
      '权限编码不合法',
      {
        nodePath: 'authorization',
        field,
        reason: '权限编码只能包含字母、数字、点号、下划线、中划线和冒号',
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
      '权限状态不合法',
      {
        nodePath: 'authorization',
        field,
        reason: '权限状态仅支持 0 或 1',
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
  const resourceType = ensureNonEmptyString(value, field, '权限类型');

  if (!AUTHORIZATION_RESOURCE_TYPES.includes(resourceType as AuthorizationPermissionSummary['resourceType'])) {
    throw new AuthorizationBusinessError(
      '权限类型不合法',
      {
        nodePath: 'authorization',
        field,
        reason: `权限类型仅支持 ${AUTHORIZATION_RESOURCE_TYPES.join('、')}`,
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
      `${label}不合法`,
      {
        nodePath: 'authorization',
        field,
        reason: `${label}必须是数组`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return Array.from(
    new Set(value.map((item, index) => ensurePositiveInteger(item, `${field}.${index}`, label))),
  );
}

function validateSnapshotQuery(
  input: AuthorizationSnapshotQueryDto | Record<string, unknown>,
): AuthorizationSnapshotQueryDto {
  return {
    appCode: ensureNonEmptyString(input.appCode, 'appCode', '应用编码'),
  };
}

function validateCreateRoleInput(
  input: CreateRoleRequestDto | Record<string, unknown>,
): CreateRoleRequestDto {
  return {
    code: normalizeRoleCode(input.code, 'code'),
    name: ensureNonEmptyString(input.name, 'name', '角色名称'),
    appCode: ensureNonEmptyString(input.appCode, 'appCode', '应用编码'),
    description: normalizeOptionalString(input.description, 'description', '角色说明'),
    status:
      input.status === undefined
        ? 1
        : normalizePermissionStatus(input.status, 'status'),
    permissionIds: normalizeIdList(input.permissionIds, 'permissionIds', '权限标识'),
  };
}

function validateCreatePermissionInput(
  input: CreatePermissionRequestDto | Record<string, unknown>,
): CreatePermissionRequestDto {
  return {
    code: normalizePermissionCode(input.code, 'code'),
    appCode: ensureNonEmptyString(input.appCode, 'appCode', '应用编码'),
    resourceType: normalizeResourceType(input.resourceType, 'resourceType'),
    resourceCode: ensureNonEmptyString(input.resourceCode, 'resourceCode', '资源标识'),
    action: ensureNonEmptyString(input.action, 'action', '动作标识'),
    name: ensureNonEmptyString(input.name, 'name', '权限名称'),
    description: normalizeOptionalString(input.description, 'description', '权限说明'),
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
    payload.name = ensureNonEmptyString(input.name, 'name', '角色名称');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'appCode')) {
    payload.appCode = ensureNonEmptyString(input.appCode, 'appCode', '应用编码');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    payload.description = normalizeOptionalString(
      input.description,
      'description',
      '角色说明',
    );
  }
  if (Object.prototype.hasOwnProperty.call(input, 'status')) {
    payload.status = normalizePermissionStatus(input.status, 'status');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'permissionIds')) {
    payload.permissionIds = normalizeIdList(
      input.permissionIds,
      'permissionIds',
      '权限标识',
    );
  }

  if (Object.keys(payload).length === 0) {
    throw new AuthorizationBusinessError(
      '更新角色参数不能为空',
      {
        nodePath: 'authorization',
        field: 'payload',
        reason: '至少需要提供一个可更新字段',
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
    payload.appCode = ensureNonEmptyString(input.appCode, 'appCode', '应用编码');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'resourceType')) {
    payload.resourceType = normalizeResourceType(input.resourceType, 'resourceType');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'resourceCode')) {
    payload.resourceCode = ensureNonEmptyString(input.resourceCode, 'resourceCode', '资源标识');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'action')) {
    payload.action = ensureNonEmptyString(input.action, 'action', '动作标识');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    payload.name = ensureNonEmptyString(input.name, 'name', '权限名称');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    payload.description = normalizeOptionalString(input.description, 'description', '权限说明');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'status')) {
    payload.status = normalizePermissionStatus(input.status, 'status');
  }

  if (Object.keys(payload).length === 0) {
    throw new AuthorizationBusinessError(
      '更新权限参数不能为空',
      {
        nodePath: 'authorization',
        field: 'payload',
        reason: '至少需要提供一个可更新字段',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return payload;
}

function uniquePermissionCodes(permissions: AuthorizationPermissionSummary[]): string[] {
  return Array.from(new Set(permissions.map((item) => item.code)));
}

function filterActivePermissions(
  permissions: AuthorizationPermissionSummary[],
): AuthorizationPermissionSummary[] {
  return permissions.filter((item) => item.status !== 0);
}

function sortRoles(roles: AuthorizationRoleSummary[]): AuthorizationRoleSummary[] {
  return [...roles].sort((left, right) => left.id - right.id);
}

function sortPermissions(
  permissions: AuthorizationPermissionSummary[],
): AuthorizationPermissionSummary[] {
  return [...permissions].sort((left, right) => left.id - right.id);
}

export class AuthorizationService {
  constructor(
    private readonly repository: AuthorizationRepositoryPort = authorizationRepository,
  ) {}

  async getAuthenticatedPrincipal(
    identity: AuthenticatedIdentity,
  ): Promise<AuthenticatedPrincipal> {
    const explicitRoleMap = await this.repository.getAssignedRolesByUserIds([identity.userId]);
    const explicitRoles = explicitRoleMap.get(identity.userId) ?? [];
    const roles =
      explicitRoles.length > 0
        ? explicitRoles
        : await this.repository.getRolesByCodes(
            this.repository.getFallbackRoleCodes(identity),
          );
    const permissions = await this.repository.getPermissionSummariesByRoleIds(
      roles.map((item) => item.id),
    );
    const activePermissions = filterActivePermissions(sortPermissions(permissions));

    return {
      ...identity,
      roles: sortRoles(roles),
      permissionCodes: uniquePermissionCodes(activePermissions),
    };
  }

  resolveAuthenticatedIdentityFromJwtPayload(
    payload: Record<string, unknown> | null | undefined,
  ): AuthenticatedIdentity {
    try {
      return resolveAuthenticatedIdentityFromJwtPayload(payload);
    } catch (error) {
      const authError = error as AuthenticationRequiredError;
      throw new AuthorizationBusinessError(
        authError.message || '当前登录状态无效',
        {
          nodePath: 'authorization',
          field: 'jwtPayload',
          reason: '当前请求缺少有效的用户身份',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async getAuthorizationSnapshot(
    identity: AuthenticatedIdentity,
    input: AuthorizationSnapshotQueryDto | Record<string, unknown>,
  ): Promise<AuthorizationSnapshotResponseDto> {
    const query = validateSnapshotQuery(input);
    const principal = await this.getAuthenticatedPrincipal(identity);
    const rolePermissions = await this.repository.getPermissionSummariesByRoleIds(
      principal.roles.map((item) => item.id),
    );
    const appPermissions = sortPermissions(filterActivePermissions(
      rolePermissions.filter((item) => item.appCode === query.appCode),
    ));

    const snapshot: AppAuthorizationSnapshot = {
      appCode: query.appCode,
      principal: {
        ...principal,
        permissionCodes: uniquePermissionCodes(appPermissions),
      },
      permissions: appPermissions,
    };

    return snapshot;
  }

  async listPermissions(appCode?: string): Promise<AuthorizationPermissionListDto> {
    return {
      items: sortPermissions(await this.repository.listPermissions(appCode)),
    };
  }

  async listRoles(appCode?: string): Promise<AuthorizationRoleListDto> {
    const roles = await this.repository.listRoles(appCode);
    const permissionsByRoleId = await this.repository.getPermissionSummariesByRoleIdsMap(
      roles.map((item) => item.id),
    );

    return {
      items: roles.map((role) => ({
        ...role,
        permissions: sortPermissions(permissionsByRoleId.get(role.id) ?? []),
      })),
    };
  }

  async createRole(
    input: CreateRoleRequestDto | Record<string, unknown>,
  ): Promise<AuthorizationRoleDetail> {
    const payload = validateCreateRoleInput(input);
    const roles = await this.repository.listRoles();
    if (roles.some((item) => item.code === payload.code)) {
      throw new AuthorizationBusinessError(
        '角色编码已存在',
        {
          nodePath: 'authorization',
          field: 'code',
          reason: '角色编码不能重复',
          value: payload.code,
        },
        HttpStatus.CONFLICT,
      );
    }

    await this.ensurePermissionIdsExist(payload.permissionIds ?? []);
    const created = await this.repository.createRole({
      code: payload.code,
      name: payload.name,
      appCode: payload.appCode,
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
    const payload = validateCreatePermissionInput(input);
    const existing = await this.repository.getPermissionByCode(payload.code);

    if (existing) {
      throw new AuthorizationBusinessError(
        '权限编码已存在',
        {
          nodePath: 'authorization',
          field: 'code',
          reason: '权限编码不能重复',
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
    const roleId = ensurePositiveInteger(id, 'id', '角色标识');
    const payload = validateUpdateRoleInput(input);
    const roles = await this.repository.listRoles();
    if (
      payload.code &&
      roles.some((item) => item.code === payload.code && item.id !== roleId)
    ) {
      throw new AuthorizationBusinessError(
        '角色编码已存在',
        {
          nodePath: 'authorization',
          field: 'code',
          reason: '角色编码不能重复',
          value: payload.code,
        },
        HttpStatus.CONFLICT,
      );
    }

    if (payload.permissionIds) {
      await this.ensurePermissionIdsExist(payload.permissionIds);
    }

    const updated = await this.repository.updateRole(roleId, {
      ...(payload.code !== undefined ? { code: payload.code } : {}),
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.appCode !== undefined ? { appCode: payload.appCode } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description }
        : {}),
    });

    if (!updated) {
      throw new AuthorizationBusinessError(
        '角色不存在',
        {
          nodePath: 'authorization',
          field: 'id',
          reason: '未找到对应角色',
          value: roleId,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (payload.permissionIds) {
      await this.repository.replaceRolePermissionAssignments(
        roleId,
        payload.permissionIds,
      );
    }

    return this.getRoleDetailById(roleId);
  }

  async updatePermission(
    id: number,
    input: UpdatePermissionRequestDto | Record<string, unknown>,
  ): Promise<AuthorizationPermissionSummary> {
    const permissionId = ensurePositiveInteger(id, 'id', '权限标识');
    const payload = validateUpdatePermissionInput(input);

    if (payload.code) {
      const existing = await this.repository.getPermissionByCode(payload.code);
      if (existing && existing.id !== permissionId) {
        throw new AuthorizationBusinessError(
          '权限编码已存在',
          {
            nodePath: 'authorization',
            field: 'code',
            reason: '权限编码不能重复',
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
      ...(payload.description !== undefined ? { description: payload.description } : {}),
    });

    if (!updated) {
      throw new AuthorizationBusinessError(
        '权限不存在',
        {
          nodePath: 'authorization',
          field: 'id',
          reason: '未找到对应权限',
          value: permissionId,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return updated;
  }

  async deletePermission(id: number): Promise<AuthorizationPermissionSummary> {
    const permissionId = ensurePositiveInteger(id, 'id', '权限标识');
    const deleted = await this.repository.deletePermission(permissionId);

    if (!deleted) {
      throw new AuthorizationBusinessError(
        '权限不存在',
        {
          nodePath: 'authorization',
          field: 'id',
          reason: '未找到对应权限',
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
          reason: '当前用户缺少所需权限',
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
    return this.repository.getAssignedRolesByUserIds(userIds);
  }

  async replaceUserRoleAssignments(userId: number, roleIds: number[]): Promise<void> {
    await this.ensureRoleIdsExist(roleIds);
    await this.repository.replaceUserRoleAssignments(userId, roleIds);
  }

  async clearUserRoleAssignments(userId: number): Promise<void> {
    await this.repository.clearUserRoleAssignments(userId);
  }

  async ensureRoleIdsExist(roleIds: number[]): Promise<void> {
    if (roleIds.length === 0) {
      return;
    }

    const roles = await this.repository.getRolesByIds(roleIds);
    if (roles.length !== roleIds.length) {
      const roleIdSet = new Set(roles.map((item) => item.id));
      const missingRoleId = roleIds.find((item) => !roleIdSet.has(item));
      throw new AuthorizationBusinessError(
        '指定的角色不存在',
        {
          nodePath: 'authorization',
          field: 'assignedRoleIds',
          reason: '用户角色分配中包含未知角色标识',
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
      const permissionIdSet = new Set(permissions.map((item) => item.id));
      const missingPermissionId = permissionIds.find(
        (item) => !permissionIdSet.has(item),
      );
      throw new AuthorizationBusinessError(
        '指定的权限不存在',
        {
          nodePath: 'authorization',
          field: 'permissionIds',
          reason: '角色权限分配中包含未知权限标识',
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
        '角色不存在',
        {
          nodePath: 'authorization',
          field: 'id',
          reason: '未找到对应角色',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const permissions = await this.repository.getPermissionSummariesByRoleIds([id]);
    return {
      ...role,
      permissions: sortPermissions(permissions),
    };
  }
}

export const authorizationService = new AuthorizationService();
