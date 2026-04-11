import path from 'node:path';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type {
  CreateFolderRequestDto,
  DeleteFileRequestDto,
  FileNodeResponseDto,
  FileTreeResponseDto,
  FileValidationErrorContextDto,
  UploadedFileDto,
  UploadFileRequestDto,
} from './file.dto.ts';
import type { FileEntity } from './file.entity.ts';
import {
  FileRepositoryError,
  fileRepository,
  type FileRepositoryPort,
} from './file.repository.ts';

export class FileBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: FileValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'FileBusinessError';
  }
}

function normalizeDateTime(value?: Date): string | undefined {
  return value ? value.toISOString() : undefined;
}

function toResponseDto(entity: FileEntity): FileNodeResponseDto {
  return {
    name: entity.name,
    relativePath: entity.relativePath,
    type: entity.type,
    ...(typeof entity.size === 'number' ? { size: entity.size } : {}),
    ...(entity.modifiedTime ? { modifiedTime: normalizeDateTime(entity.modifiedTime) } : {}),
    children: entity.children.map(toResponseDto),
  };
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
    );
  }

  return value.trim();
}

function normalizeTargetPath(value: unknown, field: string, label: string): string {
  const raw = ensureNonEmptyString(value, field, label);
  const normalized = raw.replace(/\\/g, '/').trim();
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function ensureFolderName(value: unknown): string {
  const folderName = ensureNonEmptyString(value, 'folderName', '文件夹名称');
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
    );
  }

  return folderName;
}

function validateCreateFolderInput(input: CreateFolderRequestDto | Record<string, unknown>): CreateFolderRequestDto {
  return {
    parentPath: normalizeTargetPath(input.parentPath, 'parentPath', '父级目录路径'),
    folderName: ensureFolderName(input.folderName),
  };
}

function validateDeleteInput(input: DeleteFileRequestDto | Record<string, unknown>): DeleteFileRequestDto {
  return {
    targetPath: normalizeTargetPath(input.targetPath, 'targetPath', '删除目标路径'),
  };
}

function validateUploadInput(
  input: UploadFileRequestDto | Record<string, unknown>,
): UploadFileRequestDto {
  return {
    targetPath: normalizeTargetPath(input.targetPath, 'targetPath', '上传目标目录'),
  };
}

function validateUploadedFile(file: UploadedFileDto | null | undefined): UploadedFileDto {
  if (!file || !(file.buffer instanceof Buffer) || !file.originalname?.trim()) {
    throw new FileBusinessError(
      '请上传有效文件',
      {
        nodePath: 'file',
        field: 'file',
        reason: '上传文件不能为空且必须包含文件名',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const originalname = path.basename(file.originalname.trim());
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
    );
  }

  return {
    ...file,
    originalname,
  };
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
  );
}

export class FileService {
  constructor(private readonly repository: FileRepositoryPort = fileRepository) {}

  async getFileTree(): Promise<FileTreeResponseDto> {
    try {
      const tree = await this.repository.getFileTree();
      return tree.map(toResponseDto);
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error);
      }

      throw new FileBusinessError(
        '读取文件树失败',
        {
          nodePath: 'file',
          field: 'tree',
          reason: '文件树读取失败',
        },
        HttpStatus.ERROR,
      );
    }
  }

  async createFolder(
    input: CreateFolderRequestDto | Record<string, unknown>,
  ): Promise<FileNodeResponseDto> {
    const payload = validateCreateFolderInput(input);

    try {
      const created = await this.repository.createFolder(payload);
      return toResponseDto(created);
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error);
      }

      throw new FileBusinessError(
        '创建文件夹失败',
        {
          nodePath: 'file',
          field: 'folder',
          reason: '文件夹创建失败',
        },
        HttpStatus.ERROR,
      );
    }
  }

  async uploadFile(
    input: UploadFileRequestDto | Record<string, unknown>,
    file: UploadedFileDto | null | undefined,
  ): Promise<FileNodeResponseDto> {
    const payload = validateUploadInput(input);
    const uploadedFile = validateUploadedFile(file);

    try {
      const saved = await this.repository.saveUploadedFile({
        targetPath: payload.targetPath,
        originalname: uploadedFile.originalname,
        buffer: uploadedFile.buffer,
      });

      return toResponseDto(saved);
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error);
      }

      throw new FileBusinessError(
        '上传文件失败',
        {
          nodePath: 'file',
          field: 'file',
          reason: '文件上传失败',
        },
        HttpStatus.ERROR,
      );
    }
  }

  async deleteTarget(
    input: DeleteFileRequestDto | Record<string, unknown>,
  ): Promise<FileNodeResponseDto> {
    const payload = validateDeleteInput(input);

    try {
      const deleted = await this.repository.deleteTarget(payload);
      return toResponseDto(deleted);
    } catch (error) {
      if (error instanceof FileRepositoryError) {
        throw normalizeRepositoryError(error);
      }

      throw new FileBusinessError(
        '删除文件失败',
        {
          nodePath: 'file',
          field: 'targetPath',
          reason: '文件删除失败',
        },
        HttpStatus.ERROR,
      );
    }
  }
}

export const fileService = new FileService();
