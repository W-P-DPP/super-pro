import { HttpStatus } from '@super-pro/shared-constants'
import {
  SUGGESTION_SOURCE_APPS,
  TODO_PRIORITIES,
  TODO_STATUSES,
  type CreateTodoRequestDto,
  type SubmitSuggestionRequestDto,
  type SuggestionSourceApp,
  type TodoListDto,
  type TodoListQueryDto,
  type TodoPriority,
  type TodoResponseDto,
  type TodoStatus,
  type UpdateTodoRequestDto,
} from '@super-pro/shared-types'
import type { TodoValidationErrorContextDto } from './todo.dto.ts'
import {
  todoRepository,
  type TodoDetailRepositoryRecord,
  type TodoListItemRepositoryRecord,
  type TodoRepositoryPort,
} from './todo.repository.ts'

const DEFAULT_TODO_LIST_PAGE = 1
const DEFAULT_TODO_LIST_PAGE_SIZE = 10
const MAX_TODO_LIST_PAGE_SIZE = 100
const MAX_TODO_TITLE_LENGTH = 128
const MAX_TODO_DESCRIPTION_LENGTH = 1000
const MAX_TODO_REMARK_LENGTH = 255
const MAX_SUGGESTION_PAGE_URL_LENGTH = 512
const DEFAULT_TODO_PRIORITY: TodoPriority = 'medium'
const DEFAULT_TODO_STATUS: TodoStatus = 'pending_review'
const LEGACY_SUGGESTION_SOURCE_APP_ALIASES = {
  'admin-front': 'BMS',
  'front-public': 'zwpsite',
} as const
const SUGGESTION_PROJECT_CODE_BY_SOURCE_APP: Record<SuggestionSourceApp, string> = {
  BMS: 'admin-console',
  zwpsite: 'zwpsite',
  login: 'login',
}

export class TodoBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: TodoValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'TodoBusinessError'
  }
}

