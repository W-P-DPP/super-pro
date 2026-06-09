import type { DataSource, EntityManager, Repository } from 'typeorm'
import type {
  TodoListQueryDto,
  TodoPriority,
  TodoProjectSummaryDto,
  TodoStatus,
} from '@super-pro/shared-types'
import initDataBase, { getDataSource } from '../../utils/mysql.ts'
import { ProjectEntity } from '../project/project.entity.ts'
import { TodoEntity } from './todo.entity.ts'

export interface CreateTodoEntityInput {
  title: string
  description?: string
  status: TodoStatus
  priority: TodoPriority
  projectId: number
  remark?: string
}

export interface UpdateTodoEntityInput {
  title?: string
  description?: string
  status?: TodoStatus
  priority?: TodoPriority
  projectId?: number
  remark?: string
}

export interface TodoDetailRepositoryRecord {
  entity: TodoEntity
  project: TodoProjectSummaryDto | null
}

export interface TodoListItemRepositoryRecord extends TodoDetailRepositoryRecord {}

export interface TodoListRepositoryResult {
  items: TodoListItemRepositoryRecord[]
  total: number
  page: number
  pageSize: number
}

export interface TodoRepositoryPort {
  getTodoList(query: TodoListQueryDto): Promise<TodoListRepositoryResult>
  getTodoById(id: number): Promise<TodoEntity | null>
  getTodoDetailById(id: number): Promise<TodoDetailRepositoryRecord | null>
  createTodo(input: CreateTodoEntityInput): Promise<TodoEntity | null>
  updateTodo(id: number, input: UpdateTodoEntityInput): Promise<TodoEntity | null>
  deleteTodo(id: number): Promise<TodoEntity | null>
  getProjectById(id: number): Promise<TodoProjectSummaryDto | null>
  getProjectByCode(projectCode: string): Promise<TodoProjectSummaryDto | null>
}

let ensureTodoTablePromise: Promise<void> | null = null

function resolveConfiguredDatabaseName(dataSource: DataSource): string | null {
  const database = dataSource.options.database
  return typeof database === 'string' && database.trim() ? database.trim() : null
}

async function ensureTodoTableSchema(dataSource: DataSource) {
  if (ensureTodoTablePromise) {
    return ensureTodoTablePromise
  }

  ensureTodoTablePromise = (async () => {
    const databaseName = resolveConfiguredDatabaseName(dataSource)
    if (!databaseName) {
      return
    }

    const rows = (await dataSource.query(
      `
        SELECT COUNT(*) AS count
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'sys_todo'
          AND COLUMN_NAME = 'description'
      `,
      [databaseName],
    )) as Array<{ count?: number | string }>

    const existingColumnCount = Number(rows[0]?.count ?? 0)
    if (existingColumnCount > 0) {
      return
    }

    await dataSource.query(`
      ALTER TABLE sys_todo
      ADD COLUMN description VARCHAR(1000) NOT NULL DEFAULT '' COMMENT '待办描述'
    `)
  })()
    .then(() => {
      ensureTodoTablePromise = null
    })
    .catch((error) => {
      ensureTodoTablePromise = null
      throw error
    })

  return ensureTodoTablePromise
}

async function ensureDataSource() {
  const current = getDataSource()
  if (current?.isInitialized) {
    await ensureTodoTableSchema(current)
    return current
  }

  const dataSource = await initDataBase()
  await ensureTodoTableSchema(dataSource)
  return dataSource
}

function mapProjectSummary(raw: Record<string, unknown>): TodoProjectSummaryDto | null {
  const id = Number(raw.project_id ?? 0)
  if (!Number.isFinite(id) || id <= 0) {
    return null
  }

  const projectName =
    raw.project_projectName ??
    raw.project_project_name ??
    raw.projectName ??
    raw.project_name ??
    ''
  const projectCode =
    raw.project_projectCode ??
    raw.project_project_code ??
    raw.projectCode ??
    raw.project_code ??
    ''

  return {
    id,
    projectName: String(projectName),
    projectCode: String(projectCode),
  }
}

export class TodoRepository implements TodoRepositoryPort {
  private async getRepository(manager?: EntityManager): Promise<Repository<TodoEntity>> {
    const dataSource = await ensureDataSource()

    if (!manager) {
      return dataSource.getRepository(TodoEntity)
    }

    return manager.getRepository(TodoEntity)
  }

  private createDetailQueryBuilder(repository: Repository<TodoEntity>) {
    return repository
      .createQueryBuilder('todo')
      .leftJoin(
        ProjectEntity,
        'project',
        'project.id = todo.projectId AND project.deleteFlag = :projectDeleteFlag',
        {
          projectDeleteFlag: 0,
        },
      )
      .select([
        'todo.id',
        'todo.title',
        'todo.description',
        'todo.status',
        'todo.priority',
        'todo.projectId',
        'todo.createBy',
        'todo.createTime',
        'todo.updateBy',
        'todo.updateTime',
        'todo.remark',
        'project.id',
        'project.projectName',
        'project.projectCode',
      ])
      .where('todo.deleteFlag = :deleteFlag', { deleteFlag: 0 })
  }

