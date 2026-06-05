import type { EntityManager, Repository } from 'typeorm';
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
  RoleProjectAssignmentEntity,
  UserRoleAssignmentEntity,
} from './authorization.entity.ts';
import { ProjectEntity } from '../project/project.entity.ts';

export interface AuthorizationProjectSummary {
  id: number;
  projectCode: string;
  projectName: string;
}

export interface CreateRoleEntityInput {
  code: string;
  name: string;
  status: number;
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
  status?: number;
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
  getRoleMemberCounts(roleIds: number[]): Promise<Map<number, number>>;
  createPermission(input: CreatePermissionEntityInput): Promise<AuthorizationPermissionSummary>;
  updatePermission(
    id: number,
    input: UpdatePermissionEntityInput,
  ): Promise<AuthorizationPermissionSummary | null>;
  deletePermission(id: number): Promise<AuthorizationPermissionSummary | null>;
  createRole(input: CreateRoleEntityInput): Promise<AuthorizationRoleSummary>;
  updateRole(id: number, input: UpdateRoleEntityInput): Promise<AuthorizationRoleSummary | null>;
  deleteRole(id: number): Promise<AuthorizationRoleSummary | null>;
  replaceRolePermissionAssignments(roleId: number, permissionIds: number[]): Promise<void>;
  replaceUserRoleAssignments(userId: number, roleIds: number[]): Promise<void>;
  clearUserRoleAssignments(userId: number): Promise<void>;
  getAssignedRolesByUserIds(userIds: number[]): Promise<Map<number, AuthorizationRoleSummary[]>>;
  getProjectSummariesByRoleIdsMap(
    roleIds: number[],
  ): Promise<Map<number, AuthorizationProjectSummary[]>>;
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
    status: entity.status,
    ...(entity.updateTime ? { updateTime: String(entity.updateTime) } : {}),
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
  private seedInitialized = false;

  private async getRoleRepository(manager?: EntityManager): Promise<Repository<RoleEntity>> {
    const dataSource = await ensureDataSource();
    return manager ? manager.getRepository(RoleEntity) : dataSource.getRepository(RoleEntity);
  }

  private createRoleDetailQueryBuilder(repository: Repository<RoleEntity>) {
    return repository
      .createQueryBuilder('role')
      .select([
        'role.id',
        'role.code',
        'role.name',
        'role.status',
        'role.description',
        'role.updateTime',
      ])
      .where('role.deleteFlag = :deleteFlag', { deleteFlag: 0 });
  }

  private async getPermissionRepository(
    manager?: EntityManager,
  ): Promise<Repository<PermissionEntity>> {
    const dataSource = await ensureDataSource();
    return manager
      ? manager.getRepository(PermissionEntity)
      : dataSource.getRepository(PermissionEntity);
  }

  private createPermissionDetailQueryBuilder(repository: Repository<PermissionEntity>) {
    return repository
      .createQueryBuilder('permission')
      .select([
        'permission.id',
        'permission.code',
        'permission.appCode',
        'permission.status',
        'permission.resourceType',
        'permission.resourceCode',
        'permission.action',
        'permission.name',
        'permission.description',
        'permission.updateTime',
      ])
      .where('permission.deleteFlag = :deleteFlag', { deleteFlag: 0 });
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

  private async getRoleProjectRepository(
    manager?: EntityManager,
  ): Promise<Repository<RoleProjectAssignmentEntity>> {
    const dataSource = await ensureDataSource();
    return manager
      ? manager.getRepository(RoleProjectAssignmentEntity)
      : dataSource.getRepository(RoleProjectAssignmentEntity);
  }

  private async syncRoleProjectAssignments(
    roleIds: number[],
    manager?: EntityManager,
  ): Promise<void> {
    if (roleIds.length === 0) {
      return;
    }

    const dataSource = await ensureDataSource();
    const roleProjectRepository = await this.getRoleProjectRepository(manager);
    const rolePermissionRepository = manager
      ? manager.getRepository(RolePermissionAssignmentEntity)
      : dataSource.getRepository(RolePermissionAssignmentEntity);

    await roleProjectRepository
      .createQueryBuilder()
      .delete()
      .from(RoleProjectAssignmentEntity)
      .where('role_id IN (:...roleIds)', { roleIds })
      .execute();

    const rows = await rolePermissionRepository
      .createQueryBuilder('rolePermission')
      .innerJoin(
        PermissionEntity,
        'permission',
        'permission.id = rolePermission.permission_id AND permission.delete_flag = :permissionDeleteFlag',
        { permissionDeleteFlag: 0 },
      )
      .innerJoin(
        ProjectEntity,
        'project',
        'project.project_code = permission.app_code AND project.delete_flag = :projectDeleteFlag',
        { projectDeleteFlag: 0 },
      )
      .where('rolePermission.role_id IN (:...roleIds)', { roleIds })
      .andWhere('rolePermission.delete_flag = :rolePermissionDeleteFlag', {
        rolePermissionDeleteFlag: 0,
      })
      .select('rolePermission.roleId', 'roleId')
      .addSelect('project.id', 'projectId')
      .distinct(true)
      .orderBy('rolePermission.roleId', 'ASC')
      .addOrderBy('project.id', 'ASC')
      .getRawMany<{ roleId: number; projectId: number }>();

    if (rows.length === 0) {
      return;
    }

    const entities = rows.map((row) =>
      roleProjectRepository.create({
        roleId: Number(row.roleId),
        projectId: Number(row.projectId),
        createBy: 'system',
        updateBy: 'system',
      }),
    );
    await roleProjectRepository.save(entities);
  }

  async ensureSeedData(): Promise<void> {
    if (this.seedInitialized) {
      return;
    }

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
          if (permissionByCode.has(seed.code)) {
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
          if (roleByCode.has(seed.code)) {
            continue;
          }

          const created = roleRepository.create({
            code: seed.code,
            name: seed.name,
            status: 1,
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

        await this.syncRoleProjectAssignments(
          latestRoles.map((item) => item.id),
          manager,
        );
      });

      this.seedInitialized = true;
    })().finally(() => {
      this.seedPromise = null;
    });

    return this.seedPromise;
  }

