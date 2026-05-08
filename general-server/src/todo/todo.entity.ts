import { EntitySchema } from 'typeorm';
import { BaseEntity, BaseSchemaColumns } from '../../utils/entities/base.entity.ts';

export class TodoEntity extends BaseEntity {
  id!: number
  title!: string
  description!: string
  status!: number
}

export const TodoEntitySchema = new EntitySchema<TodoEntity>({
  name: 'Todo',
  target: TodoEntity,
  tableName: 'todo',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
      comment: '主键',
    },
    title: {
      name: 'title',
      type: String,
      length: 255,
      nullable: false,
      comment: '标题',
    },
    description: {
      name: 'description',
      type: 'text',
      nullable: true,
      comment: '描述',
    },
    status: {
      name: 'status',
      type: Number,
      nullable: false,
      default: 0,
      comment: '状态：0待审核 1待办 2已完成 3已取消 4审核失败',
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_todo_create_by',
      columns: ['createBy'],
    },
  ],
});
