import { BaseEntity, BaseSchemaColumns } from '@super-pro/shared-server';
import { EntitySchema } from 'typeorm';

export class RoleEntity extends BaseEntity {
  id!: number;
  code!: string;
  name!: string;
  appCode!: string;
  status!: number;
  description!: string;
}

export class PermissionEntity extends BaseEntity {
  id!: number;
  code!: string;
  appCode!: string;
  status!: number;
  resourceType!: string;
  resourceCode!: string;
  action!: string;
  name!: string;
  description!: string;
}

export class UserRoleAssignmentEntity extends BaseEntity {
  id!: number;
  userId!: number;
  roleId!: number;
}

export class RolePermissionAssignmentEntity extends BaseEntity {
  id!: number;
  roleId!: number;
  permissionId!: number;
}

export const RoleEntitySchema = new EntitySchema<RoleEntity>({
  name: 'Role',
  target: RoleEntity,
  tableName: 'sys_role',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
    },
    code: {
      name: 'code',
      type: String,
      length: 128,
      nullable: false,
    },
    name: {
      name: 'name',
      type: String,
      length: 128,
      nullable: false,
    },
    appCode: {
      name: 'app_code',
      type: String,
      length: 64,
      nullable: false,
    },
    status: {
      name: 'status',
      type: Number,
      nullable: false,
      default: 1,
    },
    description: {
      name: 'description',
      type: String,
      length: 255,
      nullable: false,
      default: '',
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_sys_role_app_code',
      columns: ['appCode'],
    },
  ],
  uniques: [
    {
      name: 'uk_sys_role_code',
      columns: ['code'],
    },
  ],
});

export const PermissionEntitySchema = new EntitySchema<PermissionEntity>({
  name: 'Permission',
  target: PermissionEntity,
  tableName: 'sys_permission',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
    },
    code: {
      name: 'code',
      type: String,
      length: 128,
      nullable: false,
    },
    appCode: {
      name: 'app_code',
      type: String,
      length: 64,
      nullable: false,
    },
    status: {
      name: 'status',
      type: Number,
      nullable: false,
      default: 1,
    },
    resourceType: {
      name: 'resource_type',
      type: String,
      length: 32,
      nullable: false,
    },
    resourceCode: {
      name: 'resource_code',
      type: String,
      length: 128,
      nullable: false,
    },
    action: {
      name: 'action',
      type: String,
      length: 32,
      nullable: false,
    },
    name: {
      name: 'name',
      type: String,
      length: 128,
      nullable: false,
    },
    description: {
      name: 'description',
      type: String,
      length: 255,
      nullable: false,
      default: '',
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_sys_permission_app_code',
      columns: ['appCode'],
    },
  ],
  uniques: [
    {
      name: 'uk_sys_permission_code',
      columns: ['code'],
    },
  ],
});

export const UserRoleAssignmentEntitySchema = new EntitySchema<UserRoleAssignmentEntity>({
  name: 'UserRoleAssignment',
  target: UserRoleAssignmentEntity,
  tableName: 'sys_user_role',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
    },
    userId: {
      name: 'user_id',
      type: Number,
      nullable: false,
    },
    roleId: {
      name: 'role_id',
      type: Number,
      nullable: false,
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_sys_user_role_user_id',
      columns: ['userId'],
    },
    {
      name: 'idx_sys_user_role_role_id',
      columns: ['roleId'],
    },
  ],
  uniques: [
    {
      name: 'uk_sys_user_role_user_role',
      columns: ['userId', 'roleId'],
    },
  ],
});

export const RolePermissionAssignmentEntitySchema = new EntitySchema<RolePermissionAssignmentEntity>({
  name: 'RolePermissionAssignment',
  target: RolePermissionAssignmentEntity,
  tableName: 'sys_role_permission',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
    },
    roleId: {
      name: 'role_id',
      type: Number,
      nullable: false,
    },
    permissionId: {
      name: 'permission_id',
      type: Number,
      nullable: false,
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_sys_role_permission_role_id',
      columns: ['roleId'],
    },
    {
      name: 'idx_sys_role_permission_permission_id',
      columns: ['permissionId'],
    },
  ],
  uniques: [
    {
      name: 'uk_sys_role_permission_role_permission',
      columns: ['roleId', 'permissionId'],
    },
  ],
});
