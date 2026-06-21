import express, { type Router } from 'express';
import { ADMIN_CONSOLE_PERMISSION_CODES } from '@super-pro/shared-types';
import {
  loadAuthenticatedPrincipal,
  requirePermission,
} from '../authorization/authorization.middleware.ts';
import {
  createMenu,
  deleteMenu,
  getMenu,
  getMenuList,
  getMenuDetail,
  updateMenu,
} from './adminMenu.controller.ts';

const adminMenuRouter: Router = express.Router();

adminMenuRouter.use(loadAuthenticatedPrincipal);

adminMenuRouter.get(
  '/getMenu',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.adminMenuApiRead,
    '当前用户没有查看 BMS 菜单的接口权限',
  ),
  getMenu,
);
adminMenuRouter.get(
  '/getMenuList',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.adminMenuApiRead,
    '当前用户没有查看 BMS 菜单列表的接口权限',
  ),
  getMenuList,
);
adminMenuRouter.get(
  '/getMenu/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.adminMenuApiRead,
    '当前用户没有查看 BMS 菜单详情的接口权限',
  ),
  getMenuDetail,
);
adminMenuRouter.post(
  '/createMenu',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.adminMenuApiCreate,
    '当前用户没有新增 BMS 菜单的接口权限',
  ),
  createMenu,
);
adminMenuRouter.put(
  '/updateMenu/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.adminMenuApiUpdate,
    '当前用户没有修改 BMS 菜单的接口权限',
  ),
  updateMenu,
);
adminMenuRouter.delete(
  '/deleteMenu/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.adminMenuApiDelete,
    '当前用户没有删除 BMS 菜单的接口权限',
  ),
  deleteMenu,
);

export default adminMenuRouter;
