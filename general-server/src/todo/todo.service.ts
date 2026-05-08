import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import { UserRoleEnum } from '../user/user.dto.ts';
import type {
  CreateTodoReq,
  TodoListResp,
  TodoResp,
  TodoValidationErrorContextDto,
  UpdateTodoReq,
} from './todo.dto.ts';
import { TodoStatus, TodoStatusTransitions } from './todo.dto.ts';
import type { TodoEntity } from './todo.entity.ts';
import {
  todoRepository,
  type TodoRepositoryPort,
} from './todo.repository.ts';

export class TodoBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: TodoValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'TodoBusinessError';
  }
}

type TodoJwtPayload = {
  username?: string
  role?: unknown
}

function ensurePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TodoBusinessError(
      '待办标识不合法',
      { nodePath: 'todo', field, reason: '待办标识必须为正整数', value },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value;
}

function validateTitle(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TodoBusinessError(
      '标题不能为空',
      { nodePath: 'todo', field: 'title', reason: '标题必须为非空字符串', value },
      HttpStatus.BAD_REQUEST,
    );
  }

  const trimmed = value.trim();
  if (trimmed.length > 255) {
    throw new TodoBusinessError(
      '标题长度不能超过 255 个字符',
      { nodePath: 'todo', field: 'title', reason: '标题长度超出限制', value: trimmed.length },
      HttpStatus.BAD_REQUEST,
    );
  }

  return trimmed;
}

function normalizeDescription(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new TodoBusinessError(
      '描述必须为字符串',
      { nodePath: 'todo', field: 'description', reason: '描述必须为字符串', value },
      HttpStatus.BAD_REQUEST,
    );
  }

  return value.trim();
}

function normalizeDateTime(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return undefined;
}

function toResponseDto(entity: TodoEntity): TodoResp {
  const createTime = normalizeDateTime(entity.createTime);
  const updateTime = normalizeDateTime(entity.updateTime);

  return {
    id: entity.id,
    title: entity.title,
    description: entity.description,
    status: entity.status as TodoStatus,
    ...(createTime ? { createTime } : {}),
    ...(updateTime ? { updateTime } : {}),
  };
}

function ensureEntityExists(entity: TodoEntity | null): TodoEntity {
  if (!entity) {
    throw new TodoBusinessError(
      '待办不存在',
      { nodePath: 'todo', field: 'id', reason: '未找到对应待办' },
      HttpStatus.NOT_FOUND,
    );
  }

  return entity;
}

function isAdminRole(role: unknown): boolean {
  return role === UserRoleEnum.Admin;
}

function extractUsername(reqJwtPayload: TodoJwtPayload | undefined): string {
  const username = reqJwtPayload?.username;
  if (!username) {
    throw new TodoBusinessError(
      '用户信息缺失',
      { nodePath: 'todo', field: 'username', reason: '无法获取当前用户标识' },
      HttpStatus.UNAUTHORIZED,
    );
  }

  return username;
}

function ensureOperationPermission(
  entity: TodoEntity | null,
  jwtPayload: TodoJwtPayload | undefined,
): TodoEntity {
  const username = extractUsername(jwtPayload);
  const current = ensureEntityExists(entity);

  if (current.createBy === username || isAdminRole(jwtPayload?.role)) {
    return current;
  }

  throw new TodoBusinessError(
    '无权操作该待办',
    { nodePath: 'todo', field: 'role', reason: '仅创建人或管理员可执行此操作' },
    HttpStatus.FORBIDDEN,
  );
}

