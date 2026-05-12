import express, { type Router } from 'express';
import {
  createRole,
  getAuthorizationSnapshot,
  getPermissionList,
  getRoleList,
  updateRole,
} from './authorization.controller.ts';

const authorizationRouter: Router = express.Router();

authorizationRouter.get('/snapshot', getAuthorizationSnapshot);
authorizationRouter.get('/permissions', getPermissionList);
authorizationRouter.get('/roles', getRoleList);
authorizationRouter.post('/roles', createRole);
authorizationRouter.put('/roles/:id', updateRole);

export default authorizationRouter;
