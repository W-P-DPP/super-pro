import express, { type Router } from 'express';
import {
  createPermission,
  createRole,
  deletePermission,
  getAuthorizationSnapshot,
  getPermissionList,
  getRoleList,
  updatePermission,
  updateRole,
} from './authorization.controller.ts';

const authorizationRouter: Router = express.Router();

authorizationRouter.get('/snapshot', getAuthorizationSnapshot);
authorizationRouter.get('/permissions', getPermissionList);
authorizationRouter.get('/roles', getRoleList);
authorizationRouter.post('/permissions', createPermission);
authorizationRouter.post('/roles', createRole);
authorizationRouter.put('/permissions/:id', updatePermission);
authorizationRouter.put('/roles/:id', updateRole);
authorizationRouter.delete('/permissions/:id', deletePermission);

export default authorizationRouter;
