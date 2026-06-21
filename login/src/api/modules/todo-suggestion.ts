import type { ApiEnvelope, SubmitSuggestionRequestDto, TodoResponseDto } from '@super-pro/shared-types'
import { RequestError, request } from '../request'

type ApiResponse<T> = ApiEnvelope<T> & {
  timestamp: number
}

async function unwrapResponse<T>(promise: Promise<ApiResponse<T>>, fallbackMessage: string) {
  const response = await promise

  if (response.code !== 200) {
    throw new RequestError(response.msg || fallbackMessage, {
      status: response.code,
      details: response,
    })
  }

  return response.data
}

export function submitSuggestion(payload: SubmitSuggestionRequestDto) {
  return unwrapResponse(
    request.post<ApiResponse<TodoResponseDto>, SubmitSuggestionRequestDto>('/todo/submitSuggestion', payload, {
      requiresAuth: false,
    }),
    '提交建议失败，请稍后重试。',
  )
}
