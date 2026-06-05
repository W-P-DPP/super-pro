import type {
  AdminMenuResponseDto,
  ApiEnvelope,
  CreateAdminMenuRequestDto,
  UpdateAdminMenuRequestDto,
} from '@super-pro/shared-types'
import { RequestError, request } from '../request'

type ApiResponse<T> = ApiEnvelope<T> & {
  timestamp: number
}

let cachedAdminMenuTree: AdminMenuResponseDto[] | null = null
let adminMenuTreeRequest: Promise<AdminMenuResponseDto[]> | null = null

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

function clearAdminMenuTreeCache() {
  cachedAdminMenuTree = null
  adminMenuTreeRequest = null
}

async function fetchAdminMenuTree() {
  const data = await unwrapResponse(
    request.get<ApiResponse<AdminMenuResponseDto[]>>('/admin-menu/getMenu', {
      requiresAuth: true,
    }),
    '获取后台菜单失败，请稍后重试。',
  )

  return data ?? []
}

export async function getAdminMenuTree(options?: { forceRefresh?: boolean }) {
  if (options?.forceRefresh) {
    clearAdminMenuTreeCache()
  }

  if (cachedAdminMenuTree) {
    return cachedAdminMenuTree
  }

  if (!adminMenuTreeRequest) {
    adminMenuTreeRequest = fetchAdminMenuTree()
      .then((data) => {
        cachedAdminMenuTree = data
        return data
      })
      .finally(() => {
        adminMenuTreeRequest = null
      })
  }

  return adminMenuTreeRequest
}

export async function createAdminMenu(payload: CreateAdminMenuRequestDto) {
  const data = await unwrapResponse(
    request.post<ApiResponse<AdminMenuResponseDto>, CreateAdminMenuRequestDto>(
      '/admin-menu/createMenu',
      payload,
      {
        requiresAuth: true,
      },
    ),
    '新增后台菜单失败，请稍后重试。',
  )

  clearAdminMenuTreeCache()
  return data
}

export async function updateAdminMenu(id: number, payload: UpdateAdminMenuRequestDto) {
  const data = await unwrapResponse(
    request.put<ApiResponse<AdminMenuResponseDto>>(`/admin-menu/updateMenu/${id}`, payload, {
      requiresAuth: true,
    }),
    '更新后台菜单失败，请稍后重试。',
  )

  clearAdminMenuTreeCache()
  return data
}

export async function deleteAdminMenu(id: number) {
  const data = await unwrapResponse(
    request.delete<ApiResponse<AdminMenuResponseDto>>(`/admin-menu/deleteMenu/${id}`, {
      requiresAuth: true,
    }),
    '删除后台菜单失败，请稍后重试。',
  )

  clearAdminMenuTreeCache()
  return data
}
