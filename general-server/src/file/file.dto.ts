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

export interface MoveFileRequestDto {
  sourcePath: string
  destinationPath: string
}

export interface PreviewFileRequestDto {
  targetPath: string
}

export interface UploadFileRequestDto {
  targetPath: string
  relativePaths?: string[]
}

export interface UploadFileChunkRequestDto {
  targetPath: string
  relativePath: string
  uploadId: string
  chunkIndex: number
  totalChunks: number
}

export interface CompleteChunkUploadRequestDto {
  targetPath: string
  relativePath: string
  uploadId: string
  totalChunks: number
}

export interface CompleteChunkUploadBatchItemDto {
  relativePath: string
  uploadId: string
  totalChunks: number
}

export interface CompleteChunkUploadBatchRequestDto {
  targetPath: string
  items: CompleteChunkUploadBatchItemDto[]
}

export interface UploadedFileDto {
  originalname: string
  mimetype?: string
  buffer: Buffer
  size: number
  relativePath?: string
}

export interface UploadChunkProgressResponseDto {
  uploadId: string
  chunkIndex: number
  receivedChunks: number
  totalChunks: number
}

export interface UploadFileResponseDto {
  targetPath: string
  uploadedCount: number
  uploaded: FileNodeResponseDto[]
}

export interface PreviewFileResponseDto {
  absolutePath: string
  name: string
  relativePath: string
  size: number
  modifiedTime?: string
  mimeType: string
}
