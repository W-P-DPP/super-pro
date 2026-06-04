import { In, type EntityManager, type Repository } from 'typeorm';
import type {
  AuthenticatedIdentity,
  AuthorizationPermissionSummary,
  AuthorizationRoleSummary,
} from '@super-pro/shared-types';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import {
  COMPATIBILITY_ROLE_FALLBACK_ROLE_CODES,
  SEEDED_PERMISSIONS,
  SEEDED_ROLE_PERMISSION_CODES,
  SEEDED_ROLES,
} from './authorization.permissions.ts';
import {
  PermissionEntity,
  RoleEntity,
  RolePermissionAssignmentEntity,
  UserRoleAssignmentEntity,
} from './authorization.entity.ts';

export interface CreateRoleEntityInput {
  code: string;
  name: string;
  appCode: string;
  description: string;
}

export interface CreatePermissionEntityInput {
  code: string;
  appCode: string;
  status: number;
  resourceType: AuthorizationPermissionSummary['resourceType'];
  resourceCode: string;
  action: string;
  name: string;
  description: string;
}

export interface UpdateRoleEntityInput {
  code?: string;
  name?: string;
  appCode?: string;
  description?: string;
}

export interface UpdatePermissionEntityInput {
  code?: string;
  appCode?: string;
  status?: number;
  resourceType?: AuthorizationPermissionSummary['resourceType'];
  resourceCode?: string;
  action?: string;
  name?: string;
  description?: string;
}

export interface AuthorizationRepositoryPort {
  ensureSeedData(): Promise<void>;
  listPermissions(appCode?: string): Promise<AuthorizationPermissionSummary[]>;
  getPermissionsByIds(ids: number[]): Promise<AuthorizationPermissionSummary[]>;
  getPermissionByCode(code: string): Promise<AuthorizationPermissionSummary | null>;
  listRoles(appCode?: string): Promise<AuthorizationRoleSummary[]>;
  getRolesByIds(ids: number[]): Promise<AuthorizationRoleSummary[]>;
  getRolesByCodes(codes: readonly string[]): Promise<AuthorizationRoleSummary[]>;
  createPermission(input: CreatePermissionEntityInput): Promise<AuthorizationPermissionSummary>;
  updatePermission(
    id: number,
    input: UpdatePermissionEntityInput,
  ): Promise<AuthorizationPermissionSummary | null>;
  deletePermission(id: number): Promise<AuthorizationPermissionSummary | null>;
  createRole(input: CreateRoleEntityInput): Promise<AuthorizationRoleSummary>;
  updateRole(id: number, input: UpdateRoleEntityInput): Promise<AuthorizationRoleSummary | null>;
  replaceRolePermissionAssignments(roleId: number, permissionIds: number[]): Promise<void>;
  replaceUserRoleAssignments(userId: number, roleIds: number[]): Promise<void>;
  clearUserRoleAssignments(userId: number): Promise<void>;
  getAssignedRolesByUserIds(userIds: number[]): Promise<Map<number, AuthorizationRoleSummary[]>>;
  getPermissionSummariesByRoleIdsMap(
    roleIds: number[],
  ): Promise<Map<number, AuthorizationPermissionSummary[]>>;
  getPermissionSummariesByRoleIds(roleIds: number[]): Promise<AuthorizationPermissionSummary[]>;
  getFallbackRoleCodes(identity: AuthenticatedIdentity): readonly string[];
}

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

function toRoleSummary(entity: RoleEntity): AuthorizationRoleSummary {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    appCode: entity.appCode,
    ...(entity.description ? { description: entity.description } : {}),
  };
}

function toPermissionSummary(entity: PermissionEntity): AuthorizationPermissionSummary {
  return {
    id: entity.id,
    code: entity.code,
    appCode: entity.appCode,
    status: entity.status,
    resourceType: entity.resourceType as AuthorizationPermissionSummary['resourceType'],
    resourceCode: entity.resourceCode,
    action: entity.action,
    name: entity.name,
    ...(entity.description ? { description: entity.description } : {}),
    ...(entity.updateTime ? { updateTime: String(entity.updateTime) } : {}),
  };
}

export class AuthorizationRepository implements AuthorizationRepositoryPort {
  private seedPromise: Promise<void> | null = null;

  private async getRoleRepository(manager?: EntityManager): Promise<Repository<RoleEntity>> {
    const dataSource = await ensureDataSource();
    return manager ? manager.getRepository(RoleEntity) : dataSource.getRepository(RoleEntity);
  }

  private async getPermissionRepository(
    manager?: EntityManager,
  ): Promise<Repository<PermissionEntity>> {
    const dataSource = await ensureDataSource();
    return manager
      ? manager.getRepository(PermissionEntity)
      : dataSource.getRepository(PermissionEntity);
  }

