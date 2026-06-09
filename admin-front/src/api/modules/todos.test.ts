import { describe, expect, it } from 'vitest'
import {
  TODO_PRIORITY_LABELS,
  TODO_STATUS_LABELS,
  normalizeTodoListQuery,
} from './todos'

describe('todos api module helpers', () => {
  it('exports stable chinese labels for todo statuses and priorities', () => {
    expect(TODO_STATUS_LABELS.pending_review).toBe('\u5f85\u5ba1\u6838')
    expect(TODO_STATUS_LABELS.todo).toBe('\u5f85\u529e')
    expect(TODO_STATUS_LABELS.in_progress).toBe('\u8fdb\u884c\u4e2d')
    expect(TODO_STATUS_LABELS.completed).toBe('\u5df2\u5b8c\u6210')
    expect(TODO_STATUS_LABELS.canceled).toBe('\u5df2\u53d6\u6d88')

    expect(TODO_PRIORITY_LABELS.low).toBe('\u4f4e')
    expect(TODO_PRIORITY_LABELS.medium).toBe('\u4e2d')
    expect(TODO_PRIORITY_LABELS.high).toBe('\u9ad8')
  })

  it('normalizes todo list query params by trimming blanks and dropping empty filters', () => {
    expect(
      normalizeTodoListQuery({
        keyword: '  todo  ',
        status: '',
        priority: undefined,
        projectId: 22,
        page: 2,
        pageSize: 20,
      }),
    ).toEqual({
      keyword: 'todo',
      projectId: 22,
      page: 2,
      pageSize: 20,
    })
  })
})
