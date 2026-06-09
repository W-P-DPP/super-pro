export const TODO_STATUSES = [
  'pending_review',
  'todo',
  'in_progress',
  'completed',
  'canceled',
] as const

export type TodoStatus = (typeof TODO_STATUSES)[number]

export const TODO_PRIORITIES = ['low', 'medium', 'high'] as const

export type TodoPriority = (typeof TODO_PRIORITIES)[number]

export const SUGGESTION_SOURCE_APPS = ['admin-front', 'front-public', 'login'] as const

export type SuggestionSourceApp = (typeof SUGGESTION_SOURCE_APPS)[number]

export interface TodoProjectSummaryDto {
  id: number
  projectName: string
  projectCode: string
}

export interface TodoResponseDto {
  id: number
  title: string
  description?: string
  status: TodoStatus
  priority: TodoPriority
  projectId: number
  project: TodoProjectSummaryDto | null
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
  remark?: string
}

export interface TodoListQueryDto {
  keyword?: string
  status?: TodoStatus
  priority?: TodoPriority
  projectId?: number
  page?: number
  pageSize?: number
}

export interface TodoListDto {
  items: TodoResponseDto[]
  total: number
  page: number
  pageSize: number
}

export interface CreateTodoRequestDto {
  title: string
  description?: string
  priority?: TodoPriority
  projectId: number
  remark?: string
}

export interface UpdateTodoRequestDto {
  title?: string
  description?: string
  status?: TodoStatus
  priority?: TodoPriority
  projectId?: number
  remark?: string
}

export interface SubmitSuggestionRequestDto {
  sourceApp: SuggestionSourceApp
  title: string
  description?: string
  pageUrl?: string
}
