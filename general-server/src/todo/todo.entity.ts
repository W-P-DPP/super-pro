import { BaseEntity, BaseSchemaColumns } from '@super-pro/shared-server';
import { EntitySchema } from 'typeorm';

export class TodoEntity extends BaseEntity {
  id!: number;
  title!: string;
  description!: string;
  status!: string;
  priority!: string;
  assigneeUserId!: number;
  dueAt?: Date | string | null;
}

export const TodoEntitySchema = new EntitySchema<TodoEntity>({
  name: 'Todo',
  target: TodoEntity,
  tableName: 'sys_todo',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
      comment: '待办主键',
    },
    title: {
      name: 'title',
      type: String,
      length: 128,
      nullable: false,
      default: '',
      comment: '待办标题',
    },
    description: {
      name: 'description',
      type: String,
      length: 1000,
      nullable: false,
      default: '',
      comment: '待办描述',
    },
    status: {
      name: 'status',
      type: String,
      length: 32,
      nullable: false,
      default: 'pending_review',
      comment: '待办状态',
    },
    priority: {
      name: 'priority',
      type: String,
      length: 16,
      nullable: false,
      default: 'medium',
      comment: '待办优先级',
    },
    assigneeUserId: {
      name: 'assignee_user_id',
      type: Number,
      nullable: false,
      comment: '负责人用户 ID',
    },
    dueAt: {
      name: 'due_at',
      type: 'datetime',
      nullable: true,
      default: null,
      comment: '截止时间',
    },
    ...BaseSchemaColumns,
  },
  indices: [
    {
      name: 'idx_sys_todo_status_priority',
      columns: ['status', 'priority'],
    },
    {
      name: 'idx_sys_todo_assignee_user_id',
      columns: ['assigneeUserId'],
    },
  ],
});
