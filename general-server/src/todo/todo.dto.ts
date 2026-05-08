export enum TodoStatus {
  PENDING_REVIEW = 0,
  TODO = 1,
  COMPLETED = 2,
  CANCELLED = 3,
  REVIEW_FAILED = 4,
}

export const TodoStatusTransitions: Record<TodoStatus, TodoStatus[]> = {
  [TodoStatus.PENDING_REVIEW]: [TodoStatus.REVIEW_FAILED, TodoStatus.TODO],
  [TodoStatus.REVIEW_FAILED]: [TodoStatus.TODO],
  [TodoStatus.TODO]: [TodoStatus.COMPLETED],
  [TodoStatus.COMPLETED]: [TodoStatus.TODO, TodoStatus.CANCELLED],
  [TodoStatus.CANCELLED]: [],
}

export interface CreateTodoReq {
  title: string
  description?: string
}

export interface UpdateTodoReq {
  title?: string
  description?: string
}

export interface TodoResp {
  id: number
  title: string
  description: string
  status: TodoStatus
  createTime?: string
  updateTime?: string
}

export type TodoListResp = TodoResp[]

export interface TodoValidationErrorContextDto {
  nodePath: string
  field: string
  reason: string
  value?: unknown
}
