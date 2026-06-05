import express, { type Router } from 'express';
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

authorizationRouter.get('/permissions', getPermissionList);
authorizationRouter.get('/roles', getRoleList);
authorizationRouter.get('/me/projects/:projectCode', getCurrentUserProjectPermission);
authorizationRouter.get('/users/:id/projects', getUserProjectPermissionList);
authorizationRouter.post('/permissions', createPermission);
authorizationRouter.post('/roles', createRole);
authorizationRouter.put('/permissions/:id', updatePermission);
authorizationRouter.put('/roles/:id', updateRole);
authorizationRouter.delete('/permissions/:id', deletePermission);
authorizationRouter.delete('/roles/:id', deleteRole);

export default authorizationRouter;