function ensurePositiveInteger(value: number, field: string, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TodoBusinessError(
      `${label}不合法`,
      {
        nodePath: 'todo',
        field,
        reason: `${label}必须为正整数`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return value
}

function ensureRequiredString(
  value: unknown,
  field: string,
  label: string,
  maxLength: number,
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TodoBusinessError(
      `${label}不能为空`,
      {
        nodePath: 'todo',
        field,
        reason: `${label}必须是非空字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  const normalizedValue = value.trim()
  if (normalizedValue.length > maxLength) {
    throw new TodoBusinessError(
      `${label}长度不能超过 ${maxLength} 个字符`,
      {
        nodePath: 'todo',
        field,
        reason: `${label}长度超出限制`,
        value: normalizedValue.length,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return normalizedValue
}

function normalizeOptionalString(
  value: unknown,
  field: string,
  label: string,
  maxLength: number,
): string | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return ''
  }

  if (typeof value !== 'string') {
    throw new TodoBusinessError(
      `${label}必须是字符串`,
      {
        nodePath: 'todo',
        field,
        reason: `${label}必须是字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  const normalizedValue = value.trim()
  if (!normalizedValue) {
    return ''
  }

  if (normalizedValue.length > maxLength) {
    throw new TodoBusinessError(
      `${label}长度不能超过 ${maxLength} 个字符`,
      {
        nodePath: 'todo',
        field,
        reason: `${label}长度超出限制`,
        value: normalizedValue.length,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return normalizedValue
}

function ensureSuggestionSourceApp(value: unknown, field: string): SuggestionSourceApp {
  if (typeof value !== 'string') {
    throw new TodoBusinessError(
      '建议来源应用不合法',
      {
        nodePath: 'todo',
        field,
        reason: `来源应用必须是 ${SUGGESTION_SOURCE_APPS.join(' / ')} 之一`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  const trimmedValue = value.trim()
  const canonicalValue =
    LEGACY_SUGGESTION_SOURCE_APP_ALIASES[
      trimmedValue as keyof typeof LEGACY_SUGGESTION_SOURCE_APP_ALIASES
    ] ?? trimmedValue

  if (!SUGGESTION_SOURCE_APPS.includes(canonicalValue as SuggestionSourceApp)) {
    throw new TodoBusinessError(
      '建议来源应用不合法',
      {
        nodePath: 'todo',
        field,
        reason: `来源应用必须是 ${SUGGESTION_SOURCE_APPS.join(' / ')} 之一`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return canonicalValue as SuggestionSourceApp
}

function ensureTodoStatus(value: unknown, field: string): TodoStatus {
  if (typeof value !== 'string' || !TODO_STATUSES.includes(value as TodoStatus)) {
    throw new TodoBusinessError(
      '待办状态不合法',
      {
        nodePath: 'todo',
        field,
        reason: `待办状态必须是 ${TODO_STATUSES.join(' / ')} 之一`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return value as TodoStatus
}

function ensureTodoPriority(value: unknown, field: string): TodoPriority {
  if (value === undefined) {
    return DEFAULT_TODO_PRIORITY
  }

  if (typeof value !== 'string' || !TODO_PRIORITIES.includes(value as TodoPriority)) {
    throw new TodoBusinessError(
      '待办优先级不合法',
      {
        nodePath: 'todo',
        field,
        reason: `待办优先级必须是 ${TODO_PRIORITIES.join(' / ')} 之一`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return value as TodoPriority
}

function normalizePaginationInteger(
  value: unknown,
  field: 'page' | 'pageSize',
  defaultValue: number,
  options?: {
    min?: number
    max?: number
  },
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }

  const parsedValue =
    typeof value === 'string' ? Number(value.trim()) : typeof value === 'number' ? value : Number.NaN

  if (!Number.isInteger(parsedValue)) {
    throw new TodoBusinessError(
      `${field === 'page' ? '页码' : '分页大小'}不合法`,
      {
        nodePath: 'todo',
        field,
        reason: `${field === 'page' ? '页码' : '分页大小'}必须为正整数`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  const minValue = options?.min ?? 1
  const maxValue = options?.max

  if (parsedValue < minValue || (maxValue !== undefined && parsedValue > maxValue)) {
    throw new TodoBusinessError(
      `${field === 'page' ? '页码' : '分页大小'}不合法`,
      {
        nodePath: 'todo',
        field,
        reason:
          field === 'page'
            ? '页码必须大于等于 1'
            : `分页大小必须在 ${minValue} 到 ${maxValue ?? Number.MAX_SAFE_INTEGER} 之间`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return parsedValue
}

function normalizeOptionalKeyword(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new TodoBusinessError(
      '筛选关键字必须是字符串',
      {
        nodePath: 'todo',
        field,
        reason: '筛选关键字必须是字符串',
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  const trimmedValue = value.trim()
  return trimmedValue ? trimmedValue : undefined
}

function normalizeDateTime(value: unknown): string | undefined {
  if (!value) {
    return undefined
  }

  if (typeof value === 'string') {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return undefined
}

function toResponseDto(record: TodoDetailRepositoryRecord): TodoResponseDto {
  const { entity, project } = record
  const createTime = normalizeDateTime(entity.createTime)
  const updateTime = normalizeDateTime(entity.updateTime)

  return {
    id: entity.id,
    title: entity.title,
    ...(entity.description ? { description: entity.description } : {}),
    status: entity.status as TodoStatus,
    priority: entity.priority as TodoPriority,
    projectId: entity.projectId,
    project,
    ...(entity.createBy ? { createBy: entity.createBy } : {}),
    ...(createTime ? { createTime } : {}),
    ...(entity.updateBy ? { updateBy: entity.updateBy } : {}),
    ...(updateTime ? { updateTime } : {}),
    ...(entity.remark ? { remark: entity.remark } : {}),
  }
}

function toListItemResponseDto(record: TodoListItemRepositoryRecord): TodoResponseDto {
  return toResponseDto(record)
}

function validateCreateInput(input: Record<string, unknown>): CreateTodoRequestDto {
  const payload: CreateTodoRequestDto = {
    title: ensureRequiredString(input.title, 'title', '待办标题', MAX_TODO_TITLE_LENGTH),
    priority: ensureTodoPriority(input.priority, 'priority'),
    projectId: ensurePositiveInteger(Number(input.projectId), 'projectId', '项目标识'),
  }

  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    const description = normalizeOptionalString(
      input.description,
      'description',
      '待办描述',
      MAX_TODO_DESCRIPTION_LENGTH,
    )
    if (description !== undefined) {
      payload.description = description
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'remark')) {
    const remark = normalizeOptionalString(input.remark, 'remark', '待办备注', MAX_TODO_REMARK_LENGTH)
    if (remark !== undefined) {
      payload.remark = remark
    }
  }

  return payload
}

function buildSuggestionSourceDescriptionBlock(sourceApp: SuggestionSourceApp, pageUrl?: string) {
  return `来源应用：${sourceApp}\n来源页面：${pageUrl || '未提供'}`
}

function composeSuggestionDescription(
  description: string | undefined,
  sourceApp: SuggestionSourceApp,
  pageUrl?: string,
) {
  const sourceDescriptionBlock = buildSuggestionSourceDescriptionBlock(sourceApp, pageUrl)
  const normalizedDescription = description?.trim()

  return normalizedDescription
    ? `${normalizedDescription}\n\n${sourceDescriptionBlock}`
    : sourceDescriptionBlock
}

function validateSuggestionInput(input: Record<string, unknown>): SubmitSuggestionRequestDto {
  const sourceApp = ensureSuggestionSourceApp(input.sourceApp, 'sourceApp')
  const title = ensureRequiredString(input.title, 'title', '建议标题', MAX_TODO_TITLE_LENGTH)
  const description = normalizeOptionalString(
    input.description,
    'description',
    '建议描述',
    MAX_TODO_DESCRIPTION_LENGTH,
  )
  const pageUrl = normalizeOptionalString(input.pageUrl, 'pageUrl', '来源页面', MAX_SUGGESTION_PAGE_URL_LENGTH)
  const composedDescription = composeSuggestionDescription(description, sourceApp, pageUrl)

  if (composedDescription.length > MAX_TODO_DESCRIPTION_LENGTH) {
    throw new TodoBusinessError(
      `建议描述长度不能超过 ${MAX_TODO_DESCRIPTION_LENGTH} 个字符`,
      {
        nodePath: 'todo',
        field: 'description',
        reason: '建议描述与来源信息组合后超出限制',
        value: composedDescription.length,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return {
    sourceApp,
    title,
    ...(description !== undefined ? { description } : {}),
    ...(pageUrl !== undefined ? { pageUrl } : {}),
  }
}

function validateUpdateInput(input: Record<string, unknown>): UpdateTodoRequestDto {
  const payload: UpdateTodoRequestDto = {}

  if (Object.prototype.hasOwnProperty.call(input, 'title')) {
    payload.title = ensureRequiredString(input.title, 'title', '待办标题', MAX_TODO_TITLE_LENGTH)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    const description = normalizeOptionalString(
      input.description,
      'description',
      '待办描述',
      MAX_TODO_DESCRIPTION_LENGTH,
    )
    if (description !== undefined) {
      payload.description = description
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'status')) {
    payload.status = ensureTodoStatus(input.status, 'status')
  }

  if (Object.prototype.hasOwnProperty.call(input, 'priority')) {
    payload.priority = ensureTodoPriority(input.priority, 'priority')
  }

  if (Object.prototype.hasOwnProperty.call(input, 'projectId')) {
    payload.projectId = ensurePositiveInteger(Number(input.projectId), 'projectId', '项目标识')
  }

  if (Object.prototype.hasOwnProperty.call(input, 'remark')) {
    const remark = normalizeOptionalString(input.remark, 'remark', '待办备注', MAX_TODO_REMARK_LENGTH)
    if (remark !== undefined) {
      payload.remark = remark
    }
  }

  return payload
}

function validateListQuery(input: Record<string, unknown>): TodoListQueryDto {
  const payload: TodoListQueryDto = {
    page: normalizePaginationInteger(input.page, 'page', DEFAULT_TODO_LIST_PAGE),
    pageSize: normalizePaginationInteger(input.pageSize, 'pageSize', DEFAULT_TODO_LIST_PAGE_SIZE, {
      min: 1,
      max: MAX_TODO_LIST_PAGE_SIZE,
    }),
  }

  const keyword = normalizeOptionalKeyword(input.keyword, 'keyword')
  if (keyword) {
    payload.keyword = keyword
  }

  if (input.status !== undefined && input.status !== '') {
    payload.status = ensureTodoStatus(input.status, 'status')
  }

  if (input.priority !== undefined && input.priority !== '') {
    payload.priority = ensureTodoPriority(input.priority, 'priority')
  }

  if (input.projectId !== undefined && input.projectId !== null && input.projectId !== '') {
    payload.projectId = ensurePositiveInteger(Number(input.projectId), 'projectId', '项目标识')
  }

  return payload
}

export class TodoService {
  constructor(private readonly repository: TodoRepositoryPort = todoRepository) {}

  async getTodoList(input: TodoListQueryDto | Record<string, unknown>): Promise<TodoListDto> {
    const payload = validateListQuery(input as Record<string, unknown>)
    const result = await this.repository.getTodoList(payload)

    return {
      items: result.items.map((item) => toListItemResponseDto(item)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  }

  async getTodoDetail(id: number): Promise<TodoResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id', '待办标识')
    const detail = await this.repository.getTodoDetailById(targetId)

    if (!detail) {
      throw new TodoBusinessError(
        '待办不存在',
        {
          nodePath: 'todo',
          field: 'id',
          reason: '未找到对应待办',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      )
    }

    return toResponseDto(detail)
  }

  async createTodo(input: CreateTodoRequestDto | Record<string, unknown>): Promise<TodoResponseDto> {
    const payload = validateCreateInput(input as Record<string, unknown>)
    const project = await this.repository.getProjectById(payload.projectId)

    if (!project) {
      throw new TodoBusinessError(
        '归属项目不存在',
        {
          nodePath: 'todo',
          field: 'projectId',
          reason: '归属项目必须是有效项目',
          value: payload.projectId,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const created = await this.repository.createTodo({
      title: payload.title,
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      status: DEFAULT_TODO_STATUS,
      priority: payload.priority ?? DEFAULT_TODO_PRIORITY,
      projectId: payload.projectId,
      ...(payload.remark !== undefined ? { remark: payload.remark } : {}),
    })

    if (!created) {
      throw new TodoBusinessError(
        '新增待办失败',
        {
          nodePath: 'todo',
          field: 'create',
          reason: '待办创建失败',
        },
        HttpStatus.ERROR,
      )
    }

    return toResponseDto({
      entity: created,
      project,
    })
  }

  async submitSuggestion(
    input: SubmitSuggestionRequestDto | Record<string, unknown>,
  ): Promise<TodoResponseDto> {
    const payload = validateSuggestionInput(input as Record<string, unknown>)
    const mappedProjectCode = SUGGESTION_PROJECT_CODE_BY_SOURCE_APP[payload.sourceApp]
    const project = await this.repository.getProjectByCode(mappedProjectCode)

    if (!project) {
      throw new TodoBusinessError(
        '建议归属项目不存在',
        {
          nodePath: 'todo',
          field: 'sourceApp',
          reason: `来源应用 ${payload.sourceApp} 映射的项目编码 ${mappedProjectCode} 不存在`,
          value: payload.sourceApp,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const created = await this.repository.createTodo({
      title: payload.title,
      description: composeSuggestionDescription(payload.description, payload.sourceApp, payload.pageUrl),
      status: DEFAULT_TODO_STATUS,
      priority: DEFAULT_TODO_PRIORITY,
      projectId: project.id,
    })

    if (!created) {
      throw new TodoBusinessError(
        '提交建议失败',
        {
          nodePath: 'todo',
          field: 'submitSuggestion',
          reason: '建议待办创建失败',
        },
        HttpStatus.ERROR,
      )
    }

    return toResponseDto({
      entity: created,
      project,
    })
  }

  async updateTodo(id: number, input: UpdateTodoRequestDto | Record<string, unknown>): Promise<TodoResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id', '待办标识')
    const current = await this.repository.getTodoById(targetId)

    if (!current) {
      throw new TodoBusinessError(
        '待办不存在',
        {
          nodePath: 'todo',
          field: 'id',
          reason: '未找到对应待办',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      )
    }

    const payload = validateUpdateInput(input as Record<string, unknown>)

    if (payload.projectId !== undefined) {
      const project = await this.repository.getProjectById(payload.projectId)
      if (!project) {
        throw new TodoBusinessError(
          '归属项目不存在',
          {
            nodePath: 'todo',
            field: 'projectId',
            reason: '归属项目必须是有效项目',
            value: payload.projectId,
          },
          HttpStatus.BAD_REQUEST,
        )
      }
    }

    const updated = await this.repository.updateTodo(targetId, payload)

    if (!updated) {
      throw new TodoBusinessError(
        '更新待办失败',
        {
          nodePath: 'todo',
          field: 'update',
          reason: '待办更新失败',
          value: id,
        },
        HttpStatus.ERROR,
      )
    }

    return this.getTodoDetail(updated.id)
  }

  async deleteTodo(id: number): Promise<TodoResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id', '待办标识')
    const detail = await this.repository.getTodoDetailById(targetId)

    if (!detail) {
      throw new TodoBusinessError(
        '待办不存在',
        {
          nodePath: 'todo',
          field: 'id',
          reason: '未找到对应待办',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      )
    }

    const deleted = await this.repository.deleteTodo(targetId)
    if (!deleted) {
      throw new TodoBusinessError(
        '删除待办失败',
        {
          nodePath: 'todo',
          field: 'delete',
          reason: '待办删除失败',
          value: id,
        },
        HttpStatus.ERROR,
      )
    }

    return toResponseDto(detail)
  }
}

export const todoService = new TodoService()
