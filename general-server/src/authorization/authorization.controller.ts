import type { Request, Response } from 'express';
import { HttpStatus } from '@super-pro/shared-constants';
import type {
  CreatePermissionRequestDto,
  UpdatePermissionRequestDto,
} from './authorization.dto.ts';
import {
  AuthorizationBusinessError,
  authorizationService,
} from './authorization.service.ts';

function handleAuthorizationError(
  error: unknown,
  res: Response,
  fallbackMessage: string,
) {
  if (error instanceof AuthorizationBusinessError) {
    return res.status(error.statusCode).sendFail(error.message, error.statusCode);
  }

  return res.status(HttpStatus.ERROR).sendFail(fallbackMessage, HttpStatus.ERROR);
}

export const getAuthorizationSnapshot = async (req: Request, res: Response) => {
  try {
    const identity = authorizationService.resolveAuthenticatedIdentityFromJwtPayload(
      req.jwtPayload,
    );
    const snapshot = await authorizationService.getAuthorizationSnapshot(
      identity,
      req.query as Record<string, unknown>,
    );
    res.sendSuccess(snapshot, '获取权限快照成功');
  } catch (error) {
    return handleAuthorizationError(error, res, '获取权限快照失败');
  }
};

export const getPermissionList = async (req: Request, res: Response) => {
  try {
    const result = await authorizationService.listPermissions(
      typeof req.query.appCode === 'string' ? req.query.appCode : undefined,
    );
    res.sendSuccess(result, '获取权限列表成功');
  } catch (error) {
    return handleAuthorizationError(error, res, '获取权限列表失败');
  }
};

export const getRoleList = async (req: Request, res: Response) => {
  try {
    const result = await authorizationService.listRoles(
      typeof req.query.appCode === 'string' ? req.query.appCode : undefined,
    );
    res.sendSuccess(result, '获取角色列表成功');
  } catch (error) {
    return handleAuthorizationError(error, res, '获取角色列表失败');
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const result = await authorizationService.createRole(req.body as Record<string, unknown>);
    res.sendSuccess(result, '创建角色成功');
  } catch (error) {
    return handleAuthorizationError(error, res, '创建角色失败');
  }
};

export const createPermission = async (req: Request, res: Response) => {
  try {
    const result = await authorizationService.createPermission(
      req.body as CreatePermissionRequestDto,
    );
    res.sendSuccess(result, '创建权限成功');
  } catch (error) {
    return handleAuthorizationError(error, res, '创建权限失败');
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const result = await authorizationService.updateRole(
      Number(req.params.id),
      req.body as Record<string, unknown>,
    );
    res.sendSuccess(result, '更新角色成功');
  } catch (error) {
    return handleAuthorizationError(error, res, '更新角色失败');
  }
};

export const updatePermission = async (req: Request, res: Response) => {
  try {
    const result = await authorizationService.updatePermission(
      Number(req.params.id),
      req.body as UpdatePermissionRequestDto,
    );
    res.sendSuccess(result, '更新权限成功');
  } catch (error) {
    return handleAuthorizationError(error, res, '更新权限失败');
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const result = await authorizationService.removeRole(Number(req.params.id));
    res.sendSuccess(result, '删除角色成功');
  } catch (error) {
    return handleAuthorizationError(error, res, '删除角色失败');
  }
};

export const deletePermission = async (req: Request, res: Response) => {
  try {
    const result = await authorizationService.deletePermission(Number(req.params.id));
    res.sendSuccess(result, '删除权限成功');
  } catch (error) {
    return handleAuthorizationError(error, res, '删除权限失败');
  }
};
