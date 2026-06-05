export const ADMIN_MENU_NODE_TYPES = ['group', 'item'] as const;

export type AdminMenuNodeType = (typeof ADMIN_MENU_NODE_TYPES)[number];

export const ADMIN_MENU_ICON_KEYS = [
  'home',
  'users',
  'shield',
  'briefcase',
  'bar-chart-3',
  'settings-2',
  'layout-grid',
  'folder-tree',
  'file-text',
  'sparkles',
] as const;

export type AdminMenuIconKey = (typeof ADMIN_MENU_ICON_KEYS)[number];

export interface AdminMenuResponseDto {
  id: number;
  parentId: number | null;
  name: string;
  shortTitle: string;
  slug: string | null;
  iconKey: AdminMenuIconKey;
  menuType: AdminMenuNodeType;
  status: number;
  sort: number;
  description: string;
  badge: string;
  permissionCode: string;
  children: AdminMenuResponseDto[];
  createBy?: string;
  createTime?: string;
  updateBy?: string;
  updateTime?: string;
  remark: string;
}

export type AdminMenuListDto = AdminMenuResponseDto[];

export interface AdminMenuValidationErrorContextDto {
  nodePath: string;
  field: string;
  reason: string;
  value?: unknown;
}

export interface AdminMenuIdParamsDto {
  id: number;
}

export interface CreateAdminMenuRequestDto {
  parentId: number | null;
  name: string;
  shortTitle?: string;
  slug?: string | null;
  iconKey: AdminMenuIconKey;
  menuType: AdminMenuNodeType;
  status?: number;
  sort?: number;
  description?: string;
  badge?: string;
  permissionCode?: string;
  remark?: string;
}

export interface UpdateAdminMenuRequestDto {
  parentId?: number | null;
  name?: string;
  shortTitle?: string;
  slug?: string | null;
  iconKey?: AdminMenuIconKey;
  menuType?: AdminMenuNodeType;
  status?: number;
  sort?: number;
  description?: string;
  badge?: string;
  permissionCode?: string;
  remark?: string;
}
