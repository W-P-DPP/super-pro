import express, { type Router } from 'express';
import multer from 'multer';
import { createJwtMiddleware } from '@super-pro/shared-server';
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
  getMenuConfig,
  getMenuDetail,
  updateMenu,
  uploadMenuFile,
} from './siteMenu.controller.ts';

const siteMenuRouter: Router = express.Router();
const uploadSiteMenuFile = multer({
  storage: multer.memoryStorage(),
});
const jwtMiddleware = createJwtMiddleware({
  cookieNames: ['file_preview_token'],
  missingTokenMessage: '缺少授权信息或授权格式错误',
  invalidTokenMessage: '令牌无效或已过期',
});

siteMenuRouter.get('/getMenu', getMenu);
siteMenuRouter.get('/getMenuConfig', getMenuConfig);
siteMenuRouter.use(jwtMiddleware);
siteMenuRouter.use(loadAuthenticatedPrincipal);
siteMenuRouter.get(
  '/getMenuList',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.siteMenuApiRead,
    '当前用户没有查看站点菜单列表的接口权限',
  ),
  getMenuList,
);
siteMenuRouter.get(
  '/getMenu/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.siteMenuApiRead,
    '当前用户没有查看站点菜单详情的接口权限',
  ),
  getMenuDetail,
);
siteMenuRouter.post(
  '/createMenu',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.siteMenuApiCreate,
    '当前用户没有新增站点菜单的接口权限',
  ),
  createMenu,
);
siteMenuRouter.put(
  '/updateMenu/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.siteMenuApiUpdate,
    '当前用户没有修改站点菜单的接口权限',
  ),
  updateMenu,
);
siteMenuRouter.delete(
  '/deleteMenu/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.siteMenuApiDelete,
    '当前用户没有删除站点菜单的接口权限',
  ),
  deleteMenu,
);
siteMenuRouter.post(
  '/uploadMenuFile',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.siteMenuApiUpdate,
    '当前用户没有导入站点菜单的接口权限',
  ),
  uploadSiteMenuFile.single('file'),
  uploadMenuFile,
);

export default siteMenuRouter;
