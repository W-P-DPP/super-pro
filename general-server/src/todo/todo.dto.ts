export type {
  CreateTodoRequestDto,
  TodoListDto,
  TodoListQueryDto,
  TodoPriority,
  TodoProjectSummaryDto,
  TodoResponseDto,
  TodoStatus,
  UpdateTodoRequestDto,
} from '@super-pro/shared-types'

export interface TodoValidationErrorContextDto {
  nodePath: string
  field: string
  reason: string
  value?: unknown
}

export interface TodoIdParamsDto {
  id: number
}
