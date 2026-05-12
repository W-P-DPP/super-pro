import {
  FILE_SERVER_APP_CODE,
  FILE_SERVER_PERMISSION_CODES,
  type CompatibilityUserRole,
  type AuthorizationResourceType,
} from '@super-pro/shared-types';

export interface SeedPermissionDefinition {
  code: string;
  appCode: string;
  resourceType: AuthorizationResourceType;
  resourceCode: string;
  action: string;
  name: string;
  description: string;
}

export interface SeedRoleDefinition {
  code: string;
  name: string;
  appCode: string;
  description: string;
}

export const SEEDED_PERMISSIONS: readonly SeedPermissionDefinition[] = [
  {
    code: FILE_SERVER_PERMISSION_CODES.treeRead,
    appCode: FILE_SERVER_APP_CODE,
    resourceType: 'api',
    resourceCode: 'tree',
    action: 'read',
    name: '文件树读取',
    description: '允许读取 file-server 文件树和目录结构。',
  },
  {
    code: FILE_SERVER_PERMISSION_CODES.previewRead,
    appCode: FILE_SERVER_APP_CODE,
    resourceType: 'api',
    resourceCode: 'preview',
    action: 'read',
    name: '文件预览',
    description: '允许读取 file-server 文件预览内容。',
  },
  {
    code: FILE_SERVER_PERMISSION_CODES.downloadRead,
    appCode: FILE_SERVER_APP_CODE,
    resourceType: 'api',
    resourceCode: 'download',
    action: 'read',
    name: '文件下载',
    description: '允许下载 file-server 文件内容。',
  },
  {
    code: FILE_SERVER_PERMISSION_CODES.folderCreate,
    appCode: FILE_SERVER_APP_CODE,
    resourceType: 'button',
    resourceCode: 'folder',
    action: 'create',
    name: '新建文件夹',
    description: '允许在 file-server 中创建文件夹。',
  },
  {
    code: FILE_SERVER_PERMISSION_CODES.fileUpload,
    appCode: FILE_SERVER_APP_CODE,
    resourceType: 'button',
    resourceCode: 'file',
    action: 'upload',
    name: '上传文件',
    description: '允许在 file-server 中上传文件或文件夹。',
  },
  {
    code: FILE_SERVER_PERMISSION_CODES.fileDelete,
    appCode: FILE_SERVER_APP_CODE,
    resourceType: 'button',
    resourceCode: 'file',
    action: 'delete',
    name: '删除文件',
    description: '允许在 file-server 中删除文件或文件夹。',
  },
  {
    code: FILE_SERVER_PERMISSION_CODES.fileMove,
    appCode: FILE_SERVER_APP_CODE,
    resourceType: 'button',
    resourceCode: 'file',
    action: 'move',
    name: '移动文件',
    description: '允许在 file-server 中拖拽移动文件或文件夹。',
  },
] as const;

export const SEEDED_ROLES: readonly SeedRoleDefinition[] = [
  {
    code: 'platform.admin',
    name: '平台管理员',
    appCode: 'platform',
    description: '平台权限试点管理员，默认拥有 file-server 试点的全部权限。',
  },
  {
    code: 'file-server.viewer',
    name: '文件服务只读',
    appCode: FILE_SERVER_APP_CODE,
    description: '允许查看 file-server 文件树、预览和下载内容。',
  },
  {
    code: 'file-server.editor',
    name: '文件服务编辑',
    appCode: FILE_SERVER_APP_CODE,
    description: '允许执行 file-server 试点中的全部文件操作。',
  },
] as const;

export const SEEDED_ROLE_PERMISSION_CODES: Readonly<Record<string, readonly string[]>> = {
  'platform.admin': SEEDED_PERMISSIONS.map((item) => item.code),
  'file-server.viewer': [
    FILE_SERVER_PERMISSION_CODES.treeRead,
    FILE_SERVER_PERMISSION_CODES.previewRead,
    FILE_SERVER_PERMISSION_CODES.downloadRead,
  ],
  'file-server.editor': SEEDED_PERMISSIONS.map((item) => item.code),
};

export const COMPATIBILITY_ROLE_FALLBACK_ROLE_CODES: Readonly<
  Record<CompatibilityUserRole, readonly string[]>
> = {
  admin: ['platform.admin'],
  employee: ['file-server.editor'],
  approver: ['file-server.editor'],
  guest: ['file-server.viewer'],
};
