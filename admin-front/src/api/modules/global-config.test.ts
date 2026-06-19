import { describe, expect, it } from 'vitest'
import { normalizeGlobalConfigListQuery } from './global-config'

describe('global config api module helpers', () => {
  it('normalizes global config list query by trimming keyword and dropping empty filters', () => {
    expect(
      normalizeGlobalConfigListQuery({
        keyword: '  site  ',
        status: '',
        projectId: 12,
        page: 2,
        pageSize: 20,
      }),
    ).toEqual({
      keyword: 'site',
      projectId: 12,
      page: 2,
      pageSize: 20,
    })
  })
})
