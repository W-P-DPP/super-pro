import { jest } from '@jest/globals'
import type { UserSummaryDto } from '@super-pro/shared-types'
import type {
  CreateTodoEntityInput,
  TodoListItemRepositoryRecord,
  TodoRepositoryPort,
  UpdateTodoEntityInput,
} from '../../src/todo/todo.repository.ts'
import { TodoEntity } from '../../src/todo/todo.entity.ts'
import {
  TodoBusinessError,
  TodoService,
} from '../../src/todo/todo.service.ts'

function cloneTodo(todo: TodoEntity): TodoEntity {
  return Object.assign(new TodoEntity(), todo)
}

function cloneUser(user: UserSummaryDto): UserSummaryDto {
  return { ...user }
}

function createRepositoryMock(
  records: TodoEntity[],
  users: UserSummaryDto[],
): TodoRepositoryPort {
  return {
    async getTodoList(query) {
      const keyword = typeof query.keyword === 'string' ? query.keyword.toLowerCase() : ''
      const status = typeof query.status === 'string' ? query.status : undefined
      const priority = typeof query.priority === 'string' ? query.priority : undefined
      const assigneeKeyword =
        typeof query.assigneeKeyword === 'string' ? query.assigneeKeyword.toLowerCase() : ''

      const items: TodoListItemRepositoryRecord[] = records
        .map((record) => ({
          entity: cloneTodo(record),
          assignee:
            users.find((user) => user.id === record.assigneeUserId) ?? null,
        }))
        .filter(({ entity, assignee }) => {
          const haystack = `${entity.title} ${entity.description ?? ''}`.toLowerCase()
          const assigneeHaystack = `${assignee?.username ?? ''} ${assignee?.nickname ?? ''}`.toLowerCase()

          return (
            (!keyword || haystack.includes(keyword)) &&
            (!status || entity.status === status) &&
            (!priority || entity.priority === priority) &&
            (!assigneeKeyword || assigneeHaystack.includes(assigneeKeyword))
          )
        })

      return {
        items,
        total: items.length,
        page: 1,
        pageSize: query.pageSize ?? 10,
      }
    },
    async getTodoById(id) {
      const current = records.find((record) => record.id === id)
      return current ? cloneTodo(current) : null
    },
    async getTodoDetailById(id) {
      const current = records.find((record) => record.id === id)
      if (!current) {
        return null
      }

      return {
        entity: cloneTodo(current),
        assignee: users.find((user) => user.id === current.assigneeUserId) ?? null,
      }
    },
    async createTodo(input: CreateTodoEntityInput) {
      return Object.assign(new TodoEntity(), {
        id: 99,
        title: input.title,
        description: input.description ?? '',
        status: input.status,
        priority: input.priority,
        assigneeUserId: input.assigneeUserId,
        dueAt: input.dueAt,
        remark: input.remark,
      })
    },
    async updateTodo(id: number, input: UpdateTodoEntityInput) {
      const current = records.find((record) => record.id === id)
      if (!current) {
        return null
      }

      return Object.assign(new TodoEntity(), current, input)
    },
    async deleteTodo(id: number) {
      const current = records.find((record) => record.id === id)
      return current ? cloneTodo(current) : null
    },
    async getActiveUserById(id: number) {
      const current = users.find((user) => user.id === id && user.status === 1)
      return current ? cloneUser(current) : null
    },
  }
}

function createService(records: TodoEntity[], users: UserSummaryDto[]) {
  return new TodoService(createRepositoryMock(records, users))
}

describe('TodoService', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  const activeUsers: UserSummaryDto[] = [
    {
      id: 1,
      username: 'zhangsan',
      nickname: '张三',
      status: 1,
    },
    {
      id: 2,
      username: 'lisi',
      nickname: '李四',
      status: 1,
    },
  ]

  const todoRecords = [
    Object.assign(new TodoEntity(), {
      id: 1,
      title: '整理权限矩阵',
      description: '补齐 admin-console 新权限',
      status: 'pending_review',
      priority: 'high',
      assigneeUserId: 1,
      dueAt: '2026-06-20 10:00:00',
      createTime: '2026-06-09 09:00:00',
      updateTime: '2026-06-09 09:00:00',
    }),
    Object.assign(new TodoEntity(), {
      id: 2,
      title: '联调待办接口',
      description: '和前端联调 CRUD',
      status: 'in_progress',
      priority: 'medium',
      assigneeUserId: 2,
      dueAt: undefined,
      createTime: '2026-06-09 10:00:00',
      updateTime: '2026-06-09 10:30:00',
    }),
  ]

  it('creates todo with pending_review as default status', async () => {
    const service = createService(todoRecords, activeUsers)

    const result = await service.createTodo({
      title: '新增待办页',
      description: '落地前后端 todo 模块',
      status: 'completed',
      priority: 'medium',
      assigneeUserId: 1,
      dueAt: '2026-06-30 18:00:00',
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: 99,
        title: '新增待办页',
        status: 'pending_review',
        priority: 'medium',
        assigneeUserId: 1,
      }),
    )
  })

  it('rejects invalid todo status on update', async () => {
    const service = createService(todoRecords, activeUsers)

    await expect(
      service.updateTodo(1, {
        status: 'archived',
      }),
    ).rejects.toMatchObject<Partial<TodoBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'status',
      }),
    })
  })

  it('rejects invalid todo priority', async () => {
    const service = createService(todoRecords, activeUsers)

    await expect(
      service.createTodo({
        title: '错误优先级任务',
        priority: 'urgent',
        assigneeUserId: 1,
      }),
    ).rejects.toMatchObject<Partial<TodoBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'priority',
      }),
    })
  })

  it('rejects disabled or missing assignee users', async () => {
    const service = createService(todoRecords, activeUsers)

    await expect(
      service.createTodo({
        title: '错误负责人任务',
        priority: 'low',
        assigneeUserId: 999,
      }),
    ).rejects.toMatchObject<Partial<TodoBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'assigneeUserId',
      }),
    })
  })

  it('supports filtered todo list queries', async () => {
    const service = createService(todoRecords, activeUsers)

    const result = await service.getTodoList({
      status: 'in_progress',
      priority: 'medium',
      assigneeKeyword: '李四',
      page: '1',
      pageSize: '5',
    })

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 2,
          title: '联调待办接口',
          status: 'in_progress',
          priority: 'medium',
          assignee: expect.objectContaining({
            id: 2,
            nickname: '李四',
          }),
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 5,
    })
  })
})