  async listPermissions(appCode?: string): Promise<AuthorizationPermissionSummary[]> {
    const repository = await this.getPermissionRepository();
    const queryBuilder = this.createPermissionDetailQueryBuilder(repository)
      .orderBy('permission.appCode', 'ASC')
      .addOrderBy('permission.resourceCode', 'ASC')
      .addOrderBy('permission.action', 'ASC')
      .addOrderBy('permission.id', 'ASC');

    if (appCode) {
      queryBuilder.andWhere('permission.appCode = :appCode', { appCode });
    }

    const entities = await queryBuilder.getMany();

    return entities.map(toPermissionSummary);
  }

  async getPermissionsByIds(ids: number[]): Promise<AuthorizationPermissionSummary[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getPermissionRepository();
    const entities = await this.createPermissionDetailQueryBuilder(repository)
      .andWhere('permission.id IN (:...ids)', { ids })
      .orderBy('permission.id', 'ASC')
      .getMany();
    return entities.map(toPermissionSummary);
  }

  async getPermissionByCode(code: string): Promise<AuthorizationPermissionSummary | null> {
    const repository = await this.getPermissionRepository();
    const entity = await this.createPermissionDetailQueryBuilder(repository)
      .andWhere('permission.code = :code', { code })
      .getOne();

    return entity ? toPermissionSummary(entity) : null;
  }

  async listRoles(appCode?: string): Promise<AuthorizationRoleSummary[]> {
    const repository = await this.getRoleRepository();
    const queryBuilder = this.createRoleDetailQueryBuilder(repository)
      .orderBy('role.code', 'ASC')
      .addOrderBy('role.id', 'ASC');

    if (appCode) {
      queryBuilder
        .innerJoin(
          RolePermissionAssignmentEntity,
          'rolePermission',
          'rolePermission.role_id = role.id AND rolePermission.delete_flag = :rolePermissionDeleteFlag',
          { rolePermissionDeleteFlag: 0 },
        )
        .innerJoin(
          PermissionEntity,
          'permission',
          'permission.id = rolePermission.permission_id AND permission.delete_flag = :permissionDeleteFlag',
          { permissionDeleteFlag: 0 },
        )
        .andWhere('permission.app_code = :appCode', { appCode })
        .distinct(true);
    }

    const entities = await queryBuilder.getMany();

    return entities.map(toRoleSummary);
  }

  async getRolesByIds(ids: number[]): Promise<AuthorizationRoleSummary[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRoleRepository();
    const entities = await this.createRoleDetailQueryBuilder(repository)
      .andWhere('role.id IN (:...ids)', { ids })
      .orderBy('role.id', 'ASC')
      .getMany();
    return entities.map(toRoleSummary);
  }

  async getRolesByCodes(codes: readonly string[]): Promise<AuthorizationRoleSummary[]> {
    if (codes.length === 0) {
      return [];
    }

    const repository = await this.getRoleRepository();
    const entities = await this.createRoleDetailQueryBuilder(repository)
      .andWhere('role.code IN (:...codes)', { codes })
      .orderBy('role.id', 'ASC')
      .getMany();
    return entities.map(toRoleSummary);
  }

