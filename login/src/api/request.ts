import {
  createJsonRequestClient,
  type RequestConfig,
  RequestError,
  shouldRedirectToLoginForRequestError,
} from '@super-pro/shared-web'
import { getAuthToken } from '@/lib/auth-storage'

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || '/api'

const client = createJsonRequestClient({
  baseURL,
  timeout: 10000,
  getAccessToken: getAuthToken,
  defaultRequiresAuth: false,
})

export { RequestError, shouldRedirectToLoginForRequestError, type RequestConfig }
export const requestClient = client.requestClient
export const request = client.request
