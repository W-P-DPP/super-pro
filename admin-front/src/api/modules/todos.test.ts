import { describe, expect, it } from 'vitest'
import {
  TODO_PRIORITY_LABELS,
  TODO_STATUS_LABELS,
  normalizeTodoListQuery,
} from './todos'

describe('todos api module helpers', () => {
  it('exports stable chinese labels for todo statuses and priorities', () => {
    expect(TODO_STATUS_LABELS.pending_review).toBe('待审核')
    expect(TODO_STATUS_LABELS.todo).toBe('待办')
    expect(TODO_STATUS_LABELS.in_progress).toBe('进行中')
    expect(TODO_STATUS_LABELS.completed).toBe('已完成')
    expect(TODO_STATUS_LABELS.canceled).toBe('已取消')

    expect(TODO_PRIORITY_LABELS.low).toBe('低')
    expect(TODO_PRIORITY_LABELS.medium).toBe('中')
    expect(TODO_PRIORITY_LABELS.high).toBe('高')
  })

  it('normalizes todo list query params by trimming blanks and dropping empty filters', () => {
    expect(
      normalizeTodoListQuery({
        keyword: '  待办  ',
        status: '',
        priority: undefined,
        assigneeKeyword: '  张三  ',
        page: 2,
        pageSize: 20,
      }),
    ).toEqual({
      keyword: '待办',
      assigneeKeyword: '张三',
      page: 2,
      pageSize: 20,
    })
  })
})