  async getRoleMemberCounts(roleIds: number[]): Promise<Map<number, number>> {
    const result = new Map<number, number>();
    if (roleIds.length === 0) {
      return result;
    }

    const repository = await this.getUserRoleRepository();
    const rows = await repository
      .createQueryBuilder('userRole')
      .select('userRole.roleId', 'roleId')
      .addSelect('COUNT(1)', 'memberCount')
      .where('userRole.roleId IN (:...roleIds)', { roleIds })
      .groupBy('userRole.roleId')
      .getRawMany<{ roleId: number; memberCount: string }>();

    for (const row of rows) {
      result.set(Number(row.roleId), Number(row.memberCount));
    }

    return result;
  }

  async createRole(input: CreateRoleEntityInput): Promise<AuthorizationRoleSummary> {
    const repository = await this.getRoleRepository();
    const entity = repository.create({
      code: input.code,
      name: input.name,
      status: input.status,
      description: input.description,
      createBy: 'system',
      updateBy: 'system',
    });
    const saved = await repository.save(entity);
    const detail = await this.createRoleDetailQueryBuilder(repository)
      .andWhere('role.id = :id', { id: saved.id })
      .getOne();
    return toRoleSummary(detail ?? saved);
  }

  async createPermission(
    input: CreatePermissionEntityInput,
  ): Promise<AuthorizationPermissionSummary> {
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
    const detail = await this.createPermissionDetailQueryBuilder(repository)
      .andWhere('permission.id = :id', { id: saved.id })
      .getOne();
    return toPermissionSummary(detail ?? saved);
  }

