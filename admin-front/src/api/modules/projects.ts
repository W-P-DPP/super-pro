import type { ApiEnvelope } from '@super-pro/shared-types'
import { RequestError, request } from '../request'

export interface ProjectResponseDto {
  id: number
  projectName: string
  projectCode: string
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
  remark?: string
}

export interface ProjectListQueryDto {
  keyword?: string
  page?: number
  pageSize?: number
}

export interface ProjectListDto {
  items: ProjectResponseDto[]
  total: number
  page: number
  pageSize: number
}

export interface CreateProjectRequestDto {
  projectName: string
  projectCode: string
  remark?: string
}

export interface UpdateProjectRequestDto {
  projectName?: string
  projectCode?: string
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

export function getProjects(query: ProjectListQueryDto) {
  return unwrapResponse(
    request.get<ApiResponse<ProjectListDto>>('/project/getProject', {
      params: query,
      requiresAuth: true,
    }),
    '获取项目列表失败，请稍后重试。',
  ).then((data) => data ?? { items: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? 10 })
}

export function createProject(payload: CreateProjectRequestDto) {
  return unwrapResponse(
    request.post<ApiResponse<ProjectResponseDto>, CreateProjectRequestDto>('/project/createProject', payload, {
      requiresAuth: true,
    }),
    '新增项目失败，请稍后重试。',
  )
}

export function updateProject(id: number, payload: UpdateProjectRequestDto) {
  return unwrapResponse(
    request.put<ApiResponse<ProjectResponseDto>>(`/project/updateProject/${id}`, payload, {
      requiresAuth: true,
    }),
    '更新项目失败，请稍后重试。',
  )
}

export function deleteProject(id: number) {
  return unwrapResponse(
    request.delete<ApiResponse<ProjectResponseDto>>(`/project/deleteProject/${id}`, {
      requiresAuth: true,
    }),
    '删除项目失败，请稍后重试。',
  )
}
