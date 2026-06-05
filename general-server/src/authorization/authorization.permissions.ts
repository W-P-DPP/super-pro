import {
  ADMIN_CONSOLE_APP_CODE,
  ADMIN_CONSOLE_PERMISSION_CODES,
  FILE_SERVER_APP_CODE,
  FILE_SERVER_PERMISSION_CODES,
  PROJECT_APP_CODE,
  PROJECT_PERMISSION_CODES,
  type AuthorizationResourceType,
  type CompatibilityUserRole,
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
  {
    code: PROJECT_PERMISSION_CODES.projectRead,
    appCode: PROJECT_APP_CODE,
    resourceType: 'api',
    resourceCode: 'project',
    action: 'read',
    name: '项目查看',
    description: '允许查看项目列表和项目详情。',
  },
  {
    code: PROJECT_PERMISSION_CODES.projectCreate,
    appCode: PROJECT_APP_CODE,
    resourceType: 'button',
    resourceCode: 'project',
    action: 'create',
    name: '项目新增',
    description: '允许新增项目。',
  },
  {
    code: PROJECT_PERMISSION_CODES.projectUpdate,
    appCode: PROJECT_APP_CODE,
    resourceType: 'button',
    resourceCode: 'project',
    action: 'update',
    name: '项目编辑',
    description: '允许修改项目信息。',
  },
  {
    code: PROJECT_PERMISSION_CODES.projectDelete,
    appCode: PROJECT_APP_CODE,
    resourceType: 'button',
    resourceCode: 'project',
    action: 'delete',
    name: '项目删除',
    description: '允许删除项目。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.dashboardMenuView,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'menu',
    resourceCode: 'dashboard',
    action: 'view',
    name: '工作台可见',
    description: '允许查看管理后台工作台页面。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.usersMenuView,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'menu',
    resourceCode: 'users',
    action: 'view',
    name: '用户管理可见',
    description: '允许查看管理后台用户管理页面。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.rolesMenuView,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'menu',
    resourceCode: 'roles',
    action: 'view',
    name: '角色管理可见',
    description: '允许查看管理后台角色管理页面。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.permissionsMenuView,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'menu',
    resourceCode: 'permissions',
    action: 'view',
    name: '权限管理可见',
    description: '允许查看管理后台权限管理页面。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.projectsMenuView,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'menu',
    resourceCode: 'projects',
    action: 'view',
    name: '项目管理可见',
    description: '允许查看管理后台项目管理页面。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.reportsMenuView,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'menu',
    resourceCode: 'reports',
    action: 'view',
    name: 'BMS 菜单可见',
    description: '允许查看管理后台 BMS 菜单页面。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.settingsMenuView,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'menu',
    resourceCode: 'settings',
    action: 'view',
    name: '站点菜单可见',
    description: '允许查看管理后台站点菜单页面。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.permissionCreate,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'button',
    resourceCode: 'permissions',
    action: 'create',
    name: '新增权限',
    description: '允许在管理后台新增权限。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.permissionUpdate,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'button',
    resourceCode: 'permissions',
    action: 'update',
    name: '修改权限',
    description: '允许在管理后台修改权限。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.permissionDelete,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'button',
    resourceCode: 'permissions',
    action: 'delete',
    name: '删除权限',
    description: '允许在管理后台删除权限。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.projectCreate,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'button',
    resourceCode: 'projects',
    action: 'create',
    name: '新增项目',
    description: '允许在管理后台新增项目。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.projectUpdate,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'button',
    resourceCode: 'projects',
    action: 'update',
    name: '修改项目',
    description: '允许在管理后台修改项目。',
  },
  {
    code: ADMIN_CONSOLE_PERMISSION_CODES.projectDelete,
    appCode: ADMIN_CONSOLE_APP_CODE,
    resourceType: 'button',
    resourceCode: 'projects',
    action: 'delete',
    name: '删除项目',
    description: '允许在管理后台删除项目。',
  },
] as const;

