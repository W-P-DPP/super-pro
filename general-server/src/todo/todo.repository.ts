import type { EntityManager, Repository } from 'typeorm';
import type {
  TodoListQueryDto,
  TodoPriority,
  TodoStatus,
  UserSummaryDto,
} from '@super-pro/shared-types';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import { UserEntity } from '../user/user.entity.ts';
import { TodoEntity } from './todo.entity.ts';

export interface CreateTodoEntityInput {
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TodoPriority;
  assigneeUserId: number;
  dueAt?: string | null;
  remark?: string;
}

export interface UpdateTodoEntityInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  assigneeUserId?: number;
  dueAt?: string | null;
  remark?: string;
}

export interface TodoDetailRepositoryRecord {
  entity: TodoEntity;
  assignee: UserSummaryDto | null;
}

export interface TodoListItemRepositoryRecord extends TodoDetailRepositoryRecord {}

export interface TodoListRepositoryResult {
  items: TodoListItemRepositoryRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TodoRepositoryPort {
  getTodoList(query: TodoListQueryDto): Promise<TodoListRepositoryResult>;
  getTodoById(id: number): Promise<TodoEntity | null>;
  getTodoDetailById(id: number): Promise<TodoDetailRepositoryRecord | null>;
  createTodo(input: CreateTodoEntityInput): Promise<TodoEntity | null>;
  updateTodo(id: number, input: UpdateTodoEntityInput): Promise<TodoEntity | null>;
  deleteTodo(id: number): Promise<TodoEntity | null>;
  getActiveUserById(id: number): Promise<UserSummaryDto | null>;
}

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

function mapAssigneeSummary(raw: Record<string, unknown>): UserSummaryDto | null {
  const id = Number(raw.assignee_id ?? 0);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  return {
    id,
    username: String(raw.assignee_username ?? ''),
    nickname: String(raw.assignee_nickname ?? ''),
    status: Number(raw.assignee_status ?? 0),
  };
}

export class TodoRepository implements TodoRepositoryPort {
  private async getRepository(manager?: EntityManager): Promise<Repository<TodoEntity>> {
    const dataSource = await ensureDataSource();

    if (!manager) {
      return dataSource.getRepository(TodoEntity);
    }

    return manager.getRepository(TodoEntity);
  }

  private createDetailQueryBuilder(repository: Repository<TodoEntity>) {
    return repository
      .createQueryBuilder('todo')
      .leftJoin(
        UserEntity,
        'assignee',
        'assignee.id = todo.assigneeUserId AND assignee.deleteFlag = :assigneeDeleteFlag',
        {
          assigneeDeleteFlag: 0,
        },
      )
      .select([
        'todo.id',
        'todo.title',
        'todo.description',
        'todo.status',
        'todo.priority',
        'todo.assigneeUserId',
        'todo.dueAt',
        'todo.createBy',
        'todo.createTime',
        'todo.updateBy',
        'todo.updateTime',
        'todo.remark',
        'assignee.id',
        'assignee.username',
        'assignee.nickname',
        'assignee.status',
      ])
      .where('todo.deleteFlag = :deleteFlag', { deleteFlag: 0 });
  }

  async getTodoList(query: TodoListQueryDto): Promise<TodoListRepositoryResult> {
    const repository = await this.getRepository();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const queryBuilder = this.createDetailQueryBuilder(repository);

    if (query.keyword) {
      queryBuilder.andWhere(
        '(todo.title LIKE :keyword OR todo.description LIKE :keyword)',
        {
          keyword: `%${query.keyword}%`,
        },
      );
    }

    if (query.status) {
      queryBuilder.andWhere('todo.status = :status', {
        status: query.status,
      });
    }

    if (query.priority) {
      queryBuilder.andWhere('todo.priority = :priority', {
        priority: query.priority,
      });
    }

    if (query.assigneeKeyword) {
      queryBuilder.andWhere(
        '(assignee.username LIKE :assigneeKeyword OR assignee.nickname LIKE :assigneeKeyword)',
        {
          assigneeKeyword: `%${query.assigneeKeyword}%`,
        },
      );
    }

    const total = await queryBuilder.getCount();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const items =
      total === 0
        ? []
        : await queryBuilder
            .clone()
            .orderBy('todo.updateTime', 'DESC')
            .addOrderBy('todo.id', 'DESC')
            .skip((currentPage - 1) * pageSize)
            .take(pageSize)
            .getRawAndEntities()
            .then(({ raw, entities }) =>
              entities.map((entity, index) => ({
                entity,
                assignee: mapAssigneeSummary(raw[index] ?? {}),
              })),
            );

    return {
      items,
      total,
      page: currentPage,
      pageSize,
    };
  }

  async getTodoById(id: number): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    return this.createDetailQueryBuilder(repository)
      .andWhere('todo.id = :id', { id })
      .getOne();
  }

  async getTodoDetailById(id: number): Promise<TodoDetailRepositoryRecord | null> {
    const repository = await this.getRepository();
    const result = await this.createDetailQueryBuilder(repository)
      .andWhere('todo.id = :id', { id })
      .getRawAndEntities();

    const entity = result.entities[0];
    if (!entity) {
      return null;
    }

    return {
      entity,
      assignee: mapAssigneeSummary(result.raw[0] ?? {}),
    };
  }

  async createTodo(input: CreateTodoEntityInput): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    const entity = repository.create({
      title: input.title,
      description: input.description ?? '',
      status: input.status,
      priority: input.priority,
      assigneeUserId: input.assigneeUserId,
      dueAt: input.dueAt ?? null,
      createBy: 'system',
      updateBy: 'system',
      ...(input.remark ? { remark: input.remark } : {}),
    });

    const saved = await repository.save(entity);
    return this.getTodoById(saved.id);
  }

  async updateTodo(id: number, input: UpdateTodoEntityInput): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({
      where: { id, deleteFlag: 0 },
    });

    if (!current) {
      return null;
    }

    if (input.title !== undefined) {
      current.title = input.title;
    }

    if (input.description !== undefined) {
      current.description = input.description;
    }

    if (input.status !== undefined) {
      current.status = input.status;
    }

    if (input.priority !== undefined) {
      current.priority = input.priority;
    }

    if (input.assigneeUserId !== undefined) {
      current.assigneeUserId = input.assigneeUserId;
    }

    if (Object.prototype.hasOwnProperty.call(input, 'dueAt')) {
      current.dueAt = input.dueAt ?? null;
    }

    if (input.remark !== undefined) {
      current.remark = input.remark;
    }

    current.updateBy = 'system';
    await repository.save(current);

    return this.getTodoById(id);
  }

  async deleteTodo(id: number): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({
      where: { id, deleteFlag: 0 },
    });

    if (!current) {
      return null;
    }

    current.deleteFlag = 1;
    current.updateBy = 'system';
    await repository.save(current);
    return current;
  }

  async getActiveUserById(id: number): Promise<UserSummaryDto | null> {
    const dataSource = await ensureDataSource();
    const repository = dataSource.getRepository(UserEntity);
    const assignee = await repository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.nickname',
        'user.status',
      ])
      .where('user.id = :id', { id })
      .andWhere('user.deleteFlag = :deleteFlag', { deleteFlag: 0 })
      .andWhere('user.status = :status', { status: 1 })
      .getOne();

    if (!assignee) {
      return null;
    }

    return {
      id: assignee.id,
      username: assignee.username,
      nickname: assignee.nickname,
      status: assignee.status,
    };
  }
}

export const todoRepository = new TodoRepository();
