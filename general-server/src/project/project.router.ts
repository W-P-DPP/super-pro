import express, { type Router } from 'express';
import {
  createProject,
  deleteProject,
  getProject,
  getProjectDetail,
  updateProject,
} from './project.controller.ts';

const projectRouter: Router = express.Router();

projectRouter.get('/getProject', getProject);
projectRouter.get('/getProject/:id', getProjectDetail);
projectRouter.post('/createProject', createProject);
projectRouter.put('/updateProject/:id', updateProject);
projectRouter.delete('/deleteProject/:id', deleteProject);

export default projectRouter;
