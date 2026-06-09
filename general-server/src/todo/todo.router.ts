import express, { type Router } from 'express';
import { ADMIN_CONSOLE_PERMISSION_CODES } from '@super-pro/shared-types';
import {
  loadAuthenticatedPrincipal,
  requirePermission,
} from '../authorization/authorization.middleware.ts';
import {
  createTodo,
  deleteTodo,
  getTodo,
  getTodoDetail,
  updateTodo,
} from './todo.controller.ts';

const todoRouter: Router = express.Router();

todoRouter.use(loadAuthenticatedPrincipal);

todoRouter.get(
  '/getTodo',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.todosApiRead,
    '当前用户没有查看待办列表的接口权限',
  ),
  getTodo,
);
todoRouter.get(
  '/getTodo/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.todosApiRead,
    '当前用户没有查看待办详情的接口权限',
  ),
  getTodoDetail,
);
todoRouter.post(
  '/createTodo',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.todosApiCreate,
    '当前用户没有新增待办的接口权限',
  ),
  createTodo,
);
todoRouter.put(
  '/updateTodo/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.todosApiUpdate,
    '当前用户没有修改待办的接口权限',
  ),
  updateTodo,
);
todoRouter.delete(
  '/deleteTodo/:id',
  requirePermission(
    ADMIN_CONSOLE_PERMISSION_CODES.todosApiDelete,
    '当前用户没有删除待办的接口权限',
  ),
  deleteTodo,
);

export default todoRouter;
