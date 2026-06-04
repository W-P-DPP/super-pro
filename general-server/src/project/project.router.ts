import express, { type Router } from 'express';
import { PROJECT_PERMISSION_CODES } from '@super-pro/shared-types';
import {
  loadAuthenticatedPrincipal,
  requirePermission,
} from '../authorization/authorization.middleware.ts';
import {
  createProject,
  deleteProject,
  getProject,
  getProjectDetail,
  updateProject,
} from './project.controller.ts';

const projectRouter: Router = express.Router();

projectRouter.use(loadAuthenticatedPrincipal);

projectRouter.get(
  '/getProject',
  requirePermission(PROJECT_PERMISSION_CODES.projectRead, 'Current user cannot view projects'),
  getProject,
);
projectRouter.get(
  '/getProject/:id',
  requirePermission(PROJECT_PERMISSION_CODES.projectRead, 'Current user cannot view projects'),
  getProjectDetail,
);
projectRouter.post(
  '/createProject',
  requirePermission(
    PROJECT_PERMISSION_CODES.projectCreate,
    'Current user cannot create projects',
  ),
  createProject,
);
projectRouter.put(
  '/updateProject/:id',
  requirePermission(
    PROJECT_PERMISSION_CODES.projectUpdate,
    'Current user cannot update projects',
  ),
  updateProject,
);
projectRouter.delete(
  '/deleteProject/:id',
  requirePermission(
    PROJECT_PERMISSION_CODES.projectDelete,
    'Current user cannot delete projects',
  ),
  deleteProject,
);

export default projectRouter;
