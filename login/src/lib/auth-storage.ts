import type { LoginResponse } from '@/lib/auth-client'
import type { StoredAuthSession } from '@super-pro/shared-types'
import { createAuthSessionStore } from '@super-pro/shared-web'

export function isExpiredAuthSession(session: StoredAuthSession) {
  return typeof session.expiresAt === 'number' && session.expiresAt <= Date.now()
}

const AUTH_STORAGE_KEY = 'login-template.auth'
const authSessionStore = createAuthSessionStore({
  storageKey: AUTH_STORAGE_KEY,
  directTokenStorageKey: false,
})

export function createStoredAuthSession(payload: LoginResponse): StoredAuthSession {
  return {
    token: payload.token,
    tokenType: payload.tokenType,
    expiresAt: Date.now() + payload.expiresIn * 1000,
  }
}

export function saveAuthSession(payload: LoginResponse) {
  authSessionStore.writeReusableAuthSession(createStoredAuthSession(payload))
}

export function readAuthSession(): StoredAuthSession | null {
  return authSessionStore.readReusableAuthSession()
}

export function getAuthToken() {
  return authSessionStore.getReusableAuthToken()
}

export function clearAuthSession() {
  authSessionStore.clearReusableAuthSession()
}
