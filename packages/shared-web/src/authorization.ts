import type {
  AuthorizationPermissionSummary,
  AuthorizationResourceType,
  AuthorizationUserProjectPermission,
  PermissionCode,
} from '@super-pro/shared-types';

export type FrontendPermissionSource =
  | Pick<AuthorizationUserProjectPermission, 'permissions'>
  | readonly AuthorizationPermissionSummary[]
  | null
  | undefined;

export interface FrontendPermissionRequirement {
  code?: PermissionCode;
  appCode?: string;
  resourceType?: AuthorizationResourceType;
  resourceCode?: string;
  action?: string;
  requireEnabled?: boolean;
}

export type FrontendPermissionCheckTarget =
  | PermissionCode
  | FrontendPermissionRequirement;

const GLOBAL_PERMISSION_CODE = '*.*.*';

function isProjectPermissionSource(
  source: Exclude<FrontendPermissionSource, null | undefined>,
): source is Pick<AuthorizationUserProjectPermission, 'permissions'> {
  return !Array.isArray(source);
}

function toPermissionList(
  source: FrontendPermissionSource,
): readonly AuthorizationPermissionSummary[] {
  if (!source) {
    return [];
  }

  if (Array.isArray(source)) {
    return source as readonly AuthorizationPermissionSummary[];
  }

  if (isProjectPermissionSource(source)) {
    return source.permissions;
  }

  return [];
}

function isEnabledPermission(permission: AuthorizationPermissionSummary): boolean {
  return permission.status !== 0;
}

function normalizeRequirement(
  target: FrontendPermissionCheckTarget,
): FrontendPermissionRequirement {
  if (typeof target === 'string') {
    return {
      code: target,
      requireEnabled: true,
    };
  }

  return {
    ...target,
    requireEnabled: target.requireEnabled ?? true,
  };
}

function matchesPermissionCodePattern(
  grantedPermissionCode: PermissionCode,
  requiredPermissionCode: PermissionCode,
): boolean {
  if (grantedPermissionCode === GLOBAL_PERMISSION_CODE) {
    return true;
  }

  if (grantedPermissionCode === requiredPermissionCode) {
    return true;
  }

  const grantedSegments = grantedPermissionCode.split('.');
  const requiredSegments = requiredPermissionCode.split('.');

  if (grantedSegments.length !== requiredSegments.length) {
    return false;
  }

  return grantedSegments.every((segment, index) => {
    return segment === '*' || segment === requiredSegments[index];
  });
}

function matchesRequirement(
  permission: AuthorizationPermissionSummary,
  target: FrontendPermissionCheckTarget,
): boolean {
  const requirement = normalizeRequirement(target);

  if (
    requirement.code === undefined &&
    requirement.appCode === undefined &&
    requirement.resourceType === undefined &&
    requirement.resourceCode === undefined &&
    requirement.action === undefined
  ) {
    return false;
  }

  if (requirement.requireEnabled && !isEnabledPermission(permission)) {
    return false;
  }

  if (
    requirement.code !== undefined &&
    !matchesPermissionCodePattern(permission.code, requirement.code)
  ) {
    return false;
  }

  if (permission.code === GLOBAL_PERMISSION_CODE) {
    return true;
  }

  if (
    requirement.appCode !== undefined &&
    permission.appCode !== '*' &&
    permission.appCode !== requirement.appCode
  ) {
    return false;
  }

  if (
    requirement.resourceType !== undefined &&
    permission.resourceType !== requirement.resourceType
  ) {
    return false;
  }

  if (
    requirement.resourceCode !== undefined &&
    permission.resourceCode !== '*' &&
    permission.resourceCode !== requirement.resourceCode
  ) {
    return false;
  }

  if (
    requirement.action !== undefined &&
    permission.action !== '*' &&
    permission.action !== requirement.action
  ) {
    return false;
  }

  return true;
}

export function getGrantedPermissionCodes(
  source: FrontendPermissionSource,
): PermissionCode[] {
  return Array.from(
    new Set(
      toPermissionList(source)
        .filter(isEnabledPermission)
        .map((permission) => permission.code),
    ),
  );
}

export function hasProjectPermission(
  source: FrontendPermissionSource,
  target: FrontendPermissionCheckTarget,
): boolean {
  return toPermissionList(source).some((permission) => matchesRequirement(permission, target));
}

export function hasAnyProjectPermission(
  source: FrontendPermissionSource,
  targets: readonly FrontendPermissionCheckTarget[],
): boolean {
  return targets.some((target) => hasProjectPermission(source, target));
}

export function hasAllProjectPermissions(
  source: FrontendPermissionSource,
  targets: readonly FrontendPermissionCheckTarget[],
): boolean {
  return targets.every((target) => hasProjectPermission(source, target));
}

export function createProjectPermissionChecker(source: FrontendPermissionSource) {
  return {
    permissions: toPermissionList(source),
    permissionCodes: getGrantedPermissionCodes(source),
    has: (target: FrontendPermissionCheckTarget) =>
      hasProjectPermission(source, target),
    hasAny: (targets: readonly FrontendPermissionCheckTarget[]) =>
      hasAnyProjectPermission(source, targets),
    hasAll: (targets: readonly FrontendPermissionCheckTarget[]) =>
      hasAllProjectPermissions(source, targets),
  };
}
