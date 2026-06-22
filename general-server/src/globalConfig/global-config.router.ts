import express, { type Router } from 'express';
import { ADMIN_CONSOLE_PERMISSION_CODES } from '@super-pro/shared-types';
import {
  loadAuthenticatedPrincipal,
  requirePermission,
} from '../authorization/authorization.middleware.ts';
import {
  createGlobalConfig,
  deleteGlobalConfig,
  getGlobalConfig,
  getGlobalConfigDetail,
  getPublicGlobalConfigByProjectCode,
  updateGlobalConfig,
} from './global-config.controller.ts';

const globalConfigRouter: Router = express.Router();
const globalConfigPublicRouter: Router = express.Router();

globalConfigPublicRouter.get('/public/:projectCode', getPublicGlobalConfigByProjectCode);

globalConfigRouter.use(loadAuthenticatedPrincipal);

globalConfigRouter.get(
  '/getGlobalConfig',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.globalConfigApiRead,
    '当前用户没有查看全局配置列表的接口权限',
  ),
  getGlobalConfig,
);
globalConfigRouter.get(
  '/getGlobalConfig/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.globalConfigApiRead,
    '当前用户没有查看全局配置详情的接口权限',
  ),
  getGlobalConfigDetail,
);
globalConfigRouter.post(
  '/createGlobalConfig',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.globalConfigApiCreate,
    '当前用户没有新增全局配置的接口权限',
  ),
  createGlobalConfig,
);
globalConfigRouter.put(
  '/updateGlobalConfig/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.globalConfigApiUpdate,
    '当前用户没有修改全局配置的接口权限',
  ),
  updateGlobalConfig,
);
globalConfigRouter.delete(
  '/deleteGlobalConfig/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.globalConfigApiDelete,
    '当前用户没有删除全局配置的接口权限',
  ),
  deleteGlobalConfig,
);

export default globalConfigRouter;
export { globalConfigPublicRouter };