  async updateRole(
    id: number,
    input: UpdateRoleEntityInput,
  ): Promise<AuthorizationRoleSummary | null> {
    const repository = await this.getRoleRepository();
    const current = await repository.findOne({
      where: { id, deleteFlag: 0 },
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
    if (input.status !== undefined) {
      current.status = input.status;
    }
    if (input.description !== undefined) {
      current.description = input.description;
    }
    current.updateBy = 'system';

    await repository.save(current);
    const detail = await this.createRoleDetailQueryBuilder(repository)
      .andWhere('role.id = :id', { id })
      .getOne();
    return detail ? toRoleSummary(detail) : null;
  }

  async deleteRole(id: number): Promise<AuthorizationRoleSummary | null> {
    const dataSource = await ensureDataSource();

    return dataSource.transaction(async (manager) => {
      const roleRepository = await this.getRoleRepository(manager);
      const rolePermissionRepository = await this.getRolePermissionRepository(manager);
      const roleProjectRepository = await this.getRoleProjectRepository(manager);
      const userRoleRepository = await this.getUserRoleRepository(manager);
      const current = await roleRepository.findOne({
        where: { id, deleteFlag: 0 },
      });

      if (!current) {
        return null;
      }

      await rolePermissionRepository.delete({ roleId: id });
      await roleProjectRepository.delete({ roleId: id });
      await userRoleRepository.delete({ roleId: id });
      current.deleteFlag = 1;
      current.updateBy = 'system';
      const saved = await roleRepository.save(current);
      return toRoleSummary(saved);
    });
  }

  async updatePermission(
    id: number,
    input: UpdatePermissionEntityInput,
  ): Promise<AuthorizationPermissionSummary | null> {
    const dataSource = await ensureDataSource();

    return dataSource.transaction(async (manager) => {
      const repository = await this.getPermissionRepository(manager);
      const rolePermissionRepository = await this.getRolePermissionRepository(manager);
      const current = await repository.findOne({
        where: { id, deleteFlag: 0 },
      });

      if (!current) {
        return null;
      }

      const affectedRoleRows = await rolePermissionRepository
        .createQueryBuilder('rolePermission')
        .select('rolePermission.roleId', 'roleId')
        .where('rolePermission.permission_id = :permissionId', { permissionId: id })
        .andWhere('rolePermission.delete_flag = :rolePermissionDeleteFlag', {
          rolePermissionDeleteFlag: 0,
        })
        .distinct(true)
        .getRawMany<{ roleId: number }>();

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

      await repository.save(current);
      await this.syncRoleProjectAssignments(
        affectedRoleRows.map((row) => Number(row.roleId)),
        manager,
      );
      const detail = await this.createPermissionDetailQueryBuilder(repository)
        .andWhere('permission.id = :id', { id })
        .getOne();
      return detail ? toPermissionSummary(detail) : null;
    });
  }

  async deletePermission(id: number): Promise<AuthorizationPermissionSummary | null> {
    const dataSource = await ensureDataSource();

    return dataSource.transaction(async (manager) => {
      const permissionRepository = await this.getPermissionRepository(manager);
      const rolePermissionRepository = await this.getRolePermissionRepository(manager);
      const current = await permissionRepository.findOne({
        where: { id, deleteFlag: 0 },
      });

      if (!current) {
        return null;
      }

      const affectedRoleRows = await rolePermissionRepository
        .createQueryBuilder('rolePermission')
        .select('rolePermission.roleId', 'roleId')
        .where('rolePermission.permission_id = :permissionId', { permissionId: id })
        .andWhere('rolePermission.delete_flag = :rolePermissionDeleteFlag', {
          rolePermissionDeleteFlag: 0,
        })
        .distinct(true)
        .getRawMany<{ roleId: number }>();

      await rolePermissionRepository.delete({ permissionId: id });
      current.deleteFlag = 1;
      current.updateBy = 'system';
      const saved = await permissionRepository.save(current);
      await this.syncRoleProjectAssignments(
        affectedRoleRows.map((row) => Number(row.roleId)),
        manager,
      );
      return toPermissionSummary(saved);
    });
  }

  async replaceRolePermissionAssignments(
    roleId: number,
    permissionIds: number[],
  ): Promise<void> {
    const dataSource = await ensureDataSource();

    await dataSource.transaction(async (manager) => {
      const repository = await this.getRolePermissionRepository(manager);
      await repository.delete({ roleId });

      if (permissionIds.length > 0) {
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

      await this.syncRoleProjectAssignments([roleId], manager);
    });
  }

  async replaceUserRoleAssignments(userId: number, roleIds: number[]): Promise<void> {
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
    const repository = await this.getUserRoleRepository();
    await repository.delete({ userId });
  }

  async getAssignedRolesByUserIds(
    userIds: number[],
  ): Promise<Map<number, AuthorizationRoleSummary[]>> {
    const result = new Map<number, AuthorizationRoleSummary[]>();
    if (userIds.length === 0) {
      return result;
    }

    const dataSource = await ensureDataSource();
    const rows = (await dataSource
      .getRepository(UserRoleAssignmentEntity)
      .createQueryBuilder('userRole')
      .innerJoin(
        RoleEntity,
        'role',
        'role.id = userRole.role_id AND role.delete_flag = :roleDeleteFlag',
        { roleDeleteFlag: 0 },
      )
      .where('userRole.user_id IN (:...userIds)', { userIds })
      .andWhere('userRole.delete_flag = :userRoleDeleteFlag', { userRoleDeleteFlag: 0 })
      .select([
        'userRole.userId AS userId',
        'role.id AS id',
        'role.code AS code',
        'role.name AS name',
        'role.description AS description',
      ])
      .orderBy('role.id', 'ASC')
      .getRawMany()) as Array<{
      userId: number;
      id: number;
      code: string;
      name: string;
      description: string;
    }>;

    for (const row of rows) {
      const current = result.get(row.userId) ?? [];
      current.push({
        id: row.id,
        code: row.code,
        name: row.name,
        ...(row.description ? { description: row.description } : {}),
      });
      result.set(row.userId, current);
    }

    return result;
  }

  async getProjectSummariesByRoleIdsMap(
    roleIds: number[],
  ): Promise<Map<number, AuthorizationProjectSummary[]>> {
    const result = new Map<number, AuthorizationProjectSummary[]>();
    if (roleIds.length === 0) {
      return result;
    }

    const dataSource = await ensureDataSource();
    const rows = (await dataSource
      .getRepository(RoleProjectAssignmentEntity)
      .createQueryBuilder('roleProject')
      .innerJoin(
        ProjectEntity,
        'project',
        'project.id = roleProject.project_id AND project.delete_flag = :projectDeleteFlag',
        { projectDeleteFlag: 0 },
      )
      .where('roleProject.role_id IN (:...roleIds)', { roleIds })
      .andWhere('roleProject.delete_flag = :roleProjectDeleteFlag', {
        roleProjectDeleteFlag: 0,
      })
      .select([
        'roleProject.roleId AS roleId',
        'project.id AS id',
        'project.projectCode AS projectCode',
        'project.projectName AS projectName',
      ])
      .orderBy('project.project_code', 'ASC')
      .addOrderBy('project.id', 'ASC')
      .getRawMany()) as Array<{
      roleId: number;
      id: number;
      projectCode: string;
      projectName: string;
    }>;

    for (const row of rows) {
      const current = result.get(row.roleId) ?? [];
      if (current.some((item) => item.id === row.id)) {
        continue;
      }

      current.push({
        id: row.id,
        projectCode: row.projectCode,
        projectName: row.projectName,
      });
      result.set(row.roleId, current);
    }

    return result;
  }

  async getPermissionSummariesByRoleIdsMap(
    roleIds: number[],
  ): Promise<Map<number, AuthorizationPermissionSummary[]>> {
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
        'permission.id = rolePermission.permission_id AND permission.delete_flag = :permissionDeleteFlag',
        { permissionDeleteFlag: 0 },
      )
      .where('rolePermission.role_id IN (:...roleIds)', { roleIds })
      .andWhere('rolePermission.delete_flag = :rolePermissionDeleteFlag', {
        rolePermissionDeleteFlag: 0,
      })
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
