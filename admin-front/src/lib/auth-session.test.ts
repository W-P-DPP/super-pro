// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getReusableAuthToken,
  isStoredAuthSession,
  LOGIN_TEMPLATE_AUTH_STORAGE_KEY,
  readReusableAuthSession,
} from './auth-session'

describe('auth-session', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('should prefer localStorage.token when both token sources exist', () => {
    localStorage.setItem('token', 'direct-token')
    localStorage.setItem(
      LOGIN_TEMPLATE_AUTH_STORAGE_KEY,
      JSON.stringify({
        token: 'session-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 60_000,
      }),
    )

    expect(getReusableAuthToken()).toBe('direct-token')
  })

  it('should fallback to login-template.auth when direct token is absent', () => {
    localStorage.setItem(
      LOGIN_TEMPLATE_AUTH_STORAGE_KEY,
      JSON.stringify({
        token: 'session-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 60_000,
      }),
    )

    expect(readReusableAuthSession()).toEqual(
      expect.objectContaining({
        token: 'session-token',
        tokenType: 'Bearer',
      }),
    )
    expect(getReusableAuthToken()).toBe('session-token')
  })

  it('should ignore invalid stored login sessions', () => {
    localStorage.setItem(LOGIN_TEMPLATE_AUTH_STORAGE_KEY, JSON.stringify({ token: '' }))

    expect(readReusableAuthSession()).toBeNull()
    expect(getReusableAuthToken()).toBeNull()
  })

  it('should validate stored auth session shape', () => {
    expect(isStoredAuthSession({ token: 'abc', tokenType: 'Bearer', expiresAt: Date.now() })).toBe(
      true,
    )
    expect(isStoredAuthSession({ token: 'abc', tokenType: 'Basic' })).toBe(false)
  })

  it('should consume query auth handoff and clear spauth from the current url', () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')

    window.history.replaceState(
      {},
      '',
      '/admin-front/?spauth=%7B%22key%22%3A%22super-pro.auth-handoff%22%2C%22session%22%3A%7B%22token%22%3A%22handoff-token%22%2C%22tokenType%22%3A%22Bearer%22%2C%22expiresAt%22%3A4102444800000%7D%7D#/users',
    )

    expect(getReusableAuthToken()).toBe('handoff-token')
    expect(localStorage.getItem(LOGIN_TEMPLATE_AUTH_STORAGE_KEY)).toContain('"token":"handoff-token"')
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/admin-front/#/users')
  })
})
