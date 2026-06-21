export interface SubmitContactMessageRequestDto {
  name: string
  email: string
  subject: string
  message: string
  sourceUrl?: string
  sourceName?: string
  ip?: string
  userAgent?: string
}

export interface ContactMessageResponseDto {
  id: number
  name: string
  email: string
  subject: string
  message: string
  sourceUrl: string
  sourceName: string
  mailStatus: string
  createTime?: string
}

export interface ContactValidationErrorContextDto {
  nodePath: string
  field: string
  reason: string
  value?: unknown
}
