import type {
  AppAuthorizationSnapshot,
  AuthorizationPermissionSummary,
  AuthorizationRoleDetail,
  AuthorizationRoleSummary,
} from '@super-pro/shared-types';

export interface AuthorizationValidationErrorContextDto {
  nodePath: string;
  field: string;
  reason: string;
  value?: unknown;
}

export interface AuthorizationPermissionResponseDto
  extends AuthorizationPermissionSummary {}

export interface AuthorizationRoleResponseDto extends AuthorizationRoleDetail {}

export interface AuthorizationSnapshotResponseDto
  extends AppAuthorizationSnapshot {}

export interface AuthorizationSnapshotQueryDto {
  appCode: string;
}

export interface CreateRoleRequestDto {
  code: string;
  name: string;
  appCode: string;
  description?: string;
  permissionIds?: number[];
}

export interface UpdateRoleRequestDto {
  code?: string;
  name?: string;
  appCode?: string;
  description?: string;
  permissionIds?: number[];
}

export interface AuthorizationRoleListDto {
  items: AuthorizationRoleResponseDto[];
}

export interface AuthorizationPermissionListDto {
  items: AuthorizationPermissionResponseDto[];
}

export interface AssignedRoleResponseDto extends AuthorizationRoleSummary {}
