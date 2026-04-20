import path from 'node:path'
import { TextDecoder } from 'node:util'
import { HttpStatus } from '../../utils/constant/HttpStatus.ts'
import type {
  CompleteChunkUploadBatchRequestDto,
  CompleteChunkUploadRequestDto,
  CreateFolderRequestDto,
  DeleteFileRequestDto,
  DownloadFileRequestDto,
  DownloadFileResponseDto,
  FileNodeResponseDto,
  FileTreeResponseDto,
  FileValidationErrorContextDto,
  MoveFileRequestDto,
  PreviewFileRequestDto,
  PreviewFileResponseDto,
  UploadedFileDto,
  UploadChunkProgressResponseDto,
  UploadFileChunkRequestDto,
  UploadFileRequestDto,
  UploadFileResponseDto,
} from './file.dto.ts'
import type { FileEntity } from './file.entity.ts'
import {
  FileRepositoryError,
  fileRepository,
  type FileRepositoryPort,
} from './file.repository.ts'

export class FileBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: FileValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'FileBusinessError'
  }
}

const utf8Decoder = new TextDecoder('utf-8', {
  fatal: true,
})

const cjkCharacterPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u
const latin1CharacterPattern = /[\u0080-\u00ff]/u
const previewMimeTypeMap: Record<string, string> = {
  '.aac': 'audio/aac',
  '.avi': 'video/x-msvideo',
  '.bmp': 'image/bmp',
  '.csv': 'text/csv; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.m4a': 'audio/mp4',
  '.md': 'text/markdown; charset=utf-8',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xml': 'application/xml; charset=utf-8',
}

function normalizeDateTime(value?: Date): string | undefined {
  return value ? value.toISOString() : undefined
}

function toResponseDto(entity: FileEntity): FileNodeResponseDto {
  return {
    name: entity.name,
    relativePath: entity.relativePath,
    type: entity.type,
    ...(typeof entity.size === 'number' ? { size: entity.size } : {}),
    ...(entity.modifiedTime ? { modifiedTime: normalizeDateTime(entity.modifiedTime) } : {}),
    children: entity.children.map(toResponseDto),
  }
}

