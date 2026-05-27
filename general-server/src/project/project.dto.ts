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

export interface ProjectValidationErrorContextDto {
  nodePath: string
  field: string
  reason: string
  value?: unknown
}

export interface ProjectIdParamsDto {
  id: number
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
