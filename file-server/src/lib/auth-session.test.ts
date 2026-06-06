import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAuthToken, redirectToLoginPage } from './auth-session'

const originalWindow = globalThis.window
const originalLoginUrl = import.meta.env.VITE_STRICT_MENU_LOGIN_URL
const originalDevProjectUrl = import.meta.env.VITE_DEV_PROJECT_URL

afterEach(() => {
  vi.unstubAllGlobals()

  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window')
  } else {
    vi.stubGlobal('window', originalWindow)
  }

  if (originalLoginUrl === undefined) {
    delete import.meta.env.VITE_STRICT_MENU_LOGIN_URL
  } else {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = originalLoginUrl
  }

  if (originalDevProjectUrl === undefined) {
    delete import.meta.env.VITE_DEV_PROJECT_URL
  } else {
    import.meta.env.VITE_DEV_PROJECT_URL = originalDevProjectUrl
  }
})

describe('file-server auth-session', () => {
  it('uses the configured development project url when redirecting the current page to login', () => {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'http://127.0.0.1:12697/login/'
    import.meta.env.VITE_DEV_PROJECT_URL = 'http://127.0.0.1:16697/file-server/'

    const assign = vi.fn()

    vi.stubGlobal('window', {
      location: {
        href: 'http://www.zwpsite.icu:8082/file-server/workspace/docs?name=readme#preview',
        assign,
      },
      localStorage: {
        getItem: vi.fn(() => null),
        removeItem: vi.fn(),
        setItem: vi.fn(),
      },
    })

    const redirectedUrl = redirectToLoginPage()

    expect(redirectedUrl).toBe(
      'http://127.0.0.1:12697/login/?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A8082%2Ffile-server%2Fworkspace%2Fdocs%3Fname%3Dreadme%23preview&spdev=http%3A%2F%2F127.0.0.1%3A16697%2Ffile-server%2F',
    )
    expect(assign).toHaveBeenCalledWith(redirectedUrl)
  })

  it('appends the login message when redirecting to login', () => {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'http://127.0.0.1:12697/login/'

    const assign = vi.fn()

    vi.stubGlobal('window', {
      location: {
        href: 'http://www.zwpsite.icu:8082/file-server/workspace',
        assign,
      },
      localStorage: {
        getItem: vi.fn(() => null),
        removeItem: vi.fn(),
        setItem: vi.fn(),
      },
    })

    const redirectedUrl = redirectToLoginPage(undefined, '用户无权限进入该项目')

    expect(redirectedUrl).toBe(
      'http://127.0.0.1:12697/login/?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A8082%2Ffile-server%2Fworkspace&message=%E7%94%A8%E6%88%B7%E6%97%A0%E6%9D%83%E9%99%90%E8%BF%9B%E5%85%A5%E8%AF%A5%E9%A1%B9%E7%9B%AE',
    )
    expect(assign).toHaveBeenCalledWith(redirectedUrl)
  })
})