  private async getUserRoleRepository(
    manager?: EntityManager,
  ): Promise<Repository<UserRoleAssignmentEntity>> {
    const dataSource = await ensureDataSource();
    return manager
      ? manager.getRepository(UserRoleAssignmentEntity)
      : dataSource.getRepository(UserRoleAssignmentEntity);
  }

  private async getRolePermissionRepository(
    manager?: EntityManager,
  ): Promise<Repository<RolePermissionAssignmentEntity>> {
    const dataSource = await ensureDataSource();
    return manager
      ? manager.getRepository(RolePermissionAssignmentEntity)
      : dataSource.getRepository(RolePermissionAssignmentEntity);
  }

  async ensureSeedData(): Promise<void> {
    if (this.seedPromise) {
      return this.seedPromise;
    }

    this.seedPromise = (async () => {
      const dataSource = await ensureDataSource();
      await dataSource.transaction(async (manager) => {
        const roleRepository = await this.getRoleRepository(manager);
        const permissionRepository = await this.getPermissionRepository(manager);
        const rolePermissionRepository = await this.getRolePermissionRepository(manager);

        const existingPermissions = await permissionRepository.find();
        const permissionByCode = new Map(
          existingPermissions.map((item) => [item.code, item]),
        );

        for (const seed of SEEDED_PERMISSIONS) {
          const current = permissionByCode.get(seed.code);
          if (current) {
            current.appCode = seed.appCode;
            current.status = 1;
            current.resourceType = seed.resourceType;
            current.resourceCode = seed.resourceCode;
            current.action = seed.action;
            current.name = seed.name;
            current.description = seed.description;
            current.updateBy = 'system';
            await permissionRepository.save(current);
            continue;
          }

          const created = permissionRepository.create({
            code: seed.code,
            appCode: seed.appCode,
            status: 1,
            resourceType: seed.resourceType,
            resourceCode: seed.resourceCode,
            action: seed.action,
            name: seed.name,
            description: seed.description,
            createBy: 'system',
            updateBy: 'system',
          });
          await permissionRepository.save(created);
        }

        const latestPermissions = await permissionRepository.find();
        const latestPermissionByCode = new Map(
          latestPermissions.map((item) => [item.code, item]),
        );

        const existingRoles = await roleRepository.find();
        const roleByCode = new Map(existingRoles.map((item) => [item.code, item]));

        for (const seed of SEEDED_ROLES) {
          const current = roleByCode.get(seed.code);
          if (current) {
            current.name = seed.name;
            current.appCode = seed.appCode;
            current.description = seed.description;
            current.updateBy = 'system';
            await roleRepository.save(current);
            continue;
          }

          const created = roleRepository.create({
            code: seed.code,
            name: seed.name,
            appCode: seed.appCode,
            description: seed.description,
            createBy: 'system',
            updateBy: 'system',
          });
          await roleRepository.save(created);
        }

        const latestRoles = await roleRepository.find();
        const latestRoleByCode = new Map(latestRoles.map((item) => [item.code, item]));
        const currentAssignments = await rolePermissionRepository.find();
        const assignmentSet = new Set(
          currentAssignments.map((item) => `${item.roleId}:${item.permissionId}`),
        );

        for (const [roleCode, permissionCodes] of Object.entries(
          SEEDED_ROLE_PERMISSION_CODES,
        )) {
          const role = latestRoleByCode.get(roleCode);
          if (!role) {
            continue;
          }

          for (const permissionCode of permissionCodes) {
            const permission = latestPermissionByCode.get(permissionCode);
            if (!permission) {
              continue;
            }

            const assignmentKey = `${role.id}:${permission.id}`;
            if (assignmentSet.has(assignmentKey)) {
              continue;
            }

            assignmentSet.add(assignmentKey);
            const created = rolePermissionRepository.create({
              roleId: role.id,
              permissionId: permission.id,
              createBy: 'system',
              updateBy: 'system',
            });
            await rolePermissionRepository.save(created);
          }
        }
      });
    })().finally(() => {
      this.seedPromise = null;
    });

    return this.seedPromise;
  }

  async listPermissions(appCode?: string): Promise<AuthorizationPermissionSummary[]> {
    await this.ensureSeedData();
    const repository = await this.getPermissionRepository();
    const entities = await repository.find({
      where: appCode ? { appCode } : {},
      order: {
        appCode: 'ASC',
        resourceCode: 'ASC',
        action: 'ASC',
        id: 'ASC',
      },
    });

    return entities.map(toPermissionSummary);
  }

  async getPermissionsByIds(ids: number[]): Promise<AuthorizationPermissionSummary[]> {
    await this.ensureSeedData();
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getPermissionRepository();
    const entities = await repository.findBy({
      id: In(ids),
    });
    return entities.map(toPermissionSummary);
  }

