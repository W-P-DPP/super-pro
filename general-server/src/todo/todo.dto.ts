export type {
  CreateTodoRequestDto,
  TodoListDto,
  TodoListQueryDto,
  TodoPriority,
  TodoResponseDto,
  TodoStatus,
  UpdateTodoRequestDto,
  UserSummaryDto,
} from '@super-pro/shared-types';

export interface TodoValidationErrorContextDto {
  nodePath: string;
  field: string;
  reason: string;
  value?: unknown;
}

export interface TodoIdParamsDto {
  id: number;
}
