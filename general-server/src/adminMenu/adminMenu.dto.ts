export type {
  AdminMenuIconKey,
  AdminMenuIdParamsDto,
  AdminMenuListDto,
  AdminMenuNodeType,
  AdminMenuResponseDto,
  AdminMenuValidationErrorContextDto,
  CreateAdminMenuRequestDto,
  UpdateAdminMenuRequestDto,
} from '@super-pro/shared-types';

export interface AdminMenuTableListQueryDto {
  keyword?: string;
  menuType?: AdminMenuNodeType;
  status?: number;
  page?: number;
  pageSize?: number;
}

export interface AdminMenuTableListItemDto {
  id: number;
  parentId: number | null;
  parentName: string;
  level: number;
  name: string;
  shortTitle: string;
  slug: string;
  iconKey: AdminMenuIconKey;
  menuType: AdminMenuNodeType;
  status: number;
  sort: number;
  description: string;
  badge: string;
  permissionCode: string;
  remark: string;
  updateTime: string;
}

export interface AdminMenuTableListDto {
  items: AdminMenuTableListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}
