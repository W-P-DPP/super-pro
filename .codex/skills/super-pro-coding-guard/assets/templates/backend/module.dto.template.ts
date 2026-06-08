export interface __Resource__ResponseDto {
  id: number
  name: string
  status: number
  createBy?: string
  createTime?: string
  updateBy?: string
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

export interface __Resource__IdParamsDto {
  id: number
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

export interface __Resource__ValidationErrorContextDto {
  nodePath: string
  field: string
  reason: string
  value?: unknown
}
