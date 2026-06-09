import type {
  ApiEnvelope,
  CreateTodoRequestDto,
  TodoListDto,
  TodoListQueryDto,
  TodoPriority,
  TodoResponseDto,
  TodoStatus,
  UpdateTodoRequestDto,
} from '@super-pro/shared-types'
import { RequestError, request } from '../request'

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  pending_review: '\u5f85\u5ba1\u6838',
  todo: '\u5f85\u529e',
  in_progress: '\u8fdb\u884c\u4e2d',
  completed: '\u5df2\u5b8c\u6210',
  canceled: '\u5df2\u53d6\u6d88',
}

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: '\u4f4e',
  medium: '\u4e2d',
  high: '\u9ad8',
}

type ApiResponse<T> = ApiEnvelope<T> & {
  timestamp: number
}

export type TodoListQueryInput = {
  keyword?: string
  status?: TodoStatus | ''
  priority?: TodoPriority | ''
  projectId?: number
  page?: number
  pageSize?: number
}

async function unwrapResponse<T>(promise: Promise<ApiResponse<T>>, fallbackMessage: string) {
  const response = await promise

  if (response.code !== 200) {
    throw new RequestError(response.msg || fallbackMessage, {
      status: response.code,
      details: response,
    })
  }

  return response.data
}

export function normalizeTodoListQuery(query: TodoListQueryInput): TodoListQueryDto {
  const normalizedQuery: TodoListQueryDto = {
    ...(query.page !== undefined ? { page: query.page } : {}),
    ...(query.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
  }

  const keyword = query.keyword?.trim()
  if (keyword) {
    normalizedQuery.keyword = keyword
  }

  const status = query.status?.trim() as TodoStatus | undefined
  if (status) {
    normalizedQuery.status = status
  }

  const priority = query.priority?.trim() as TodoPriority | undefined
  if (priority) {
    normalizedQuery.priority = priority
  }

  if (typeof query.projectId === 'number' && Number.isInteger(query.projectId) && query.projectId > 0) {
    normalizedQuery.projectId = query.projectId
  }

  return normalizedQuery
}

export function getTodos(query: TodoListQueryInput) {
  const normalizedQuery = normalizeTodoListQuery(query)

  return unwrapResponse(
    request.get<ApiResponse<TodoListDto>>('/todo/getTodo', {
      params: normalizedQuery,
      requiresAuth: true,
    }),
    '\u83b7\u53d6\u5f85\u529e\u5217\u8868\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  ).then(
    (data) =>
      data ?? {
        items: [],
        total: 0,
        page: normalizedQuery.page ?? 1,
        pageSize: normalizedQuery.pageSize ?? 10,
      },
  )
}

export function getTodoDetail(id: number) {
  return unwrapResponse(
    request.get<ApiResponse<TodoResponseDto>>(`/todo/getTodo/${id}`, {
      requiresAuth: true,
    }),
    '\u83b7\u53d6\u5f85\u529e\u8be6\u60c5\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  )
}

export function createTodo(payload: CreateTodoRequestDto) {
  return unwrapResponse(
    request.post<ApiResponse<TodoResponseDto>, CreateTodoRequestDto>('/todo/createTodo', payload, {
      requiresAuth: true,
    }),
    '\u65b0\u589e\u5f85\u529e\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  )
}

export function updateTodo(id: number, payload: UpdateTodoRequestDto) {
  return unwrapResponse(
    request.put<ApiResponse<TodoResponseDto>>(`/todo/updateTodo/${id}`, payload, {
      requiresAuth: true,
    }),
    '\u66f4\u65b0\u5f85\u529e\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  )
}

export function deleteTodo(id: number) {
  return unwrapResponse(
    request.delete<ApiResponse<TodoResponseDto>>(`/todo/deleteTodo/${id}`, {
      requiresAuth: true,
    }),
    '\u5220\u9664\u5f85\u529e\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  )
}
