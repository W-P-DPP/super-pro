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

describe('admin todo suggestion api', () => {
  beforeEach(() => {
    postMock.mockReset()
  })

  it('submits anonymous suggestion with admin source app and public request config', async () => {
    postMock.mockResolvedValue({
      code: 200,
      msg: '提交建议成功',
      data: {
        id: 1,
      },
      timestamp: Date.now(),
    })

    await submitSuggestion({
      sourceApp: 'admin-front',
      title: '补充建议入口',
      description: '希望能更快反馈问题',
      pageUrl: 'http://localhost:5173/#/dashboard',
    })

    expect(postMock).toHaveBeenCalledWith(
      '/todo/submitSuggestion',
      {
        sourceApp: 'admin-front',
        title: '补充建议入口',
        description: '希望能更快反馈问题',
        pageUrl: 'http://localhost:5173/#/dashboard',
      },
      {
        requiresAuth: false,
      },
    )
  })
})
