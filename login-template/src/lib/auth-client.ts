export type UserRole = 'admin' | 'guest'

export type AuthenticatedUser = {
  id: number
  username: string
  nickname: string
  email: string
  phone: string
  status: number
  role: UserRole
}

export type LoginRequest = {
  username: string
  password: string
}

type EncryptedLoginRequest = {
  username: string
  passwordCiphertext: string
}

type LoginPublicKeyResponse = {
  publicKey: string
}

export type LoginResponse = {
  token: string
  tokenType: 'Bearer'
  expiresIn: number
}

export type RegisterRequest = {
  username: string
  password: string
}

export type RegisterResponse = AuthenticatedUser

type ApiEnvelope<T> = {
  code: number
  msg: string
  data: T
}

const DEFAULT_DEV_API_BASE_URL = 'http://127.0.0.1:30010'

export class AuthApiError extends Error {
  readonly statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'AuthApiError'
    this.statusCode = statusCode
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()

  if (configured) {
    return trimTrailingSlash(configured)
  }

  if (import.meta.env.DEV) {
    return DEFAULT_DEV_API_BASE_URL
  }

  return ''
}

function getEndpoint(path: string) {
  return `${getApiBaseUrl()}${path}`
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.username === 'string' &&
    typeof candidate.nickname === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.phone === 'string' &&
    typeof candidate.status === 'number' &&
    (candidate.role === 'admin' || candidate.role === 'guest')
  )
}

function isLoginPublicKeyResponse(value: unknown): value is LoginPublicKeyResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.publicKey === 'string' &&
    candidate.publicKey.includes('BEGIN PUBLIC KEY')
  )
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    candidate.tokenType === 'Bearer' &&
    typeof candidate.expiresIn === 'number' &&
    candidate.expiresIn > 0
  )
}

function isApiEnvelope<T>(
  value: unknown,
  guard: (data: unknown) => data is T,
): value is ApiEnvelope<T> {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.code === 'number' &&
    typeof candidate.msg === 'string' &&
    guard(candidate.data)
  )
}

async function parseResponseBody(response: Response) {
  try {
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

async function requestJson<T>(
  path: string,
  method: 'GET' | 'POST',
  guard: (data: unknown) => data is T,
  input?: Record<string, unknown>,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(getEndpoint(path), {
      method,
      headers: input
        ? {
            'Content-Type': 'application/json',
          }
        : undefined,
      ...(input ? { body: JSON.stringify(input) } : {}),
    })
  } catch {
    throw new AuthApiError('请求发送失败，请确认后端服务已启动')
  }

  const body = await parseResponseBody(response)

  if (!response.ok) {
    if (body && typeof body === 'object' && typeof (body as { msg?: unknown }).msg === 'string') {
      throw new AuthApiError((body as { msg: string }).msg, response.status)
    }

    throw new AuthApiError('请求失败，请稍后重试', response.status)
  }

  if (!isApiEnvelope(body, guard)) {
    throw new AuthApiError('接口返回结构异常，请检查后端响应')
  }

  if (body.code !== 200) {
    throw new AuthApiError(body.msg || '请求失败，请稍后重试', body.code)
  }

  return body.data
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '')

  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return window.btoa(binary)
}

function getWebCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new AuthApiError('当前浏览器不支持登录加密，请更换浏览器后重试')
  }

  return globalThis.crypto
}

async function encryptPassword(password: string, publicKey: string) {
  const cryptoApi = getWebCrypto()

  try {
    const importedKey = await cryptoApi.subtle.importKey(
      'spki',
      pemToArrayBuffer(publicKey),
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['encrypt'],
    )

    const encrypted = await cryptoApi.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      importedKey,
      new TextEncoder().encode(password),
    )

    return arrayBufferToBase64(encrypted)
  } catch {
    throw new AuthApiError('登录密码加密失败，请刷新页面后重试')
  }
}

function getLoginPublicKey() {
  return requestJson('/api/user/getLoginPublicKey', 'GET', isLoginPublicKeyResponse)
}

function postJson<T>(
  path: string,
  input: Record<string, unknown>,
  guard: (data: unknown) => data is T,
) {
  return requestJson(path, 'POST', guard, input)
}

export async function loginUser(input: LoginRequest) {
  const keyPayload = await getLoginPublicKey()
  const passwordCiphertext = await encryptPassword(input.password, keyPayload.publicKey)
  const payload: EncryptedLoginRequest = {
    username: input.username,
    passwordCiphertext,
  }

  return postJson('/api/user/loginUser', payload, isLoginResponse)
}

export function registerUser(input: RegisterRequest) {
  return postJson('/api/user/registerUser', input, isAuthenticatedUser)
}
