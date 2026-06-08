import { HttpStatus } from '@super-pro/shared-constants'
import type {
  Create__Resource__RequestDto,
  Update__Resource__RequestDto,
  __Resource__ListDto,
  __Resource__ListQueryDto,
  __Resource__ResponseDto,
  __Resource__ValidationErrorContextDto,
} from './__resource__.dto.ts'
import { __resource__Repository, type __Resource__RepositoryPort } from './__resource__.repository.ts'
import type { __Resource__Entity } from './__resource__.entity.ts'

const DEFAULT_LIST_PAGE = 1
const DEFAULT_LIST_PAGE_SIZE = 10
const MAX_LIST_PAGE_SIZE = 100

export class __Resource__BusinessError extends Error {
  constructor(
    message: string,
    public readonly context: __Resource__ValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = '__Resource__BusinessError'
  }
}

function ensurePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new __Resource__BusinessError(
      '__RESOURCE_LABEL__标识不合法',
      {
        nodePath: '__resource__',
        field,
        reason: '__RESOURCE_LABEL__标识必须为正整数',
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return value
}

function ensureString(value: unknown, field: string, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new __Resource__BusinessError(
      `${label}不能为空`,
      {
        nodePath: '__resource__',
        field,
        reason: `${label}必须是非空字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return value.trim()
}

function normalizeOptionalString(value: unknown, field: string, label: string): string {
  if (value === undefined || value === null) {
    return ''
  }

  if (typeof value !== 'string') {
    throw new __Resource__BusinessError(
      `${label}必须是字符串`,
      {
        nodePath: '__resource__',
        field,
        reason: `${label}必须是字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return value.trim()
}

function normalizeStatus(value: unknown): number {
  if (value === undefined) {
    return 1
  }

  if (value !== 0 && value !== 1) {
    throw new __Resource__BusinessError(
      '__RESOURCE_LABEL__状态不合法',
      {
        nodePath: '__resource__',
        field: 'status',
        reason: '__RESOURCE_LABEL__状态只允许为 0 或 1',
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return value
}

function normalizeOptionalStatus(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value === 'string') {
    return normalizeStatus(Number(value.trim()))
  }

  return normalizeStatus(value)
}

function normalizePaginationInteger(
  value: unknown,
  field: 'page' | 'pageSize',
  defaultValue: number,
  options?: { min?: number; max?: number },
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }

  const parsedValue =
    typeof value === 'string' ? Number(value.trim()) : typeof value === 'number' ? value : Number.NaN

  if (!Number.isInteger(parsedValue)) {
    throw new __Resource__BusinessError(
      `${field === 'page' ? '页码' : '分页大小'}不合法`,
      {
        nodePath: '__resource__',
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
    throw new __Resource__BusinessError(
      `${field === 'page' ? '页码' : '分页大小'}不合法`,
      {
        nodePath: '__resource__',
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

function toResponseDto(entity: __Resource__Entity): __Resource__ResponseDto {
  return {
    id: entity.id,
    name: entity.name,
    status: entity.status,
    ...(entity.createBy ? { createBy: entity.createBy } : {}),
    ...(normalizeDateTime(entity.createTime) ? { createTime: normalizeDateTime(entity.createTime) } : {}),
    ...(entity.updateBy ? { updateBy: entity.updateBy } : {}),
    ...(normalizeDateTime(entity.updateTime) ? { updateTime: normalizeDateTime(entity.updateTime) } : {}),
    ...(entity.remark ? { remark: entity.remark } : {}),
  }
}

function validateCreateInput(input: Record<string, unknown>): Create__Resource__RequestDto {
  return {
    name: ensureString(input.name, 'name', '__RESOURCE_LABEL__名称'),
    status: normalizeStatus(input.status),
    remark: normalizeOptionalString(input.remark, 'remark', '__RESOURCE_LABEL__备注'),
  }
}

function validateUpdateInput(input: Record<string, unknown>): Update__Resource__RequestDto {
  const payload: Update__Resource__RequestDto = {}

  if (Object.prototype.hasOwnProperty.call(input, 'name') && input.name !== undefined) {
    payload.name = ensureString(input.name, 'name', '__RESOURCE_LABEL__名称')
  }

  if (Object.prototype.hasOwnProperty.call(input, 'status')) {
    const status = normalizeOptionalStatus(input.status)
    if (status !== undefined) {
      payload.status = status
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'remark')) {
    payload.remark = normalizeOptionalString(input.remark, 'remark', '__RESOURCE_LABEL__备注')
  }

  if (Object.keys(payload).length === 0) {
    throw new __Resource__BusinessError(
      `更新__RESOURCE_LABEL__参数不能为空`,
      {
        nodePath: '__resource__',
        field: 'payload',
        reason: '至少需要提供一个可更新字段',
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return payload
}

function validateListQuery(input: Record<string, unknown>): __Resource__ListQueryDto {
  const keyword =
    typeof input.keyword === 'string' && input.keyword.trim() ? input.keyword.trim() : undefined
  const status = normalizeOptionalStatus(input.status)

  return {
    ...(keyword ? { keyword } : {}),
    ...(status !== undefined ? { status } : {}),
    page: normalizePaginationInteger(input.page, 'page', DEFAULT_LIST_PAGE),
    pageSize: normalizePaginationInteger(input.pageSize, 'pageSize', DEFAULT_LIST_PAGE_SIZE, {
      min: 1,
      max: MAX_LIST_PAGE_SIZE,
    }),
  }
}

export class __Resource__Service {
  constructor(private readonly repository: __Resource__RepositoryPort = __resource__Repository) {}

  async get__Resource__List(
    input: __Resource__ListQueryDto | Record<string, unknown> = {},
  ): Promise<__Resource__ListDto> {
    const query = validateListQuery(input as Record<string, unknown>)

    try {
      const result = await this.repository.getList(query)

      return {
        items: result.items.map(toResponseDto),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      }
    } catch {
      throw new __Resource__BusinessError(
        `读取__RESOURCE_LABEL__列表失败`,
        {
          nodePath: '__resource__',
          field: 'source',
          reason: '__RESOURCE_LABEL__数据源读取失败',
        },
        HttpStatus.ERROR,
      )
    }
  }

  async get__Resource__Detail(id: number): Promise<__Resource__ResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id')
    const entity = await this.repository.getById(targetId)

    if (!entity) {
      throw new __Resource__BusinessError(
        '__RESOURCE_LABEL__不存在',
        {
          nodePath: '__resource__',
          field: 'id',
          reason: '未找到对应记录',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      )
    }

    return toResponseDto(entity)
  }

  async create__Resource__(
    input: Create__Resource__RequestDto | Record<string, unknown>,
  ): Promise<__Resource__ResponseDto> {
    const payload = validateCreateInput(input as Record<string, unknown>)
    const created = await this.repository.create(payload)

    if (!created) {
      throw new __Resource__BusinessError(
        `新增__RESOURCE_LABEL__失败`,
        {
          nodePath: '__resource__',
          field: 'create',
          reason: '__RESOURCE_LABEL__创建失败',
        },
        HttpStatus.ERROR,
      )
    }

    return toResponseDto(created)
  }

  async update__Resource__(
    id: number,
    input: Update__Resource__RequestDto | Record<string, unknown>,
  ): Promise<__Resource__ResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id')
    const payload = validateUpdateInput(input as Record<string, unknown>)
    const updated = await this.repository.update(targetId, payload)

    if (!updated) {
      throw new __Resource__BusinessError(
        '__RESOURCE_LABEL__不存在',
        {
          nodePath: '__resource__',
          field: 'id',
          reason: '未找到对应记录',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      )
    }

    return toResponseDto(updated)
  }

  async delete__Resource__(id: number): Promise<__Resource__ResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id')
    const deleted = await this.repository.delete(targetId)

    if (!deleted) {
      throw new __Resource__BusinessError(
        '__RESOURCE_LABEL__不存在',
        {
          nodePath: '__resource__',
          field: 'id',
          reason: '未找到对应记录',
          value: id,
        },
        HttpStatus.NOT_FOUND,
      )
    }

    return toResponseDto(deleted)
  }
}

export const __resource__Service = new __Resource__Service()
