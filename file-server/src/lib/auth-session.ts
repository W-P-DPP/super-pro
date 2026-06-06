import {
  WORKSPACE_LOGIN_PATH,
  WORKSPACE_PRODUCTION_ORIGIN,
  joinUrl,
} from '@super-pro/shared-constants'
import {
  buildLoginRedirectUrl as buildSharedLoginRedirectUrl,
  createAuthSessionStore,
  normalizeAbsoluteUrl,
  redirectToUrl,
} from '@super-pro/shared-web'

const LOGIN_TEMPLATE_AUTH_STORAGE_KEY = 'login-template.auth'

const authSessionStore = createAuthSessionStore({
  storageKey: LOGIN_TEMPLATE_AUTH_STORAGE_KEY,
})

export function getAuthToken(): string | null {
  return authSessionStore.getReusableAuthToken()
}

export function getLoginUrl() {
  const configured = import.meta.env.VITE_STRICT_MENU_LOGIN_URL?.trim()
  return normalizeAbsoluteUrl(
    configured || joinUrl(WORKSPACE_PRODUCTION_ORIGIN, WORKSPACE_LOGIN_PATH),
  )
}

function appendLoginMessage(target: string, message?: string) {
  const trimmedMessage = message?.trim()
  if (!trimmedMessage) {
    return target
  }

  const url = new URL(target)
  url.searchParams.set('message', trimmedMessage)
  return url.toString()
}

export function buildLoginRedirectUrl(target: string, message?: string) {
  return appendLoginMessage(buildSharedLoginRedirectUrl(getLoginUrl(), target), message)
}

export function redirectToLoginPage(target?: string, message?: string) {
  const redirectTarget =
    target ??
    (typeof window !== 'undefined' ? window.location.href : '')

  return redirectToUrl(
    appendLoginMessage(buildSharedLoginRedirectUrl(getLoginUrl(), redirectTarget, {
      developmentRedirectHandoff:
        target === undefined && import.meta.env.DEV
          ? import.meta.env.VITE_DEV_PROJECT_URL
          : undefined,
    }), message),
  )
}

export function shouldRedirectToLogin(status: number) {
  return status === 401
}
