import type { ApiEnvelope } from '@super-pro/shared-types'
import { RequestError, request } from '../request'

export const UserRoleEnum = {
  Admin: 'admin',
  Employee: 'employee',
  Approver: 'approver',
  Guest: 'guest',
} as const

export type UserRoleEnum = (typeof UserRoleEnum)[keyof typeof UserRoleEnum]

export interface UserResponseDto {
  id: number
  username: string
  nickname: string
  email: string
  phone: string
  status: number
  role: UserRoleEnum
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
  remark?: string
}

export interface UserListQueryDto {
  keyword?: string
  role?: UserRoleEnum
  status?: number
  page?: number
  pageSize?: number
}

export interface UserListDto {
  items: UserResponseDto[]
  total: number
  page: number
  pageSize: number
}

export interface CreateUserRequestDto {
  username: string
  nickname: string
  email?: string
  phone?: string
  status?: number
  role?: UserRoleEnum
  remark?: string
  password?: string
}

export interface UpdateUserRequestDto {
  username?: string
  nickname?: string
  email?: string
  phone?: string
  status?: number
  role?: UserRoleEnum
  remark?: string
  password?: string
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

export function getUsers(query: UserListQueryDto) {
  return unwrapResponse(
    request.get<ApiResponse<UserListDto>>('/user/getUser', {
      params: query,
      requiresAuth: true,
    }),
    '获取用户列表失败，请稍后重试。',
  ).then((data) => data ?? { items: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? 10 })
}

export function getUserDetail(id: number) {
  return unwrapResponse(
    request.get<ApiResponse<UserResponseDto>>(`/user/getUser/${id}`, {
      requiresAuth: true,
    }),
    '获取用户详情失败，请稍后重试。',
  )
}

export function createUser(payload: CreateUserRequestDto) {
  return unwrapResponse(
    request.post<ApiResponse<UserResponseDto>, CreateUserRequestDto>('/user/createUser', payload, {
      requiresAuth: true,
    }),
    '新增用户失败，请稍后重试。',
  )
}

export function updateUser(id: number, payload: UpdateUserRequestDto) {
  return unwrapResponse(
    request.put<ApiResponse<UserResponseDto>>(`/user/updateUser/${id}`, payload, {
      requiresAuth: true,
    }),
    '更新用户失败，请稍后重试。',
  )
}

export function deleteUser(id: number) {
  return unwrapResponse(
    request.delete<ApiResponse<UserResponseDto>>(`/user/deleteUser/${id}`, {
      requiresAuth: true,
    }),
    '删除用户失败，请稍后重试。',
  )
}
