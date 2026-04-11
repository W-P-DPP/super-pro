import { afterEach, describe, expect, it } from 'vitest'
import {
  buildStrictMenuLoginRedirectUrl,
  getStrictMenuLoginUrl,
  normalizeMenuTargetUrl,
} from './strict-menu-redirect'

const originalLoginUrl = import.meta.env.VITE_STRICT_MENU_LOGIN_URL

afterEach(() => {
  if (originalLoginUrl === undefined) {
    delete import.meta.env.VITE_STRICT_MENU_LOGIN_URL
    return
  }

  import.meta.env.VITE_STRICT_MENU_LOGIN_URL = originalLoginUrl
})

describe('strict-menu-redirect', () => {
  it('规范化 host-like 登录地址并保留端口', () => {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'www.zwpsite.icu:8082/login'

    expect(getStrictMenuLoginUrl()).toBe('http://www.zwpsite.icu:8082/login')
  })

  it('规范化菜单目标地址并保留端口', () => {
    expect(normalizeMenuTargetUrl('www.zwpsite.icu:9000/tool')).toBe(
      'http://www.zwpsite.icu:9000/tool',
    )
  })

  it('生成 strict 登录跳转地址时携带完整 redirect 参数', () => {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'www.zwpsite.icu:8082/login'

    expect(buildStrictMenuLoginRedirectUrl('www.zwpsite.icu:9000/tool')).toBe(
      'http://www.zwpsite.icu:8082/login?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A9000%2Ftool',
    )
  })
})
