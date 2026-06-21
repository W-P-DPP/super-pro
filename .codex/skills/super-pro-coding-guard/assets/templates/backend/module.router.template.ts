import express, { type Router } from 'express'
import { createJwtMiddleware } from '@super-pro/shared-server'
import { __PERMISSION_CODES__ } from '@super-pro/shared-types'
import {
  loadAuthenticatedPrincipal,
  requirePermission,
} from '../authorization/authorization.middleware.ts'
import {
  create__Resource__,
  delete__Resource__,
  get__Resource__Detail,
  get__Resource__List,
  update__Resource__,
} from './__resource__.controller.ts'

const __resource__Router: Router = express.Router()
const jwtMiddleware = createJwtMiddleware({
  cookieNames: ['file_preview_token'],
  missingTokenMessage: '缺少授权信息或授权格式错误',
  invalidTokenMessage: '令牌无效或已过期',
})

__resource__Router.get('/public-summary', get__Resource__List)

__resource__Router.use(jwtMiddleware)
__resource__Router.use(loadAuthenticatedPrincipal)

__resource__Router.get(
  '/',
  requirePermission(
    __PERMISSION_CODES__.__RESOURCE_READ__,
    '当前用户没有查看__RESOURCE_LABEL__列表的接口权限',
  ),
  get__Resource__List,
)

__resource__Router.get(
  '/:id',
  requirePermission(
    __PERMISSION_CODES__.__RESOURCE_READ__,
    '当前用户没有查看__RESOURCE_LABEL__详情的接口权限',
  ),
  get__Resource__Detail,
)

__resource__Router.post(
  '/',
  requirePermission(
    __PERMISSION_CODES__.__RESOURCE_CREATE__,
    '当前用户没有新增__RESOURCE_LABEL__的接口权限',
  ),
  create__Resource__,
)

__resource__Router.put(
  '/:id',
  requirePermission(
    __PERMISSION_CODES__.__RESOURCE_UPDATE__,
    '当前用户没有修改__RESOURCE_LABEL__的接口权限',
  ),
  update__Resource__,
)

__resource__Router.delete(
  '/:id',
  requirePermission(
    __PERMISSION_CODES__.__RESOURCE_DELETE__,
    '当前用户没有删除__RESOURCE_LABEL__的接口权限',
  ),
  delete__Resource__,
)

export default __resource__Router
