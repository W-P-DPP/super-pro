import { beforeEach, describe, expect, it, vi } from 'vitest'

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}))

vi.mock('../request', () => ({
  request: {
    post: postMock,
  },
  RequestError: class RequestError extends Error {},
}))

import { submitSuggestion } from './todo-suggestion'

describe('front-public todo suggestion api', () => {
  beforeEach(() => {
    postMock.mockReset()
  })

  it('submits anonymous suggestion with zwpsite source app and public request config', async () => {
    postMock.mockResolvedValue({
      code: 200,
      msg: '提交建议成功',
      data: {
        id: 2,
      },
      timestamp: Date.now(),
    })

    await submitSuggestion({
      sourceApp: 'zwpsite',
      title: '公开站建议',
      description: '建议增加快捷筛选',
      pageUrl: 'http://localhost:5174/zwpsite/#/tools',
    })

    expect(postMock).toHaveBeenCalledWith(
      '/todo/submitSuggestion',
      {
        sourceApp: 'zwpsite',
        title: '公开站建议',
        description: '建议增加快捷筛选',
        pageUrl: 'http://localhost:5174/zwpsite/#/tools',
      },
      {
        requiresAuth: false,
      },
    )
  })
})
