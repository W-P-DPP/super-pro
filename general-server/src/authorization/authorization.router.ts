import express, { type Router } from 'express';
import { ADMIN_CONSOLE_PERMISSION_CODES } from '@super-pro/shared-types';
import {
  loadAuthenticatedPrincipal,
  requirePermission,
} from './authorization.middleware.ts';
import {
  createPermission,
  createRole,
  deletePermission,
  deleteRole,
  getCurrentUserProjectPermission,
  getPermissionList,
  getRoleList,
  getUserProjectPermissionList,
  updatePermission,
  updateRole,
} from './authorization.controller.ts';

const authorizationRouter: Router = express.Router();

authorizationRouter.use(loadAuthenticatedPrincipal);

authorizationRouter.get(
  '/permissions',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.permissionsApiRead,
    '当前用户没有查看权限列表的接口权限',
  ),
  getPermissionList,
);
authorizationRouter.get(
  '/roles',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.rolesApiRead,
    '当前用户没有查看角色列表的接口权限',
  ),
  getRoleList,
);
authorizationRouter.get('/me/projects/:projectCode', getCurrentUserProjectPermission);
authorizationRouter.get('/users/:id/projects', getUserProjectPermissionList);
authorizationRouter.post(
  '/permissions',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.permissionsApiCreate,
    '当前用户没有新增权限的接口权限',
  ),
  createPermission,
);
authorizationRouter.post(
  '/roles',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.rolesApiCreate,
    '当前用户没有新增角色的接口权限',
  ),
  createRole,
);
authorizationRouter.put(
  '/permissions/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.permissionsApiUpdate,
    '当前用户没有修改权限的接口权限',
  ),
  updatePermission,
);
authorizationRouter.put(
  '/roles/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.rolesApiUpdate,
    '当前用户没有修改角色的接口权限',
  ),
  updateRole,
);
authorizationRouter.delete(
  '/permissions/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.permissionsApiDelete,
    '当前用户没有删除权限的接口权限',
  ),
  deletePermission,
);
authorizationRouter.delete(
  '/roles/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.rolesApiDelete,
    '当前用户没有删除角色的接口权限',
  ),
  deleteRole,
);

export default authorizationRouter;
