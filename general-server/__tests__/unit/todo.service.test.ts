import { jest } from '@jest/globals'
import type { SubmitSuggestionRequestDto } from '@super-pro/shared-types'
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

type ProjectSummary = {
  id: number
  projectName: string
  projectCode: string
}

function cloneTodo(todo: TodoEntity): TodoEntity {
  return Object.assign(new TodoEntity(), todo)
}

function cloneProject(project: ProjectSummary): ProjectSummary {
  return { ...project }
}

function createRepositoryMock(
  records: TodoEntity[],
  projects: ProjectSummary[],
): TodoRepositoryPort {
  return {
    async getTodoList(query) {
      const keyword = typeof query.keyword === 'string' ? query.keyword.toLowerCase() : ''
      const status = typeof query.status === 'string' ? query.status : undefined
      const priority = typeof query.priority === 'string' ? query.priority : undefined
      const projectId = typeof query.projectId === 'number' ? query.projectId : undefined

      const items: TodoListItemRepositoryRecord[] = records
        .map((record) => ({
          entity: cloneTodo(record),
          project:
            projects.find((project) => project.id === record.projectId) ?? null,
        }))
        .filter(({ entity }) => {
          const haystack = `${entity.title} ${entity.description ?? ''}`.toLowerCase()

          return (
            (!keyword || haystack.includes(keyword)) &&
            (!status || entity.status === status) &&
            (!priority || entity.priority === priority) &&
            (!projectId || entity.projectId === projectId)
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
        project: projects.find((project) => project.id === current.projectId) ?? null,
      }
    },
    async createTodo(input: CreateTodoEntityInput) {
      return Object.assign(new TodoEntity(), {
        id: 99,
        title: input.title,
        description: input.description ?? '',
        status: input.status,
        priority: input.priority,
        projectId: input.projectId,
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
    async getProjectById(id: number) {
      const current = projects.find((project) => project.id === id)
      return current ? cloneProject(current) : null
    },
    async getProjectByCode(projectCode: string) {
      const current = projects.find((project) => project.projectCode === projectCode)
      return current ? cloneProject(current) : null
    },
  }
}

function createService(records: TodoEntity[], projects: ProjectSummary[]) {
  return new TodoService(createRepositoryMock(records, projects))
}

describe('TodoService', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  const activeProjects: ProjectSummary[] = [
    {
      id: 11,
      projectName: 'Admin Console',
      projectCode: 'admin-console',
    },
    {
      id: 22,
      projectName: 'Client Portal',
      projectCode: 'client-portal',
    },
  ]

  const todoRecords = [
    Object.assign(new TodoEntity(), {
      id: 1,
      title: '整理权限矩阵',
      description: '补齐 admin-console 新权限',
      status: 'pending_review',
      priority: 'high',
      projectId: 11,
      createTime: '2026-06-09 09:00:00',
      updateTime: '2026-06-09 09:00:00',
    }),
    Object.assign(new TodoEntity(), {
      id: 2,
      title: '联调待办接口',
      description: '和前端联调 CRUD',
      status: 'in_progress',
      priority: 'medium',
      projectId: 22,
      createTime: '2026-06-09 10:00:00',
      updateTime: '2026-06-09 10:30:00',
    }),
  ]

  it('creates todo with pending_review as default status', async () => {
    const service = createService(todoRecords, activeProjects)

    const result = await service.createTodo({
      title: '新增待办项',
      description: '落地前后端 todo 模块',
      priority: 'medium',
      projectId: 11,
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: 99,
        title: '新增待办项',
        status: 'pending_review',
        priority: 'medium',
        projectId: 11,
        project: expect.objectContaining({
          id: 11,
          projectName: 'Admin Console',
        }),
      }),
    )
  })

  it('rejects invalid todo status on update', async () => {
    const service = createService(todoRecords, activeProjects)

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
    const service = createService(todoRecords, activeProjects)

    await expect(
      service.createTodo({
        title: '错误优先级任务',
        priority: 'urgent',
        projectId: 11,
      }),
    ).rejects.toMatchObject<Partial<TodoBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'priority',
      }),
    })
  })

  it('rejects missing or nonexistent projects', async () => {
    const service = createService(todoRecords, activeProjects)

    await expect(
      service.createTodo({
        title: '错误项目任务',
        priority: 'low',
        projectId: 999,
      }),
    ).rejects.toMatchObject<Partial<TodoBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'projectId',
      }),
    })
  })

  it('supports filtered todo list queries', async () => {
    const service = createService(todoRecords, activeProjects)

    const result = await service.getTodoList({
      status: 'in_progress',
      priority: 'medium',
      projectId: '22',
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
          projectId: 22,
          project: expect.objectContaining({
            id: 22,
            projectCode: 'client-portal',
          }),
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 5,
    })
  })

  it('submits anonymous suggestion into mapped project with default status and priority', async () => {
    const service = createService(todoRecords, [
      ...activeProjects,
      {
        id: 33,
        projectName: '公开站点',
        projectCode: 'zwpsite',
      },
    ])

    const result = await service.submitSuggestion({
      sourceApp: 'front-public',
      title: '建议补一个快速搜索入口',
      description: '现在层级深的时候不太好找',
      pageUrl: 'https://www.zwpsite.icu/zwpsite/#/tools',
    } satisfies SubmitSuggestionRequestDto)

    expect(result).toEqual(
      expect.objectContaining({
        id: 99,
        title: '建议补一个快速搜索入口',
        status: 'pending_review',
        priority: 'medium',
        projectId: 33,
        project: expect.objectContaining({
          id: 33,
          projectCode: 'zwpsite',
        }),
        description: expect.stringContaining('来源应用：front-public'),
      }),
    )
    expect(result.description).toContain('来源页面：https://www.zwpsite.icu/zwpsite/#/tools')
  })

  it('rejects unknown suggestion source app', async () => {
    const service = createService(todoRecords, activeProjects)

    await expect(
      service.submitSuggestion({
        sourceApp: 'unknown-app',
        title: '非法来源',
      } as SubmitSuggestionRequestDto),
    ).rejects.toMatchObject<Partial<TodoBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'sourceApp',
      }),
    })
  })

  it('rejects empty suggestion title', async () => {
    const service = createService(todoRecords, activeProjects)

    await expect(
      service.submitSuggestion({
        sourceApp: 'admin-front',
        title: '   ',
      }),
    ).rejects.toMatchObject<Partial<TodoBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'title',
      }),
    })
  })

  it('rejects suggestion when mapped project code does not exist', async () => {
    const service = createService(todoRecords, activeProjects)

    await expect(
      service.submitSuggestion({
        sourceApp: 'login',
        title: '登录页建议',
      }),
    ).rejects.toMatchObject<Partial<TodoBusinessError>>({
      statusCode: 400,
      context: expect.objectContaining({
        field: 'sourceApp',
      }),
    })
  })
})
