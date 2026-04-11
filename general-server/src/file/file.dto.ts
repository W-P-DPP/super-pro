export type FileNodeType = 'file' | 'folder'

export interface FileValidationErrorContextDto {
  nodePath: string
  field: string
  reason: string
  value?: unknown
}

export interface FileNodeResponseDto {
  name: string
  relativePath: string
  type: FileNodeType
  size?: number
  modifiedTime?: string
  children: FileNodeResponseDto[]
}

export type FileTreeResponseDto = FileNodeResponseDto[]

export interface CreateFolderRequestDto {
  parentPath: string
  folderName: string
}

export interface DeleteFileRequestDto {
  targetPath: string
}

export interface UploadFileRequestDto {
  targetPath: string
}

export interface UploadedFileDto {
  originalname: string
  mimetype?: string
  buffer: Buffer
  size: number
}