export const SEEDED_ROLES: readonly SeedRoleDefinition[] = [
  {
    code: 'platform.admin',
    name: '平台管理员',
    description: '平台权限试点管理员，默认拥有 file-server、project 与 admin-console 的全部权限。',
  },
  {
    code: 'file-server.viewer',
    name: '文件服务只读',
    description: '允许查看 file-server 文件树、预览和下载内容。',
  },
  {
    code: 'file-server.editor',
    name: '文件服务编辑',
    description: '允许执行 file-server 试点中的全部文件操作。',
  },
  {
    code: 'project.viewer',
    name: '项目管理只读',
    description: '允许查看 project 模块的项目列表与详情。',
  },
  {
    code: 'project.editor',
    name: '项目管理编辑',
    description: '允许执行 project 模块的项目新增、修改和删除。',
  },
  {
    code: 'admin-console.viewer',
    name: '管理后台只读',
    description: '允许查看管理后台的导航和基础页面。',
  },
  {
    code: 'admin-console.editor',
    name: '管理后台编辑',
    description: '允许执行管理后台中和权限、项目相关的编辑操作。',
  },
] as const;

export const SEEDED_ROLE_PERMISSION_CODES: Readonly<Record<string, readonly string[]>> = {
  'platform.admin': SEEDED_PERMISSIONS.map((item) => item.code),
  'file-server.viewer': [
    FILE_SERVER_PERMISSION_CODES.treeRead,
    FILE_SERVER_PERMISSION_CODES.previewRead,
    FILE_SERVER_PERMISSION_CODES.downloadRead,
  ],
  'file-server.editor': [
    FILE_SERVER_PERMISSION_CODES.treeRead,
    FILE_SERVER_PERMISSION_CODES.previewRead,
    FILE_SERVER_PERMISSION_CODES.downloadRead,
    FILE_SERVER_PERMISSION_CODES.folderCreate,
    FILE_SERVER_PERMISSION_CODES.fileUpload,
    FILE_SERVER_PERMISSION_CODES.fileDelete,
    FILE_SERVER_PERMISSION_CODES.fileMove,
  ],
  'project.viewer': [PROJECT_PERMISSION_CODES.projectRead],
  'project.editor': [
    PROJECT_PERMISSION_CODES.projectRead,
    PROJECT_PERMISSION_CODES.projectCreate,
    PROJECT_PERMISSION_CODES.projectUpdate,
    PROJECT_PERMISSION_CODES.projectDelete,
  ],
  'admin-console.viewer': [
    ADMIN_CONSOLE_PERMISSION_CODES.dashboardMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.usersMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.rolesMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.permissionsMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.projectsMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.reportsMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.settingsMenuView,
  ],
  'admin-console.editor': [
    ADMIN_CONSOLE_PERMISSION_CODES.dashboardMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.usersMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.rolesMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.permissionsMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.projectsMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.reportsMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.settingsMenuView,
    ADMIN_CONSOLE_PERMISSION_CODES.permissionCreate,
    ADMIN_CONSOLE_PERMISSION_CODES.permissionUpdate,
    ADMIN_CONSOLE_PERMISSION_CODES.permissionDelete,
    ADMIN_CONSOLE_PERMISSION_CODES.projectCreate,
    ADMIN_CONSOLE_PERMISSION_CODES.projectUpdate,
    ADMIN_CONSOLE_PERMISSION_CODES.projectDelete,
  ],
};

export const COMPATIBILITY_ROLE_FALLBACK_ROLE_CODES: Readonly<
  Record<CompatibilityUserRole, readonly string[]>
> = {
  admin: ['platform.admin'],
  employee: ['file-server.editor', 'project.editor', 'admin-console.editor'],
  approver: ['file-server.editor', 'project.editor', 'admin-console.editor'],
  guest: ['file-server.viewer', 'project.viewer', 'admin-console.viewer'],
};
