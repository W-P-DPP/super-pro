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

export interface AuthorizationRoleResponseDto extends AuthorizationRoleDetail {
  memberCount?: number;
}

export interface AuthorizationSnapshotResponseDto
  extends AppAuthorizationSnapshot {}

export interface AuthorizationSnapshotQueryDto {
  appCode: string;
}

export interface CreateRoleRequestDto {
  code: string;
  name: string;
  description?: string;
  status?: number;
  permissionIds?: number[];
}

export interface CreatePermissionRequestDto {
  code: string;
  appCode: string;
  resourceType: AuthorizationPermissionSummary['resourceType'];
  resourceCode: string;
  action: string;
  name: string;
  description?: string;
  status?: number;
}

export interface UpdateRoleRequestDto {
  code?: string;
  name?: string;
  description?: string;
  status?: number;
  permissionIds?: number[];
}

export interface UpdatePermissionRequestDto {
  code?: string;
  appCode?: string;
  resourceType?: AuthorizationPermissionSummary['resourceType'];
  resourceCode?: string;
  action?: string;
  name?: string;
  description?: string;
  status?: number;
}

export interface AuthorizationRoleListDto {
  items: AuthorizationRoleResponseDto[];
}

export interface AuthorizationPermissionListDto {
  items: AuthorizationPermissionResponseDto[];
}

export interface AssignedRoleResponseDto extends AuthorizationRoleSummary {}

export interface AuthorizationUserProjectPermissionResponseDto {
  id: number;
  projectCode: string;
  projectName: string;
  roles: AuthorizationRoleSummary[];
  permissions: AuthorizationPermissionSummary[];
}

export interface AuthorizationUserProjectPermissionListDto {
  items: AuthorizationUserProjectPermissionResponseDto[];
}
