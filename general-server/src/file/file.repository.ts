import { access, mkdir, readdir, rename, stat, writeFile } from 'fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import { FileEntity } from './file.entity.ts';

const DEFAULT_FILE_ROOT_PATH = fileURLToPath(new URL('../../../file', import.meta.url));
const DEFAULT_RUBBISH_ROOT_PATH = fileURLToPath(new URL('../../../rubbish', import.meta.url));

type FileRepositoryErrorCode =
  | 'PATH_OUT_OF_ROOT'
  | 'TARGET_NOT_FOUND'
  | 'TARGET_ALREADY_EXISTS'
  | 'PARENT_NOT_FOUND'
  | 'PARENT_NOT_DIRECTORY'
  | 'TARGET_IS_ROOT'
  | 'INVALID_TARGET'

export interface FileRepositoryErrorContext {
  field: string
  reason: string
  value?: unknown
}

export class FileRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: FileRepositoryErrorCode,
    public readonly context: FileRepositoryErrorContext,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'FileRepositoryError';
  }
}

export interface CreateFolderInput {
  parentPath: string
  folderName: string
}

export interface UploadFileInput {
  targetPath: string
  originalname: string
  buffer: Buffer
}

export interface DeleteFileInput {
  targetPath: string
}

export interface FileRepositoryPort {
  ensureRoots(): Promise<void>
  getFileTree(): Promise<FileEntity[]>
  createFolder(input: CreateFolderInput): Promise<FileEntity>
  saveUploadedFile(input: UploadFileInput): Promise<FileEntity>
  deleteTarget(input: DeleteFileInput): Promise<FileEntity>
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

function normalizeRelativeInputPath(value: string): string {
  const raw = value.trim().replace(/\\/g, '/');
  const segments = raw.split('/').filter(Boolean);
  if (segments.includes('..')) {
    throw new FileRepositoryError(
      '目标路径超出 file 根目录范围',
      'PATH_OUT_OF_ROOT',
      {
        field: 'targetPath',
        reason: '目标路径不能包含越界路径段',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  const normalized = path.posix.normalize(raw);
  const ensured = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return ensured === '/.' ? '/' : ensured;
}

function ensurePathWithinRoot(rootPath: string, absolutePath: string, field: string, value: string) {
  const relative = path.relative(rootPath, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new FileRepositoryError(
      '目标路径超出 file 根目录范围',
      'PATH_OUT_OF_ROOT',
      {
        field,
        reason: '目标路径必须位于 file 根目录内',
        value,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

function resolveWorkspaceRootPath(envKey: 'FILE_ROOT_PATH' | 'RUBBISH_ROOT_PATH'): string {
  const configured = process.env[envKey]?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  return envKey === 'FILE_ROOT_PATH' ? DEFAULT_FILE_ROOT_PATH : DEFAULT_RUBBISH_ROOT_PATH;
}

export function getFileRootPath(): string {
  return resolveWorkspaceRootPath('FILE_ROOT_PATH');
}

export function getRubbishRootPath(): string {
  return resolveWorkspaceRootPath('RUBBISH_ROOT_PATH');
}

function resolveFileRootTarget(targetPath: string, field: string) {
  const rootPath = getFileRootPath();
  const normalized = normalizeRelativeInputPath(targetPath);
  const relative = normalized === '/' ? '' : normalized.slice(1);
  const absolutePath = path.resolve(rootPath, relative);
  ensurePathWithinRoot(rootPath, absolutePath, field, targetPath);

  return {
    rootPath,
    normalizedPath: normalized,
    absolutePath,
  };
}

function toRelativePath(rootPath: string, absolutePath: string): string {
  const relative = path.relative(rootPath, absolutePath);
  if (!relative) {
    return '/';
  }

  return `/${toPosixPath(relative)}`;
}

function createFileEntityFromStat(
  rootPath: string,
  absolutePath: string,
  stats: Awaited<ReturnType<typeof stat>>,
): FileEntity {
  return Object.assign(new FileEntity(), {
    name: path.basename(absolutePath),
    relativePath: toRelativePath(rootPath, absolutePath),
    type: stats.isDirectory() ? 'folder' : 'file',
    ...(stats.isFile() ? { size: stats.size } : {}),
    modifiedTime: stats.mtime,
    children: [],
  } satisfies FileEntity);
}

async function buildNode(rootPath: string, absolutePath: string): Promise<FileEntity> {
  const stats = await stat(absolutePath);
  const entity = createFileEntityFromStat(rootPath, absolutePath, stats);

  if (stats.isDirectory()) {
    const dirents = await readdir(absolutePath, {
      withFileTypes: true,
    });

    entity.children = (
      await Promise.all(
        dirents.map(async (dirent) => buildNode(rootPath, path.join(absolutePath, dirent.name))),
      )
    ).sort(compareFileEntity);
  }

  return entity;
}

function compareFileEntity(left: FileEntity, right: FileEntity): number {
  if (left.type !== right.type) {
    return left.type === 'folder' ? -1 : 1;
  }

  return left.name.localeCompare(right.name, 'zh-CN');
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function buildRubbishBucket(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const millisecond = String(now.getMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day}_${hour}-${minute}-${second}-${millisecond}`;
}

export class FileRepository implements FileRepositoryPort {
  async ensureRoots(): Promise<void> {
    await Promise.all([
      mkdir(getFileRootPath(), { recursive: true }),
      mkdir(getRubbishRootPath(), { recursive: true }),
    ]);
  }

  async getFileTree(): Promise<FileEntity[]> {
    await this.ensureRoots();
    const rootPath = getFileRootPath();
    const dirents = await readdir(rootPath, { withFileTypes: true });

    const nodes = await Promise.all(
      dirents.map((dirent) => buildNode(rootPath, path.join(rootPath, dirent.name))),
    );

    return nodes.sort(compareFileEntity);
  }

  async createFolder(input: CreateFolderInput): Promise<FileEntity> {
    await this.ensureRoots();
    const { rootPath, absolutePath: parentPath } = resolveFileRootTarget(input.parentPath, 'parentPath');
    const parentStats = await stat(parentPath).catch(() => null);

    if (!parentStats) {
      throw new FileRepositoryError(
        '目标父目录不存在',
        'PARENT_NOT_FOUND',
        {
          field: 'parentPath',
          reason: '创建文件夹时目标父目录必须存在',
          value: input.parentPath,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!parentStats.isDirectory()) {
      throw new FileRepositoryError(
        '目标父路径不是文件夹',
        'PARENT_NOT_DIRECTORY',
        {
          field: 'parentPath',
          reason: '创建文件夹时目标父路径必须是文件夹',
          value: input.parentPath,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const targetPath = path.resolve(parentPath, input.folderName);
    ensurePathWithinRoot(rootPath, targetPath, 'folderName', input.folderName);

    if (await pathExists(targetPath)) {
      throw new FileRepositoryError(
        '同级目录下已存在同名文件或文件夹',
        'TARGET_ALREADY_EXISTS',
        {
          field: 'folderName',
          reason: '创建文件夹时不允许覆盖同名目标',
          value: input.folderName,
        },
        HttpStatus.CONFLICT,
      );
    }

    await mkdir(targetPath);
    return buildNode(rootPath, targetPath);
  }

  async saveUploadedFile(input: UploadFileInput): Promise<FileEntity> {
    await this.ensureRoots();
    const { rootPath, absolutePath: targetDirectory } = resolveFileRootTarget(
      input.targetPath,
      'targetPath',
    );
    const parentStats = await stat(targetDirectory).catch(() => null);

    if (!parentStats) {
      throw new FileRepositoryError(
        '上传目标目录不存在',
        'PARENT_NOT_FOUND',
        {
          field: 'targetPath',
          reason: '上传文件时目标目录必须存在',
          value: input.targetPath,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!parentStats.isDirectory()) {
      throw new FileRepositoryError(
        '上传目标路径不是文件夹',
        'PARENT_NOT_DIRECTORY',
        {
          field: 'targetPath',
          reason: '上传文件时目标路径必须是文件夹',
          value: input.targetPath,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const destinationPath = path.resolve(targetDirectory, input.originalname);
    ensurePathWithinRoot(rootPath, destinationPath, 'targetPath', input.targetPath);

    if (await pathExists(destinationPath)) {
      throw new FileRepositoryError(
        '目标目录下已存在同名文件或文件夹',
        'TARGET_ALREADY_EXISTS',
        {
          field: 'file',
          reason: '上传文件时不允许覆盖同名目标',
          value: input.originalname,
        },
        HttpStatus.CONFLICT,
      );
    }

    await writeFile(destinationPath, input.buffer);
    return buildNode(rootPath, destinationPath);
  }

  async deleteTarget(input: DeleteFileInput): Promise<FileEntity> {
    await this.ensureRoots();
    const { rootPath, normalizedPath, absolutePath } = resolveFileRootTarget(input.targetPath, 'targetPath');

    if (normalizedPath === '/') {
      throw new FileRepositoryError(
        '不允许删除 file 根目录',
        'TARGET_IS_ROOT',
        {
          field: 'targetPath',
          reason: '删除操作不能以 file 根目录作为目标',
          value: input.targetPath,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const targetStats = await stat(absolutePath).catch(() => null);
    if (!targetStats) {
      throw new FileRepositoryError(
        '待删除的文件或文件夹不存在',
        'TARGET_NOT_FOUND',
        {
          field: 'targetPath',
          reason: '删除目标必须存在',
          value: input.targetPath,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const targetEntity = await buildNode(rootPath, absolutePath);
    const relativePath = normalizedPath.slice(1);
    const rubbishTargetPath = path.join(getRubbishRootPath(), buildRubbishBucket(), relativePath);

    if (await pathExists(rubbishTargetPath)) {
      throw new FileRepositoryError(
        '回收站目标路径冲突，请稍后重试',
        'TARGET_ALREADY_EXISTS',
        {
          field: 'targetPath',
          reason: '回收站目标路径发生冲突',
          value: input.targetPath,
        },
        HttpStatus.CONFLICT,
      );
    }

    await mkdir(path.dirname(rubbishTargetPath), { recursive: true });
    await rename(absolutePath, rubbishTargetPath);

    return targetEntity;
  }
}

export const fileRepository = new FileRepository();
