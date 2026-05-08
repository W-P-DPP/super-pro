import type { TodoEntity } from '../../src/todo/todo.entity.ts';
import { TodoStatus } from '../../src/todo/todo.dto.ts';
import type {
  CreateTodoEntityInput,
  TodoRepositoryPort,
  UpdateTodoEntityInput,
} from '../../src/todo/todo.repository.ts';
import { TodoBusinessError, TodoService } from '../../src/todo/todo.service.ts';
import { UserRoleEnum } from '../../src/user/user.dto.ts';

function createTodoEntity(overrides: Partial<TodoEntity> = {}): TodoEntity {
  return Object.assign(
    {
      id: 1,
      title: 'Todo',
      description: 'Description',
      status: TodoStatus.PENDING_REVIEW,
      createBy: 'tester',
      updateBy: 'tester',
      createTime: '2026-05-07T00:00:00.000Z',
      updateTime: '2026-05-07T00:00:00.000Z',
    },
    overrides,
  ) as TodoEntity;
}

function createRepositoryMock(initialRecords: TodoEntity[]): TodoRepositoryPort {
  const records = initialRecords.map((item) => ({ ...item }));
  let nextId = records.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  return {
    async findAll() {
      return records.map((item) => ({ ...item })) as TodoEntity[];
    },
    async findByStatus(status: number) {
      return records
        .filter((item) => item.status === status)
        .map((item) => ({ ...item })) as TodoEntity[];
    },
    async findByCreateBy(createBy: string) {
      return records
        .filter((item) => item.createBy === createBy)
        .map((item) => ({ ...item })) as TodoEntity[];
    },
    async findByCreateByAndStatus(createBy: string, status: number) {
      return records
        .filter((item) => item.createBy === createBy && item.status === status)
        .map((item) => ({ ...item })) as TodoEntity[];
    },
    async findById(id: number) {
      const current = records.find((item) => item.id === id);
      return current ? ({ ...current } as TodoEntity) : null;
    },
    async create(input: CreateTodoEntityInput) {
      const entity = createTodoEntity({
        id: nextId++,
        title: input.title,
        description: input.description ?? '',
        status: TodoStatus.PENDING_REVIEW,
        createBy: input.createBy,
        updateBy: input.updateBy,
      });
      records.push(entity);
      return { ...entity } as TodoEntity;
    },
    async update(id: number, input: UpdateTodoEntityInput) {
      const current = records.find((item) => item.id === id);
      if (!current) {
        return null;
      }

      if (input.title !== undefined) {
        current.title = input.title;
      }
      if (input.description !== undefined) {
        current.description = input.description;
      }
      current.updateBy = input.updateBy;
      return { ...current } as TodoEntity;
    },
    async updateStatus(id: number, status: number, updateBy: string) {
      const current = records.find((item) => item.id === id);
      if (!current) {
        return null;
      }

      current.status = status;
      current.updateBy = updateBy;
      return { ...current } as TodoEntity;
    },
    async delete(id: number) {
      const index = records.findIndex((item) => item.id === id);
      if (index === -1) {
        return null;
      }

      const [deleted] = records.splice(index, 1);
      return { ...deleted } as TodoEntity;
    },
  };
}

describe('todo service permissions', () => {
  it('creates todos in pending review status', async () => {
    const service = new TodoService(createRepositoryMock([]));

    const created = await service.createTodo(
      { username: 'tester' },
      { title: 'New todo', description: 'Description' },
    );

    expect(created.status).toBe(TodoStatus.PENDING_REVIEW);
  });

  it('allows owner to reject then approve a pending todo', async () => {
    const service = new TodoService(
      createRepositoryMock([createTodoEntity({ id: 10, status: TodoStatus.PENDING_REVIEW })]),
    );

    const rejected = await service.rejectTodo({ username: 'tester' }, 10);
    expect(rejected.status).toBe(TodoStatus.REVIEW_FAILED);

    const approved = await service.approveTodo({ username: 'tester' }, 10);
    expect(approved.status).toBe(TodoStatus.TODO);
  });

  it('allows admins to see all todos', async () => {
    const service = new TodoService(
      createRepositoryMock([
        createTodoEntity({ id: 11, createBy: 'owner-a', status: TodoStatus.PENDING_REVIEW }),
        createTodoEntity({ id: 12, createBy: 'owner-b', status: TodoStatus.TODO }),
      ]),
    );

    const list = await service.listTodos({ username: 'admin-user', role: UserRoleEnum.Admin });
    expect(list).toHaveLength(2);
  });

  it('allows admins to operate todos created by other users', async () => {
    const service = new TodoService(
      createRepositoryMock([
        createTodoEntity({
          id: 21,
          createBy: 'owner',
          updateBy: 'owner',
          status: TodoStatus.PENDING_REVIEW,
        }),
        createTodoEntity({
          id: 22,
          createBy: 'owner',
          updateBy: 'owner',
          status: TodoStatus.TODO,
        }),
        createTodoEntity({
          id: 23,
          createBy: 'owner',
          updateBy: 'owner',
          status: TodoStatus.COMPLETED,
        }),
      ]),
    );

    const approved = await service.approveTodo({ username: 'admin-user', role: UserRoleEnum.Admin }, 21);
    expect(approved.status).toBe(TodoStatus.TODO);

    const completed = await service.completeTodo({ username: 'admin-user', role: UserRoleEnum.Admin }, 22);
    expect(completed.status).toBe(TodoStatus.COMPLETED);

    const rolledBack = await service.rollbackTodo({ username: 'admin-user', role: UserRoleEnum.Admin }, 23);
    expect(rolledBack.status).toBe(TodoStatus.TODO);
  });

  it('keeps non-admin users restricted to their own todos', async () => {
    const service = new TodoService(
      createRepositoryMock([
        createTodoEntity({
          id: 31,
          createBy: 'owner',
          updateBy: 'owner',
          status: TodoStatus.TODO,
        }),
      ]),
    );

    await expect(
      service.completeTodo({ username: 'employee', role: UserRoleEnum.Employee }, 31),
    ).rejects.toBeInstanceOf(TodoBusinessError);
  });

  it('does not allow cancelling directly from todo status', async () => {
    const service = new TodoService(
      createRepositoryMock([createTodoEntity({ id: 40, status: TodoStatus.TODO })]),
    );

    await expect(service.cancelTodo({ username: 'tester' }, 40)).rejects.toBeInstanceOf(
      TodoBusinessError,
    );
  });
});
