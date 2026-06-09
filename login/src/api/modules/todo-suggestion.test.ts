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

describe('login todo suggestion api', () => {
  beforeEach(() => {
    postMock.mockReset()
  })

  it('submits anonymous suggestion with login source app and public request config', async () => {
    postMock.mockResolvedValue({
      code: 200,
      msg: '提交建议成功',
      data: {
        id: 3,
      },
      timestamp: Date.now(),
    })

    await submitSuggestion({
      sourceApp: 'login',
      title: '登录页建议',
      description: '建议补一个忘记密码入口',
      pageUrl: 'http://localhost:5175/login/',
    })

    expect(postMock).toHaveBeenCalledWith(
      '/todo/submitSuggestion',
      {
        sourceApp: 'login',
        title: '登录页建议',
        description: '建议补一个忘记密码入口',
        pageUrl: 'http://localhost:5175/login/',
      },
      {
        requiresAuth: false,
      },
    )
  })
})
