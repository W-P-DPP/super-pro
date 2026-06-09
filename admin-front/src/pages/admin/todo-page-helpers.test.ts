import { describe, expect, it } from 'vitest'
import { resolveTodoProjectOption, type TodoProjectOption } from './todo-page-helpers'

const projectOptions: TodoProjectOption[] = [
  {
    id: 11,
    projectName: '管理后台',
    projectCode: 'admin-console',
  },
  {
    id: 22,
    projectName: '公开站点',
    projectCode: 'zwpsite',
  },
]

describe('todo-page-helpers', () => {
  it('prefers project object from todo response when available', () => {
    expect(
      resolveTodoProjectOption(
        {
          projectId: 11,
          project: {
            id: 11,
            projectName: '后台系统',
            projectCode: 'BMS',
          },
        },
        projectOptions,
      ),
    ).toEqual({
      id: 11,
      projectName: '后台系统',
      projectCode: 'BMS',
    })
  })

  it('falls back to loaded project options when todo project is missing', () => {
    expect(
      resolveTodoProjectOption(
        {
          projectId: 22,
          project: null,
        },
        projectOptions,
      ),
    ).toEqual({
      id: 22,
      projectName: '公开站点',
      projectCode: 'zwpsite',
    })
  })
})