function ensureStatusTransition(current: TodoEntity, targetStatus: TodoStatus): void {
  const allowed = TodoStatusTransitions[current.status as TodoStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new TodoBusinessError(
      '当前状态不允许执行该操作',
      {
        nodePath: 'todo',
        field: 'status',
        reason: `状态 ${current.status} 不可流转到 ${targetStatus}`,
        value: current.status,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class TodoService {
  constructor(private readonly repository: TodoRepositoryPort = todoRepository) {}

  async listTodos(jwtPayload: TodoJwtPayload, status?: number): Promise<TodoListResp> {
    const username = extractUsername(jwtPayload);
    const isAdmin = isAdminRole(jwtPayload?.role);

    const entities = isAdmin
      ? (status !== undefined
        ? await this.repository.findByStatus(status)
        : await this.repository.findAll())
      : (status !== undefined
        ? await this.repository.findByCreateByAndStatus(username, status)
        : await this.repository.findByCreateBy(username));

    return entities.map(toResponseDto);
  }

  async createTodo(
    jwtPayload: TodoJwtPayload,
    input: CreateTodoReq | Record<string, unknown>,
  ): Promise<TodoResp> {
    const username = extractUsername(jwtPayload);
    const raw = input as Record<string, unknown>;
    const title = validateTitle(raw.title);
    const description = normalizeDescription(raw.description);

    const created = await this.repository.create({
      title,
      description,
      createBy: username,
      updateBy: username,
    });

    if (!created) {
      throw new TodoBusinessError(
        '创建待办失败',
        { nodePath: 'todo', field: 'create', reason: '创建待办时仓储返回空结果' },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(created);
  }

  async updateTodo(
    jwtPayload: TodoJwtPayload,
    id: number,
    input: UpdateTodoReq | Record<string, unknown>,
  ): Promise<TodoResp> {
    const username = extractUsername(jwtPayload);
    const targetId = ensurePositiveInteger(id, 'id');
    ensureOperationPermission(await this.repository.findById(targetId), jwtPayload);

    const raw = input as Record<string, unknown>;
    const updateData: { title?: string; description?: string; updateBy: string } = {
      updateBy: username,
    };

    if (Object.prototype.hasOwnProperty.call(raw, 'title') && raw.title !== undefined) {
      updateData.title = validateTitle(raw.title);
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'description') && raw.description !== undefined) {
      updateData.description = normalizeDescription(raw.description);
    }

    const updated = await this.repository.update(targetId, updateData);
    if (!updated) {
      throw new TodoBusinessError(
        '更新待办失败',
        { nodePath: 'todo', field: 'update', reason: '更新待办时仓储返回空结果', value: id },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(updated);
  }

  async approveTodo(jwtPayload: TodoJwtPayload, id: number): Promise<TodoResp> {
    const username = extractUsername(jwtPayload);
    const targetId = ensurePositiveInteger(id, 'id');
    const entity = ensureOperationPermission(await this.repository.findById(targetId), jwtPayload);
    ensureStatusTransition(entity, TodoStatus.TODO);

    const result = await this.repository.updateStatus(targetId, TodoStatus.TODO, username);
    if (!result) {
      throw new TodoBusinessError(
        '审核通过失败',
        { nodePath: 'todo', field: 'approve', reason: '审核通过时仓储返回空结果' },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(result);
  }

  async rejectTodo(jwtPayload: TodoJwtPayload, id: number): Promise<TodoResp> {
    const username = extractUsername(jwtPayload);
    const targetId = ensurePositiveInteger(id, 'id');
    const entity = ensureOperationPermission(await this.repository.findById(targetId), jwtPayload);
    ensureStatusTransition(entity, TodoStatus.REVIEW_FAILED);

    const result = await this.repository.updateStatus(targetId, TodoStatus.REVIEW_FAILED, username);
    if (!result) {
      throw new TodoBusinessError(
        '审核驳回失败',
        { nodePath: 'todo', field: 'reject', reason: '审核驳回时仓储返回空结果' },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(result);
  }

  async completeTodo(jwtPayload: TodoJwtPayload, id: number): Promise<TodoResp> {
    const username = extractUsername(jwtPayload);
    const targetId = ensurePositiveInteger(id, 'id');
    const entity = ensureOperationPermission(await this.repository.findById(targetId), jwtPayload);
    ensureStatusTransition(entity, TodoStatus.COMPLETED);

    const result = await this.repository.updateStatus(targetId, TodoStatus.COMPLETED, username);
    if (!result) {
      throw new TodoBusinessError(
        '完成待办失败',
        { nodePath: 'todo', field: 'complete', reason: '完成待办时仓储返回空结果' },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(result);
  }

  async cancelTodo(jwtPayload: TodoJwtPayload, id: number): Promise<TodoResp> {
    const username = extractUsername(jwtPayload);
    const targetId = ensurePositiveInteger(id, 'id');
    const entity = ensureOperationPermission(await this.repository.findById(targetId), jwtPayload);
    ensureStatusTransition(entity, TodoStatus.CANCELLED);

    const result = await this.repository.updateStatus(targetId, TodoStatus.CANCELLED, username);
    if (!result) {
      throw new TodoBusinessError(
        '取消待办失败',
        { nodePath: 'todo', field: 'cancel', reason: '取消待办时仓储返回空结果' },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(result);
  }

  async rollbackTodo(jwtPayload: TodoJwtPayload, id: number): Promise<TodoResp> {
    const username = extractUsername(jwtPayload);
    const targetId = ensurePositiveInteger(id, 'id');
    const entity = ensureOperationPermission(await this.repository.findById(targetId), jwtPayload);
    ensureStatusTransition(entity, TodoStatus.TODO);

    const result = await this.repository.updateStatus(targetId, TodoStatus.TODO, username);
    if (!result) {
      throw new TodoBusinessError(
        '回退待办失败',
        { nodePath: 'todo', field: 'rollback', reason: '回退待办时仓储返回空结果' },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(result);
  }

  async deleteTodo(
    jwtPayload: TodoJwtPayload,
    id: number,
  ): Promise<TodoResp> {
    ensurePositiveInteger(id, 'id');
    ensureOperationPermission(await this.repository.findById(id), jwtPayload);

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new TodoBusinessError(
        '删除待办失败',
        { nodePath: 'todo', field: 'delete', reason: '删除待办时仓储返回空结果', value: id },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(deleted);
  }
}

export const todoService = new TodoService();
