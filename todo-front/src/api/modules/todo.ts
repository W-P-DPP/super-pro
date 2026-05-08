import { request } from '../request'

interface ResponseEnvelope<T> {
  code: number
  msg: string
  data?: T
  timestamp: number
}

function unwrap<T>(envelope: ResponseEnvelope<T>): T | undefined {
  return envelope.data
}

export const TodoStatus = {
  PENDING_REVIEW: 0,
  TODO: 1,
  COMPLETED: 2,
  CANCELLED: 3,
  REVIEW_FAILED: 4,
} as const

export type TodoStatus = (typeof TodoStatus)[keyof typeof TodoStatus]

export interface TodoItem {
  id: number
  title: string
  description: string
  status: TodoStatus
  createTime?: string
  updateTime?: string
}

export interface CreateTodoParams {
  title: string
  description?: string
}

export interface UpdateTodoParams {
  title?: string
  description?: string
}

export async function getTodoList(status?: TodoStatus) {
  const params = status !== undefined ? { status } : undefined
  const res = await request.get<ResponseEnvelope<TodoItem[]>>('/todo/list', { params })
  return unwrap(res) ?? []
}

export async function createTodo(data: CreateTodoParams) {
  const res = await request.post<ResponseEnvelope<TodoItem>>('/todo/create', data)
  return unwrap(res)
}

export async function updateTodo(id: number, data: UpdateTodoParams) {
  const res = await request.put<ResponseEnvelope<TodoItem>>(`/todo/update/${id}`, data)
  return unwrap(res)
}

export async function approveTodo(id: number) {
  const res = await request.post<ResponseEnvelope<TodoItem>>(`/todo/approve/${id}`)
  return unwrap(res)
}

export async function completeTodo(id: number) {
  const res = await request.post<ResponseEnvelope<TodoItem>>(`/todo/complete/${id}`)
  return unwrap(res)
}

export async function rejectTodo(id: number) {
  const res = await request.post<ResponseEnvelope<TodoItem>>(`/todo/reject/${id}`)
  return unwrap(res)
}

export async function cancelTodo(id: number) {
  const res = await request.post<ResponseEnvelope<TodoItem>>(`/todo/cancel/${id}`)
  return unwrap(res)
}

export async function rollbackTodo(id: number) {
  const res = await request.post<ResponseEnvelope<TodoItem>>(`/todo/rollback/${id}`)
  return unwrap(res)
}

export async function deleteTodo(id: number) {
  const res = await request.delete<ResponseEnvelope<TodoItem>>(`/todo/delete/${id}`)
  return unwrap(res)
}