  async getPermissionByCode(code: string): Promise<AuthorizationPermissionSummary | null> {
    await this.ensureSeedData();
    const repository = await this.getPermissionRepository();
    const entity = await repository.findOne({
      where: { code },
    });

    return entity ? toPermissionSummary(entity) : null;
  }

  async listRoles(appCode?: string): Promise<AuthorizationRoleSummary[]> {
    await this.ensureSeedData();
    const repository = await this.getRoleRepository();
    const entities = await repository.find({
      where: appCode ? { appCode } : {},
      order: {
        appCode: 'ASC',
        id: 'ASC',
      },
    });

    return entities.map(toRoleSummary);
  }

  async getRolesByIds(ids: number[]): Promise<AuthorizationRoleSummary[]> {
    await this.ensureSeedData();
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRoleRepository();
    const entities = await repository.findBy({
      id: In(ids),
    });
    return entities.map(toRoleSummary);
  }

  async getRolesByCodes(codes: readonly string[]): Promise<AuthorizationRoleSummary[]> {
    await this.ensureSeedData();
    if (codes.length === 0) {
      return [];
    }

    const repository = await this.getRoleRepository();
    const entities = await repository.find({
      where: codes.map((code) => ({ code })),
      order: {
        id: 'ASC',
      },
    });
    return entities.map(toRoleSummary);
  }

  async createRole(input: CreateRoleEntityInput): Promise<AuthorizationRoleSummary> {
    await this.ensureSeedData();
    const repository = await this.getRoleRepository();
    const entity = repository.create({
      code: input.code,
      name: input.name,
      appCode: input.appCode,
      description: input.description,
      createBy: 'system',
      updateBy: 'system',
    });
    const saved = await repository.save(entity);
    return toRoleSummary(saved);
  }

  async createPermission(
    input: CreatePermissionEntityInput,
  ): Promise<AuthorizationPermissionSummary> {
    await this.ensureSeedData();
    const repository = await this.getPermissionRepository();
    const entity = repository.create({
      code: input.code,
      appCode: input.appCode,
      status: input.status,
      resourceType: input.resourceType,
      resourceCode: input.resourceCode,
      action: input.action,
      name: input.name,
      description: input.description,
      createBy: 'system',
      updateBy: 'system',
    });
    const saved = await repository.save(entity);
    return toPermissionSummary(saved);
  }

  async updateRole(
    id: number,
    input: UpdateRoleEntityInput,
  ): Promise<AuthorizationRoleSummary | null> {
    await this.ensureSeedData();
    const repository = await this.getRoleRepository();
    const current = await repository.findOne({
      where: { id },
    });

    if (!current) {
      return null;
    }

    if (input.code !== undefined) {
      current.code = input.code;
    }
    if (input.name !== undefined) {
      current.name = input.name;
    }
    if (input.appCode !== undefined) {
      current.appCode = input.appCode;
    }
    if (input.description !== undefined) {
      current.description = input.description;
    }
    current.updateBy = 'system';

    const saved = await repository.save(current);
    return toRoleSummary(saved);
  }

  async updatePermission(
    id: number,
    input: UpdatePermissionEntityInput,
  ): Promise<AuthorizationPermissionSummary | null> {
    await this.ensureSeedData();
    const repository = await this.getPermissionRepository();
    const current = await repository.findOne({
      where: { id },
    });

    if (!current) {
      return null;
    }

    if (input.code !== undefined) {
      current.code = input.code;
    }
    if (input.appCode !== undefined) {
      current.appCode = input.appCode;
    }
    if (input.status !== undefined) {
      current.status = input.status;
    }
    if (input.resourceType !== undefined) {
      current.resourceType = input.resourceType;
    }
    if (input.resourceCode !== undefined) {
      current.resourceCode = input.resourceCode;
    }
    if (input.action !== undefined) {
      current.action = input.action;
    }
    if (input.name !== undefined) {
      current.name = input.name;
    }
    if (input.description !== undefined) {
      current.description = input.description;
    }
    current.updateBy = 'system';

    const saved = await repository.save(current);
    return toPermissionSummary(saved);
  }

  async deletePermission(id: number): Promise<AuthorizationPermissionSummary | null> {
    await this.ensureSeedData();
    const permissionRepository = await this.getPermissionRepository();
    const rolePermissionRepository = await this.getRolePermissionRepository();
    const current = await permissionRepository.findOne({
      where: { id },
    });

    if (!current) {
      return null;
    }

    await rolePermissionRepository.delete({ permissionId: id });
    await permissionRepository.remove(current);
    return toPermissionSummary(current);
  }

