import type {
  ApiEnvelope,
  CreateGlobalConfigRequestDto,
  GlobalConfigListDto,
  GlobalConfigListQueryDto,
  GlobalConfigResponseDto,
  UpdateGlobalConfigRequestDto,
} from '@super-pro/shared-types'
import { RequestError, request } from '../request'

type ApiResponse<T> = ApiEnvelope<T> & {
  timestamp: number
}

export type GlobalConfigListQueryInput = {
  keyword?: string
  projectId?: number
  status?: number | ''
  page?: number
  pageSize?: number
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

export function normalizeGlobalConfigListQuery(
  query: GlobalConfigListQueryInput,
): GlobalConfigListQueryDto {
  const normalizedQuery: GlobalConfigListQueryDto = {
    ...(query.page !== undefined ? { page: query.page } : {}),
    ...(query.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
  }

  const keyword = query.keyword?.trim()
  if (keyword) {
    normalizedQuery.keyword = keyword
  }

  if (typeof query.projectId === 'number' && Number.isInteger(query.projectId) && query.projectId > 0) {
    normalizedQuery.projectId = query.projectId
  }

  if (query.status === 0 || query.status === 1) {
    normalizedQuery.status = query.status
  }

  return normalizedQuery
}

export function getGlobalConfigs(query: GlobalConfigListQueryInput) {
  const normalizedQuery = normalizeGlobalConfigListQuery(query)

  return unwrapResponse(
    request.get<ApiResponse<GlobalConfigListDto>>('/global-config/getGlobalConfig', {
      params: normalizedQuery,
      requiresAuth: true,
    }),
    '获取全局配置列表失败，请稍后重试。',
  ).then(
    (data) =>
      data ?? {
        items: [],
        total: 0,
        page: normalizedQuery.page ?? 1,
        pageSize: normalizedQuery.pageSize ?? 10,
      },
  )
}

export function getGlobalConfigDetail(id: number) {
  return unwrapResponse(
    request.get<ApiResponse<GlobalConfigResponseDto>>(`/global-config/getGlobalConfig/${id}`, {
      requiresAuth: true,
    }),
    '获取全局配置详情失败，请稍后重试。',
  )
}

export function createGlobalConfig(payload: CreateGlobalConfigRequestDto) {
  return unwrapResponse(
    request.post<ApiResponse<GlobalConfigResponseDto>, CreateGlobalConfigRequestDto>(
      '/global-config/createGlobalConfig',
      payload,
      {
        requiresAuth: true,
      },
    ),
    '新增全局配置失败，请稍后重试。',
  )
}

export function updateGlobalConfig(id: number, payload: UpdateGlobalConfigRequestDto) {
  return unwrapResponse(
    request.put<ApiResponse<GlobalConfigResponseDto>>(
      `/global-config/updateGlobalConfig/${id}`,
      payload,
      {
        requiresAuth: true,
      },
    ),
    '更新全局配置失败，请稍后重试。',
  )
}

export function deleteGlobalConfig(id: number) {
  return unwrapResponse(
    request.delete<ApiResponse<GlobalConfigResponseDto>>(
      `/global-config/deleteGlobalConfig/${id}`,
      {
        requiresAuth: true,
      },
    ),
    '删除全局配置失败，请稍后重试。',
  )
}
