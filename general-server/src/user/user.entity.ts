import { EntitySchema } from 'typeorm';
import { BaseEntity, BaseSchemaColumns } from '../../utils/entities/base.entity.ts';
import { UserRoleEnum } from './user.dto.ts';

export class UserEntity extends BaseEntity {
  id!: number
  username!: string
  nickname!: string
  email!: string
  phone!: string
  status!: number
  role!: UserRoleEnum
  passwordHash!: string
}

export const UserEntitySchema = new EntitySchema<UserEntity>({
  name: 'User',
  target: UserEntity,
  tableName: 'sys_user',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
      comment: '主键',
    },
    username: {
      name: 'username',
      type: String,
      length: 64,
      nullable: false,
      comment: '用户名',
    },
    nickname: {
      name: 'nickname',
      type: String,
      length: 64,
      nullable: false,
      default: '',
      comment: '用户昵称',
    },
    email: {
      name: 'email',
      type: String,
      length: 128,
      nullable: false,
      default: '',
      comment: '用户邮箱',
    },
    phone: {
      name: 'phone',
      type: String,
      length: 32,
      nullable: false,
      default: '',
      comment: '用户手机号',
    },
    status: {
      name: 'status',
      type: Number,
      nullable: false,
      default: 1,
      comment: '用户状态，1 启用，0 停用',
    },
    role: {
      name: 'role',
      type: String,
      length: 32,
      nullable: false,
      default: UserRoleEnum.Guest,
      comment: '用户角色',
    },
    passwordHash: {
      name: 'password_hash',
      type: String,
      length: 255,
      nullable: false,
      default: '',
      select: false,
      comment: '密码哈希',
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_sys_user_status',
      columns: ['status'],
    },
    {
      name: 'idx_sys_user_role',
      columns: ['role'],
    },
  ],
  uniques: [
    {
      name: 'uk_sys_user_username',
      columns: ['username'],
    },
  ],
});