  async getTodoList(query: TodoListQueryDto): Promise<TodoListRepositoryResult> {
    const repository = await this.getRepository()
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 10
    const queryBuilder = this.createDetailQueryBuilder(repository)

    if (query.keyword) {
      queryBuilder.andWhere('(todo.title LIKE :keyword OR todo.description LIKE :keyword)', {
        keyword: `%${query.keyword}%`,
      })
    }

    if (query.status) {
      queryBuilder.andWhere('todo.status = :status', {
        status: query.status,
      })
    }

    if (query.priority) {
      queryBuilder.andWhere('todo.priority = :priority', {
        priority: query.priority,
      })
    }

    if (query.projectId) {
      queryBuilder.andWhere('todo.projectId = :projectId', {
        projectId: query.projectId,
      })
    }

    const total = await queryBuilder.getCount()
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const currentPage = Math.min(page, totalPages)
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
                project: mapProjectSummary(raw[index] ?? {}),
              })),
            )

    return {
      items,
      total,
      page: currentPage,
      pageSize,
    }
  }

  async getTodoById(id: number): Promise<TodoEntity | null> {
    const repository = await this.getRepository()
    return this.createDetailQueryBuilder(repository)
      .andWhere('todo.id = :id', { id })
      .getOne()
  }

  async getTodoDetailById(id: number): Promise<TodoDetailRepositoryRecord | null> {
    const repository = await this.getRepository()
    const result = await this.createDetailQueryBuilder(repository)
      .andWhere('todo.id = :id', { id })
      .getRawAndEntities()

    const entity = result.entities[0]
    if (!entity) {
      return null
    }

    return {
      entity,
      project: mapProjectSummary(result.raw[0] ?? {}),
    }
  }

  async createTodo(input: CreateTodoEntityInput): Promise<TodoEntity | null> {
    const repository = await this.getRepository()
    const entity = repository.create({
      title: input.title,
      description: input.description ?? '',
      status: input.status,
      priority: input.priority,
      projectId: input.projectId,
      createBy: 'system',
      updateBy: 'system',
      ...(input.remark ? { remark: input.remark } : {}),
    })

    const saved = await repository.save(entity)
    return this.getTodoById(saved.id)
  }

  async updateTodo(id: number, input: UpdateTodoEntityInput): Promise<TodoEntity | null> {
    const repository = await this.getRepository()
    const current = await repository.findOne({
      where: { id, deleteFlag: 0 },
    })

    if (!current) {
      return null
    }

    if (input.title !== undefined) {
      current.title = input.title
    }

    if (input.description !== undefined) {
      current.description = input.description
    }

    if (input.status !== undefined) {
      current.status = input.status
    }

    if (input.priority !== undefined) {
      current.priority = input.priority
    }

    if (input.projectId !== undefined) {
      current.projectId = input.projectId
    }

    if (input.remark !== undefined) {
      current.remark = input.remark
    }

    current.updateBy = 'system'
    await repository.save(current)

    return this.getTodoById(id)
  }

  async deleteTodo(id: number): Promise<TodoEntity | null> {
    const repository = await this.getRepository()
    const current = await repository.findOne({
      where: { id, deleteFlag: 0 },
    })

    if (!current) {
      return null
    }

    current.deleteFlag = 1
    current.updateBy = 'system'
    await repository.save(current)
    return current
  }

  async getProjectById(id: number): Promise<TodoProjectSummaryDto | null> {
    const dataSource = await ensureDataSource()
    const repository = dataSource.getRepository(ProjectEntity)
    const project = await repository
      .createQueryBuilder('project')
      .select([
        'project.id',
        'project.projectName',
        'project.projectCode',
      ])
      .where('project.id = :id', { id })
      .andWhere('project.deleteFlag = :deleteFlag', { deleteFlag: 0 })
      .getOne()

    if (!project) {
      return null
    }

    return {
      id: project.id,
      projectName: project.projectName,
      projectCode: project.projectCode,
    }
  }

  async getProjectByCode(projectCode: string): Promise<TodoProjectSummaryDto | null> {
    const dataSource = await ensureDataSource()
    const repository = dataSource.getRepository(ProjectEntity)
    const project = await repository
      .createQueryBuilder('project')
      .select([
        'project.id',
        'project.projectName',
        'project.projectCode',
      ])
      .where('project.projectCode = :projectCode', { projectCode })
      .andWhere('project.deleteFlag = :deleteFlag', { deleteFlag: 0 })
      .getOne()

    if (!project) {
      return null
    }

    return {
      id: project.id,
      projectName: project.projectName,
      projectCode: project.projectCode,
    }
  }
}

export const todoRepository = new TodoRepository()
