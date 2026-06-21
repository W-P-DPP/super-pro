import type { ApiEnvelope } from '@super-pro/shared-types'
import { RequestError, request } from '../request'

export interface __Resource__ResponseDto {
  id: number
  name: string
  status: number
  createTime?: string
  updateTime?: string
  remark?: string
}

export interface __Resource__ListQueryDto {
  keyword?: string
  status?: number
  page?: number
  pageSize?: number
}

export interface __Resource__ListDto {
  items: __Resource__ResponseDto[]
  total: number
  page: number
  pageSize: number
}

export interface Create__Resource__RequestDto {
  name: string
  status?: number
  remark?: string
}

export interface Update__Resource__RequestDto {
  name?: string
  status?: number
  remark?: string
}

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

export function get__Resource__List(query: __Resource__ListQueryDto = {}) {
  return unwrapResponse(
    request.get<ApiResponse<__Resource__ListDto>>('/__resource__', {
      params: query,
      requiresAuth: true,
    }),
    '获取__RESOURCE_LABEL__列表失败，请稍后重试。',
  ).then(
    (data) =>
      data ?? {
        items: [],
        total: 0,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 10,
      },
  )
}

export function get__Resource__Detail(id: number) {
  return unwrapResponse(
    request.get<ApiResponse<__Resource__ResponseDto>>(`/__resource__/${id}`, {
      requiresAuth: true,
    }),
    '获取__RESOURCE_LABEL__详情失败，请稍后重试。',
  )
}

export function create__Resource__(payload: Create__Resource__RequestDto) {
  return unwrapResponse(
    request.post<ApiResponse<__Resource__ResponseDto>, Create__Resource__RequestDto>(
      '/__resource__',
      payload,
      {
        requiresAuth: true,
      },
    ),
    '创建__RESOURCE_LABEL__失败，请稍后重试。',
  )
}

export function update__Resource__(id: number, payload: Update__Resource__RequestDto) {
  return unwrapResponse(
    request.put<ApiResponse<__Resource__ResponseDto>>(`/__resource__/${id}`, payload, {
      requiresAuth: true,
    }),
    '更新__RESOURCE_LABEL__失败，请稍后重试。',
  )
}

export function delete__Resource__(id: number) {
  return unwrapResponse(
    request.delete<ApiResponse<__Resource__ResponseDto>>(`/__resource__/${id}`, {
      requiresAuth: true,
    }),
    '删除__RESOURCE_LABEL__失败，请稍后重试。',
  )
}
