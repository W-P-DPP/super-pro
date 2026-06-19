import { BaseEntity, BaseSchemaColumns } from '@super-pro/shared-server';
import { EntitySchema } from 'typeorm';
import type { GlobalConfigType } from '@super-pro/shared-types';

export class GlobalConfigEntity extends BaseEntity {
  id!: number;
  projectId!: number;
  configKey!: string;
  configName!: string;
  configType!: GlobalConfigType;
  configValue!: string;
  status!: number;
}

export const GlobalConfigEntitySchema = new EntitySchema<GlobalConfigEntity>({
  name: 'GlobalConfig',
  target: GlobalConfigEntity,
  tableName: 'sys_global_config',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
      comment: '全局配置主键',
    },
    projectId: {
      name: 'project_id',
      type: Number,
      nullable: false,
      comment: '所属项目 ID',
    },
    configKey: {
      name: 'config_key',
      type: String,
      length: 128,
      nullable: false,
      default: '',
      comment: '配置键',
    },
    configName: {
      name: 'config_name',
      type: String,
      length: 64,
      nullable: false,
      default: '',
      comment: '配置名称',
    },
    configType: {
      name: 'config_type',
      type: String,
      length: 16,
      nullable: false,
      default: 'text',
      comment: '配置类型',
    },
    configValue: {
      name: 'config_value',
      type: String,
      length: 1000,
      nullable: false,
      default: '',
      comment: '配置值',
    },
    status: {
      name: 'status',
      type: Number,
      nullable: false,
      default: 1,
      comment: '状态 0-冻结 1-正常',
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_sys_global_config_project_id',
      columns: ['projectId'],
    },
    {
      name: 'idx_sys_global_config_status',
      columns: ['status'],
    },
    {
      name: 'idx_sys_global_config_project_key',
      columns: ['projectId', 'configKey'],
    },
  ],
  uniques: [
    {
      name: 'uk_sys_global_config_project_key_delete',
      columns: ['projectId', 'configKey', 'deleteFlag'],
    },
  ],
});
