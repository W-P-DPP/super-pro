import type {
  AdminMenuNodeType,
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

export interface AdminMenuListQueryDto {
  keyword?: string
  menuType?: AdminMenuNodeType
  status?: number
  page?: number
  pageSize?: number
}

export interface AdminMenuListItemDto {
  id: number
  parentId: number | null
  parentName: string
  level: number
  name: string
  shortTitle: string
  slug: string
  iconKey: string
  menuType: AdminMenuNodeType
  status: number
  sort: number
  description: string
  badge: string
  permissionCode: string
  remark: string
  updateTime: string
}

export interface AdminMenuListDto {
  items: AdminMenuListItemDto[]
  total: number
  page: number
  pageSize: number
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

export async function getAdminMenuList(query: AdminMenuListQueryDto) {
  const data = await unwrapResponse(
    request.get<ApiResponse<AdminMenuListDto>>('/admin-menu/getMenuList', {
      params: query,
      requiresAuth: true,
    }),
    '加载后台菜单列表失败，请稍后重试。',
  )

  return data ?? { items: [], total: 0, page: 1, pageSize: 0 }
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
