export const AUTHORIZATION_RESOURCE_TYPES = [
  'menu',
  'route',
  'button',
  'api',
  'data',
] as const;

export type AuthorizationResourceType =
  (typeof AUTHORIZATION_RESOURCE_TYPES)[number];

export const COMPATIBILITY_USER_ROLES = [
  'admin',
  'employee',
  'approver',
  'guest',
] as const;

export type CompatibilityUserRole =
  (typeof COMPATIBILITY_USER_ROLES)[number];

export type PermissionCode = string;

export const FILE_SERVER_APP_CODE = 'file-server' as const;
export const PROJECT_APP_CODE = 'project' as const;
export const ADMIN_CONSOLE_APP_CODE = 'admin-console' as const;

export const FILE_SERVER_PERMISSION_CODES = {
  treeRead: 'file-server.tree.read',
  previewRead: 'file-server.preview.read',
  downloadRead: 'file-server.download.read',
  folderCreate: 'file-server.folder.create',
  fileUpload: 'file-server.file.upload',
  fileDelete: 'file-server.file.delete',
  fileMove: 'file-server.file.move',
} as const;

export type FileServerPermissionCode =
  (typeof FILE_SERVER_PERMISSION_CODES)[keyof typeof FILE_SERVER_PERMISSION_CODES];

export const PROJECT_PERMISSION_CODES = {
  projectRead: 'project.project.read',
  projectCreate: 'project.project.create',
  projectUpdate: 'project.project.update',
  projectDelete: 'project.project.delete',
} as const;

export type ProjectPermissionCode =
  (typeof PROJECT_PERMISSION_CODES)[keyof typeof PROJECT_PERMISSION_CODES];

export const ADMIN_CONSOLE_PERMISSION_CODES = {
  dashboardMenuView: 'admin-console.menu.dashboard.view',
  usersMenuView: 'admin-console.menu.users.view',
  rolesMenuView: 'admin-console.menu.roles.view',
  permissionsMenuView: 'admin-console.menu.permissions.view',
  projectsMenuView: 'admin-console.menu.projects.view',
  reportsMenuView: 'admin-console.menu.reports.view',
  settingsMenuView: 'admin-console.menu.settings.view',
  permissionCreate: 'admin-console.button.permissions.create',
  permissionUpdate: 'admin-console.button.permissions.update',
  permissionDelete: 'admin-console.button.permissions.delete',
  projectCreate: 'admin-console.button.projects.create',
  projectUpdate: 'admin-console.button.projects.update',
  projectDelete: 'admin-console.button.projects.delete',
} as const;

export type AdminConsolePermissionCode =
  (typeof ADMIN_CONSOLE_PERMISSION_CODES)[keyof typeof ADMIN_CONSOLE_PERMISSION_CODES];

export interface AuthenticatedIdentity {
  userId: number;
  username: string;
  compatibilityRole: CompatibilityUserRole;
}

export interface AuthorizationRoleSummary {
  id: number;
  code: string;
  name: string;
  appCode: string;
  description?: string;
}

export interface AuthorizationPermissionSummary {
  id: number;
  code: PermissionCode;
  appCode: string;
  resourceType: AuthorizationResourceType;
  resourceCode: string;
  action: string;
  name: string;
  description?: string;
  status?: number;
  updateTime?: string;
}

export interface AuthenticatedPrincipal extends AuthenticatedIdentity {
  roles: AuthorizationRoleSummary[];
  permissionCodes: PermissionCode[];
}

export interface AuthorizationRoleDetail extends AuthorizationRoleSummary {
  description?: string;
  permissions: AuthorizationPermissionSummary[];
}

export interface AppAuthorizationSnapshot {
  appCode: string;
  principal: AuthenticatedPrincipal;
  permissions: AuthorizationPermissionSummary[];
}