  async replaceRolePermissionAssignments(
    roleId: number,
    permissionIds: number[],
  ): Promise<void> {
    await this.ensureSeedData();
    const repository = await this.getRolePermissionRepository();
    await repository.delete({ roleId });

    if (permissionIds.length === 0) {
      return;
    }

    const entities = permissionIds.map((permissionId) =>
      repository.create({
        roleId,
        permissionId,
        createBy: 'system',
        updateBy: 'system',
      }),
    );
    await repository.save(entities);
  }

  async replaceUserRoleAssignments(userId: number, roleIds: number[]): Promise<void> {
    await this.ensureSeedData();
    const repository = await this.getUserRoleRepository();
    await repository.delete({ userId });

    if (roleIds.length === 0) {
      return;
    }

    const entities = roleIds.map((roleId) =>
      repository.create({
        userId,
        roleId,
        createBy: 'system',
        updateBy: 'system',
      }),
    );
    await repository.save(entities);
  }

  async clearUserRoleAssignments(userId: number): Promise<void> {
    await this.ensureSeedData();
    const repository = await this.getUserRoleRepository();
    await repository.delete({ userId });
  }

  async getAssignedRolesByUserIds(
    userIds: number[],
  ): Promise<Map<number, AuthorizationRoleSummary[]>> {
    await this.ensureSeedData();
    const result = new Map<number, AuthorizationRoleSummary[]>();
    if (userIds.length === 0) {
      return result;
    }

    const dataSource = await ensureDataSource();
    const rows = (await dataSource
      .getRepository(UserRoleAssignmentEntity)
      .createQueryBuilder('userRole')
      .innerJoin(RoleEntity, 'role', 'role.id = userRole.role_id')
      .where('userRole.user_id IN (:...userIds)', { userIds })
      .select([
        'userRole.userId AS userId',
        'role.id AS id',
        'role.code AS code',
        'role.name AS name',
        'role.appCode AS appCode',
        'role.description AS description',
      ])
      .orderBy('role.id', 'ASC')
      .getRawMany()) as Array<{
      userId: number;
      id: number;
      code: string;
      name: string;
      appCode: string;
      description: string;
    }>;

    for (const row of rows) {
      const current = result.get(row.userId) ?? [];
      current.push({
        id: row.id,
        code: row.code,
        name: row.name,
        appCode: row.appCode,
        ...(row.description ? { description: row.description } : {}),
      });
      result.set(row.userId, current);
    }

    return result;
  }

  async getPermissionSummariesByRoleIdsMap(
    roleIds: number[],
  ): Promise<Map<number, AuthorizationPermissionSummary[]>> {
    await this.ensureSeedData();
    const result = new Map<number, AuthorizationPermissionSummary[]>();
    if (roleIds.length === 0) {
      return result;
    }

    const dataSource = await ensureDataSource();
    const rows = (await dataSource
      .getRepository(RolePermissionAssignmentEntity)
      .createQueryBuilder('rolePermission')
      .innerJoin(
        PermissionEntity,
        'permission',
        'permission.id = rolePermission.permission_id',
      )
      .where('rolePermission.role_id IN (:...roleIds)', { roleIds })
      .select([
        'rolePermission.roleId AS roleId',
        'permission.id AS id',
        'permission.code AS code',
        'permission.appCode AS appCode',
        'permission.resourceType AS resourceType',
        'permission.resourceCode AS resourceCode',
        'permission.action AS action',
        'permission.name AS name',
        'permission.description AS description',
      ])
      .orderBy('permission.id', 'ASC')
      .getRawMany()) as Array<{
      roleId: number;
      id: number;
      code: string;
      appCode: string;
      resourceType: AuthorizationPermissionSummary['resourceType'];
      resourceCode: string;
      action: string;
      name: string;
      description: string;
    }>;

    for (const row of rows) {
      const current = result.get(row.roleId) ?? [];
      if (current.some((item) => item.id === row.id)) {
        continue;
      }

      current.push({
        id: row.id,
        code: row.code,
        appCode: row.appCode,
        resourceType: row.resourceType,
        resourceCode: row.resourceCode,
        action: row.action,
        name: row.name,
        ...(row.description ? { description: row.description } : {}),
      });
      result.set(row.roleId, current);
    }

    return result;
  }

  async getPermissionSummariesByRoleIds(
    roleIds: number[],
  ): Promise<AuthorizationPermissionSummary[]> {
    const permissionMap = await this.getPermissionSummariesByRoleIdsMap(roleIds);
    const unique = new Map<number, AuthorizationPermissionSummary>();
    for (const permissions of permissionMap.values()) {
      for (const permission of permissions) {
        unique.set(permission.id, permission);
      }
    }

    return Array.from(unique.values());
  }

  getFallbackRoleCodes(identity: AuthenticatedIdentity): readonly string[] {
    return (
      COMPATIBILITY_ROLE_FALLBACK_ROLE_CODES[identity.compatibilityRole] ?? []
    );
  }
}

export const authorizationRepository = new AuthorizationRepository();