function ensureNonEmptyString(value: unknown, field: string, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new FileBusinessError(
      `${label}不能为空`,
      {
        nodePath: 'file',
        field,
        reason: `${label}必须是非空字符串`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return value.trim()
}

function normalizeTargetPath(value: unknown, field: string, label: string): string {
  const raw = ensureNonEmptyString(value, field, label)
  const normalized = raw.replace(/\\/g, '/').trim()
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function ensureFolderName(value: unknown): string {
  const folderName = ensureNonEmptyString(value, 'folderName', '文件夹名称')
  if (folderName === '.' || folderName === '..' || /[\\/]/.test(folderName)) {
    throw new FileBusinessError(
      '文件夹名称不合法',
      {
        nodePath: 'file',
        field: 'folderName',
        reason: '文件夹名称不能包含路径分隔符或保留路径段',
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return folderName
}

function validateCreateFolderInput(
  input: CreateFolderRequestDto | Record<string, unknown>,
): CreateFolderRequestDto {
  return {
    parentPath: normalizeTargetPath(input.parentPath, 'parentPath', '父级目录路径'),
    folderName: ensureFolderName(input.folderName),
  }
}

function validateDeleteInput(
  input: DeleteFileRequestDto | Record<string, unknown>,
): DeleteFileRequestDto {
  return {
    targetPath: normalizeTargetPath(input.targetPath, 'targetPath', '删除目标路径'),
  }
}

function validateMoveInput(input: MoveFileRequestDto | Record<string, unknown>): MoveFileRequestDto {
  return {
    sourcePath: normalizeTargetPath(input.sourcePath, 'sourcePath', '源路径'),
    destinationPath: normalizeTargetPath(input.destinationPath, 'destinationPath', '目标文件夹路径'),
  }
}

function validatePreviewInput(
  input: PreviewFileRequestDto | Record<string, unknown>,
): PreviewFileRequestDto {
  return {
    targetPath: normalizeTargetPath(input.targetPath, 'targetPath', '预览文件路径'),
  }
}

function validateDownloadInput(
  input: DownloadFileRequestDto | Record<string, unknown>,
): DownloadFileRequestDto {
  return {
    targetPath: normalizeTargetPath(input.targetPath, 'targetPath', '涓嬭浇鏂囦欢璺緞'),
  }
}

function validateUploadInput(
  input: UploadFileRequestDto | Record<string, unknown>,
): UploadFileRequestDto {
  const relativePaths = Array.isArray(input.relativePaths)
    ? input.relativePaths
    : input.relativePaths === undefined
      ? undefined
      : [input.relativePaths as string]

  return {
    targetPath: normalizeTargetPath(input.targetPath, 'targetPath', '上传目标目录'),
    ...(relativePaths ? { relativePaths } : {}),
  }
}

function ensureNonNegativeInteger(value: unknown, field: string, label: string): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FileBusinessError(
      `${label}不合法`,
      {
        nodePath: 'file',
        field,
        reason: `${label}必须是大于或等于 0 的整数`,
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return parsed
}

function ensureUploadId(value: unknown): string {
  const uploadId = ensureNonEmptyString(value, 'uploadId', '上传批次 ID')
  if (!/^[a-zA-Z0-9_-]+$/.test(uploadId)) {
    throw new FileBusinessError(
      '上传批次 ID 不合法',
      {
        nodePath: 'file',
        field: 'uploadId',
        reason: 'uploadId 只能包含字母、数字、下划线和中划线',
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return uploadId
}

function normalizeSingleRelativePath(value: unknown): string {
  const rawRelativePath = ensureNonEmptyString(value, 'relativePath', '上传相对路径')
  const fallbackFilename = normalizeUploadedFilename(path.posix.basename(rawRelativePath.replace(/\\/g, '/')))

  return normalizeUploadRelativePath(rawRelativePath, fallbackFilename)
}

function validateUploadChunkInput(
  input: UploadFileChunkRequestDto | Record<string, unknown>,
): UploadFileChunkRequestDto {
  const chunkIndex = ensureNonNegativeInteger(input.chunkIndex, 'chunkIndex', '分片序号')
  const totalChunks = ensureNonNegativeInteger(input.totalChunks, 'totalChunks', '分片总数')

  if (totalChunks <= 0) {
    throw new FileBusinessError(
      '分片总数不合法',
      {
        nodePath: 'file',
        field: 'totalChunks',
        reason: '分片总数必须大于 0',
        value: input.totalChunks,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  if (chunkIndex >= totalChunks) {
    throw new FileBusinessError(
      '分片序号超出范围',
      {
        nodePath: 'file',
        field: 'chunkIndex',
        reason: '分片序号必须位于 0 到 totalChunks - 1 之间',
        value: input.chunkIndex,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return {
    targetPath: normalizeTargetPath(input.targetPath, 'targetPath', '上传目标目录'),
    relativePath: normalizeSingleRelativePath(input.relativePath),
    uploadId: ensureUploadId(input.uploadId),
    chunkIndex,
    totalChunks,
  }
}

function validateCompleteChunkUploadInput(
  input: CompleteChunkUploadRequestDto | Record<string, unknown>,
): CompleteChunkUploadRequestDto {
  const totalChunks = ensureNonNegativeInteger(input.totalChunks, 'totalChunks', '分片总数')
  if (totalChunks <= 0) {
    throw new FileBusinessError(
      '分片总数不合法',
      {
        nodePath: 'file',
        field: 'totalChunks',
        reason: '分片总数必须大于 0',
        value: input.totalChunks,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return {
    targetPath: normalizeTargetPath(input.targetPath, 'targetPath', '上传目标目录'),
    relativePath: normalizeSingleRelativePath(input.relativePath),
    uploadId: ensureUploadId(input.uploadId),
    totalChunks,
  }
}

function validateCompleteChunkUploadBatchInput(
  input: CompleteChunkUploadBatchRequestDto | Record<string, unknown>,
): CompleteChunkUploadBatchRequestDto {
  const items = Array.isArray(input.items) ? input.items : []

  if (items.length === 0) {
    throw new FileBusinessError(
      '分片批次不能为空',
      {
        nodePath: 'file',
        field: 'items',
        reason: '批量完成分片上传时必须提供至少一个文件项',
        value: input.items,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return {
    targetPath: normalizeTargetPath(input.targetPath, 'targetPath', '上传目标目录'),
    items: items.map((item, index) => {
      const record = item as Record<string, unknown>
      const totalChunks = ensureNonNegativeInteger(
        record.totalChunks,
        `items.${index}.totalChunks`,
        '分片总数',
      )

      if (totalChunks <= 0) {
        throw new FileBusinessError(
          '分片总数不合法',
          {
            nodePath: 'file',
            field: `items.${index}.totalChunks`,
            reason: '分片总数必须大于 0',
            value: record.totalChunks,
          },
          HttpStatus.BAD_REQUEST,
        )
      }

      return {
        relativePath: normalizeSingleRelativePath(record.relativePath),
        uploadId: ensureUploadId(record.uploadId),
        totalChunks,
      }
    }),
  }
}

function containsCjkCharacters(value: string): boolean {
  return cjkCharacterPattern.test(value)
}

function tryRecoverMojibakeFilename(value: string): string {
  if (containsCjkCharacters(value) || !latin1CharacterPattern.test(value)) {
    return value
  }

  let candidate = value

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const recovered = utf8Decoder.decode(Buffer.from(candidate, 'latin1')).trim()
      if (!recovered || recovered === candidate) {
        return value
      }

      if (containsCjkCharacters(recovered)) {
        return recovered
      }

      if (!latin1CharacterPattern.test(recovered)) {
        return value
      }

      candidate = recovered
    }
  } catch {
    return value
  }

  return value
}

export function normalizeUploadedFilename(value: string): string {
  const basename = path.basename(value.trim())
  const recovered = tryRecoverMojibakeFilename(basename)
  return path.basename(recovered)
}

function normalizeUploadRelativePath(relativePath: string, fallbackFilename: string): string {
  const raw = relativePath.replace(/\\/g, '/').trim()
  if (!raw) {
    return fallbackFilename
  }

  if (raw.startsWith('/') || /^[a-zA-Z]:/.test(raw)) {
    throw new FileBusinessError(
      '上传相对路径不合法',
      {
        nodePath: 'file',
        field: 'relativePaths',
        reason: '上传相对路径必须是 file 根目录内的相对路径',
        value: relativePath,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  const normalized = path.posix.normalize(raw)
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length === 0 || segments.includes('..')) {
    throw new FileBusinessError(
      '上传相对路径不合法',
      {
        nodePath: 'file',
        field: 'relativePaths',
        reason: '上传相对路径不能包含越界路径段',
        value: relativePath,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  const filename = normalizeUploadedFilename(segments[segments.length - 1] ?? fallbackFilename)
  if (!filename || filename === '.' || filename === '..') {
    throw new FileBusinessError(
      '上传文件名不合法',
      {
        nodePath: 'file',
        field: 'file',
        reason: '上传文件名必须是合法文件名',
        value: relativePath,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return [...segments.slice(0, -1), filename].join('/')
}

function validateUploadedFiles(
  files: UploadedFileDto[] | null | undefined,
  relativePaths?: string[],
): UploadedFileDto[] {
  if (!files || files.length === 0) {
    throw new FileBusinessError(
      '请上传有效文件',
      {
        nodePath: 'file',
        field: 'file',
        reason: '上传文件不能为空',
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  if (relativePaths && relativePaths.length > 0 && relativePaths.length !== files.length) {
    throw new FileBusinessError(
      '上传文件与相对路径数量不匹配',
      {
        nodePath: 'file',
        field: 'relativePaths',
        reason: 'relativePaths 数量必须与上传文件数量一致',
        value: relativePaths,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return files.map((file, index) => {
    if (!(file.buffer instanceof Buffer) || !file.originalname?.trim()) {
      throw new FileBusinessError(
        '请上传有效文件',
        {
          nodePath: 'file',
          field: 'file',
          reason: '上传文件不能为空且必须包含文件名',
          value: file.originalname,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const originalname = normalizeUploadedFilename(file.originalname)
    if (!originalname || originalname === '.' || originalname === '..') {
      throw new FileBusinessError(
        '上传文件名不合法',
        {
          nodePath: 'file',
          field: 'file',
          reason: '上传文件名必须是合法文件名',
          value: file.originalname,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const relativePath = normalizeUploadRelativePath(relativePaths?.[index] ?? originalname, originalname)

    return {
      ...file,
      originalname,
      relativePath,
    }
  })
}

function validateUploadedChunk(file: UploadedFileDto | null | undefined): UploadedFileDto {
  if (!file || !(file.buffer instanceof Buffer) || file.size < 0) {
    throw new FileBusinessError(
      '请上传有效分片',
      {
        nodePath: 'file',
        field: 'chunk',
        reason: '分片文件不能为空',
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return file
}

function normalizeRepositoryError(error: FileRepositoryError): FileBusinessError {
  return new FileBusinessError(
    error.message,
    {
      nodePath: 'file',
      field: error.context.field,
      reason: error.context.reason,
      ...(error.context.value !== undefined ? { value: error.context.value } : {}),
    },
    error.statusCode,
  )
}

function resolvePreviewMimeType(filename: string): string {
  const extension = path.extname(filename).toLowerCase()
  return previewMimeTypeMap[extension] ?? 'application/octet-stream'
}

export class FileService {
  constructor(private readonly repository: FileRepositoryPort = fileRepository) {}

  async getFileTree(): Promise<FileTreeResponseDto> {
    try {
      const tree = await this.repository.getFileTree()
      return tree.map(toResponseDto)
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error)
      }

      throw new FileBusinessError(
        '读取文件树失败',
        {
          nodePath: 'file',
          field: 'tree',
          reason: '文件树读取失败',
        },
        HttpStatus.ERROR,
      )
    }
  }

  async createFolder(
    input: CreateFolderRequestDto | Record<string, unknown>,
  ): Promise<FileNodeResponseDto> {
    const payload = validateCreateFolderInput(input)

    try {
      const created = await this.repository.createFolder(payload)
      return toResponseDto(created)
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error)
      }

      throw new FileBusinessError(
        '创建文件夹失败',
        {
          nodePath: 'file',
          field: 'folder',
          reason: '文件夹创建失败',
        },
        HttpStatus.ERROR,
      )
    }
  }

  async uploadFiles(
    input: UploadFileRequestDto | Record<string, unknown>,
    files: UploadedFileDto[] | null | undefined,
  ): Promise<UploadFileResponseDto> {
    const payload = validateUploadInput(input)
    const uploadedFiles = validateUploadedFiles(files, payload.relativePaths)

    try {
      const saved = await this.repository.saveUploadedFiles({
        targetPath: payload.targetPath,
        files: uploadedFiles.map((file) => ({
          originalname: file.originalname,
          relativePath: file.relativePath ?? file.originalname,
          buffer: file.buffer,
        })),
      })

      return {
        targetPath: payload.targetPath,
        uploadedCount: saved.length,
        uploaded: saved.map(toResponseDto),
      }
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error)
      }

      throw new FileBusinessError(
        '上传文件失败',
        {
          nodePath: 'file',
          field: 'file',
          reason: '文件上传失败',
        },
        HttpStatus.ERROR,
      )
    }
  }

  async uploadFileChunk(
    input: UploadFileChunkRequestDto | Record<string, unknown>,
    file: UploadedFileDto | null | undefined,
  ): Promise<UploadChunkProgressResponseDto> {
    const payload = validateUploadChunkInput(input)
    const chunkFile = validateUploadedChunk(file)

    try {
      return await this.repository.appendUploadChunk({
        ...payload,
        chunkBuffer: chunkFile.buffer,
      })
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error)
      }

      throw new FileBusinessError(
        '上传分片失败',
        {
          nodePath: 'file',
          field: 'chunk',
          reason: '分片上传失败',
        },
        HttpStatus.ERROR,
      )
    }
  }

  async completeChunkUpload(
    input: CompleteChunkUploadRequestDto | Record<string, unknown>,
  ): Promise<UploadFileResponseDto> {
    const payload = validateCompleteChunkUploadInput(input)

    try {
      const saved = await this.repository.commitUploadChunks(payload)

      return {
        targetPath: payload.targetPath,
        uploadedCount: 1,
        uploaded: [toResponseDto(saved)],
      }
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error)
      }

      throw new FileBusinessError(
        '完成分片上传失败',
        {
          nodePath: 'file',
          field: 'uploadId',
          reason: '分片合并失败',
        },
        HttpStatus.ERROR,
      )
    }
  }

  async completeChunkUploadBatch(
    input: CompleteChunkUploadBatchRequestDto | Record<string, unknown>,
  ): Promise<UploadFileResponseDto> {
    const payload = validateCompleteChunkUploadBatchInput(input)

    try {
      const saved = await this.repository.commitUploadChunkBatch(payload)

      return {
        targetPath: payload.targetPath,
        uploadedCount: saved.length,
        uploaded: saved.map(toResponseDto),
      }
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error)
      }

      throw new FileBusinessError(
        '完成批量分片上传失败',
        {
          nodePath: 'file',
          field: 'items',
          reason: '批量分片合并失败',
        },
        HttpStatus.ERROR,
      )
    }
  }

  async deleteTarget(
    input: DeleteFileRequestDto | Record<string, unknown>,
  ): Promise<FileNodeResponseDto> {
    const payload = validateDeleteInput(input)

    try {
      const deleted = await this.repository.deleteTarget(payload)
      return toResponseDto(deleted)
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error)
      }

      throw new FileBusinessError(
        '删除文件失败',
        {
          nodePath: 'file',
          field: 'targetPath',
          reason: '文件删除失败',
        },
        HttpStatus.ERROR,
      )
    }
  }

  async moveTarget(
    input: MoveFileRequestDto | Record<string, unknown>,
  ): Promise<FileNodeResponseDto> {
    const payload = validateMoveInput(input)

    try {
      const moved = await this.repository.moveTarget(payload)
      return toResponseDto(moved)
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error)
      }

      throw new FileBusinessError(
        '移动文件失败',
        {
          nodePath: 'file',
          field: 'sourcePath',
          reason: '文件移动失败',
        },
        HttpStatus.ERROR,
      )
    }
  }

  async getPreviewFile(
    input: PreviewFileRequestDto | Record<string, unknown>,
  ): Promise<PreviewFileResponseDto> {
    const payload = validatePreviewInput(input)

    try {
      const preview = await this.repository.getPreviewFile(payload)

      return {
        absolutePath: preview.absolutePath,
        name: preview.file.name,
        relativePath: preview.file.relativePath,
        size: preview.file.size ?? 0,
        ...(preview.file.modifiedTime
          ? { modifiedTime: normalizeDateTime(preview.file.modifiedTime) }
          : {}),
        mimeType: resolvePreviewMimeType(preview.file.name),
      }
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error)
      }

      throw new FileBusinessError(
        '读取预览文件失败',
        {
          nodePath: 'file',
          field: 'targetPath',
          reason: '预览文件读取失败',
        },
        HttpStatus.ERROR,
      )
    }
  }

  async getDownloadFile(
    input: DownloadFileRequestDto | Record<string, unknown>,
  ): Promise<DownloadFileResponseDto> {
    const payload = validateDownloadInput(input)

    try {
      const download = await this.repository.getPreviewFile(payload)

      return {
        absolutePath: download.absolutePath,
        name: download.file.name,
        relativePath: download.file.relativePath,
        size: download.file.size ?? 0,
        ...(download.file.modifiedTime
          ? { modifiedTime: normalizeDateTime(download.file.modifiedTime) }
          : {}),
        mimeType: resolvePreviewMimeType(download.file.name),
      }
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error)
      }

      throw new FileBusinessError(
        '璇诲彇涓嬭浇鏂囦欢澶辫触',
        {
          nodePath: 'file',
          field: 'targetPath',
          reason: '涓嬭浇鏂囦欢璇诲彇澶辫触',
        },
        HttpStatus.ERROR,
      )
    }
  }
}

export const fileService = new FileService()
