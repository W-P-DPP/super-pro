import type {
  ApiEnvelope,
  AuthorizationPermissionSummary,
  AuthorizationRoleDetail,
  AuthorizationRoleSummary,
  AuthorizationResourceType,
} from '@super-pro/shared-types'
import { RequestError, request } from '../request'

export interface AuthorizationPermissionResponseDto extends AuthorizationPermissionSummary {}

export interface AuthorizationRoleResponseDto extends AuthorizationRoleDetail {
  memberCount?: number
}

export interface AuthorizationPermissionListDto {
  items: AuthorizationPermissionResponseDto[]
  total: number
  page: number
  pageSize: number
}

export interface AuthorizationRoleListDto {
  items: AuthorizationRoleResponseDto[]
  total: number
  page: number
  pageSize: number
}

export interface AuthorizationUserProjectPermissionResponseDto {
  id: number
  projectCode: string
  projectName: string
  roles: AuthorizationRoleSummary[]
  permissions: AuthorizationPermissionSummary[]
}

export interface AuthorizationUserProjectPermissionListDto {
  items: AuthorizationUserProjectPermissionResponseDto[]
}

export interface AuthorizationPermissionListQueryDto {
  appCode?: string
  keyword?: string
  resourceType?: AuthorizationResourceType
  status?: number
  page?: number
  pageSize?: number
}

export interface AuthorizationRoleListQueryDto {
  appCode?: string
  keyword?: string
  status?: number
  page?: number
  pageSize?: number
}

export interface CreateAuthorizationRoleRequestDto {
  code: string
  name: string
  description?: string
  status?: number
  permissionIds?: number[]
}

export interface CreateAuthorizationPermissionRequestDto {
  code: string
  appCode: string
  resourceType: AuthorizationPermissionSummary['resourceType']
  resourceCode: string
  action: string
  name: string
  description?: string
  status?: number
}

export interface UpdateAuthorizationPermissionRequestDto {
  code?: string
  appCode?: string
  resourceType?: AuthorizationPermissionSummary['resourceType']
  resourceCode?: string
  action?: string
  name?: string
  description?: string
  status?: number
}

export interface UpdateAuthorizationRoleRequestDto {
  code?: string
  name?: string
  description?: string
  status?: number
  permissionIds?: number[]
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

export function getAuthorizationPermissions(query: AuthorizationPermissionListQueryDto = {}) {
  return unwrapResponse(
    request.get<ApiResponse<AuthorizationPermissionListDto>>('/authorization/permissions', {
      params: query,
      requiresAuth: true,
    }),
    '获取权限列表失败，请稍后重试。',
  ).then((data) => data ?? { items: [], total: 0, page: 1, pageSize: 0 })
}

export function getAuthorizationRoles(query: AuthorizationRoleListQueryDto = {}) {
  return unwrapResponse(
    request.get<ApiResponse<AuthorizationRoleListDto>>('/authorization/roles', {
      params: query,
      requiresAuth: true,
    }),
    '获取角色列表失败，请稍后重试。',
  ).then((data) => data ?? { items: [], total: 0, page: 1, pageSize: 0 })
}

export function getUserProjectPermissions(userId: number) {
  return unwrapResponse(
    request.get<ApiResponse<AuthorizationUserProjectPermissionListDto>>(
      `/authorization/users/${userId}/projects`,
      {
        requiresAuth: true,
      },
    ),
    '获取用户项目权限失败，请稍后重试。',
  ).then((data) => data ?? { items: [] })
}

export function createAuthorizationRole(payload: CreateAuthorizationRoleRequestDto) {
  return unwrapResponse(
    request.post<ApiResponse<AuthorizationRoleResponseDto>, CreateAuthorizationRoleRequestDto>(
      '/authorization/roles',
      payload,
      {
        requiresAuth: true,
      },
    ),
    '创建角色失败，请稍后重试。',
  )
}

export function createAuthorizationPermission(payload: CreateAuthorizationPermissionRequestDto) {
  return unwrapResponse(
    request.post<ApiResponse<AuthorizationPermissionResponseDto>, CreateAuthorizationPermissionRequestDto>(
      '/authorization/permissions',
      payload,
      {
        requiresAuth: true,
      },
    ),
    '创建权限失败，请稍后重试。',
  )
}

export function updateAuthorizationPermission(
  id: number,
  payload: UpdateAuthorizationPermissionRequestDto,
) {
  return unwrapResponse(
    request.put<ApiResponse<AuthorizationPermissionResponseDto>>(
      `/authorization/permissions/${id}`,
      payload,
      {
        requiresAuth: true,
      },
    ),
    '更新权限失败，请稍后重试。',
  )
}

export function deleteAuthorizationPermission(id: number) {
  return unwrapResponse(
    request.delete<ApiResponse<AuthorizationPermissionResponseDto>>(`/authorization/permissions/${id}`, {
      requiresAuth: true,
    }),
    '删除权限失败，请稍后重试。',
  )
}

export function updateAuthorizationRole(id: number, payload: UpdateAuthorizationRoleRequestDto) {
  return unwrapResponse(
    request.put<ApiResponse<AuthorizationRoleResponseDto>>(`/authorization/roles/${id}`, payload, {
      requiresAuth: true,
    }),
    '更新角色失败，请稍后重试。',
  )
}

export function deleteAuthorizationRole(id: number) {
  return unwrapResponse(
    request.delete<ApiResponse<AuthorizationRoleResponseDto>>(`/authorization/roles/${id}`, {
      requiresAuth: true,
    }),
    '删除角色失败，请稍后重试。',
  )
}

export const AUTHORIZATION_RESOURCE_TYPE_OPTIONS = [
  'menu',
  'route',
  'button',
  'api',
  'data',
] as const satisfies readonly AuthorizationResourceType[]
