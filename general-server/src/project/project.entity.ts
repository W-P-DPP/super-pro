import { EntitySchema } from 'typeorm';
import { BaseEntity, BaseSchemaColumns } from '../../utils/entities/base.entity.ts';

export class ProjectEntity extends BaseEntity {
  id!: number
  projectName!: string
  projectCode!: string
}

export const ProjectEntitySchema = new EntitySchema<ProjectEntity>({
  name: 'Project',
  target: ProjectEntity,
  tableName: 'sys_project',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
      comment: '项目主键',
    },
    projectName: {
      name: 'project_name',
      type: String,
      length: 64,
      nullable: false,
      default: '',
      comment: '项目名称',
    },
    projectCode: {
      name: 'project_code',
      type: String,
      length: 64,
      nullable: false,
      default: '',
      comment: '项目编码',
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_sys_project_name',
      columns: ['projectName'],
    },
  ],
  uniques: [
    {
      name: 'uk_sys_project_code',
      columns: ['projectCode'],
    },
  ],
});
