import express, { type Router } from 'express';
import multer from 'multer';
import {
  createFolder,
  deleteFile,
  getFileTree,
  uploadFile,
} from './file.controller.ts';

const fileRouter: Router = express.Router();
const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
});

fileRouter.get('/tree', getFileTree);
fileRouter.post('/folder', createFolder);
fileRouter.post('/upload', uploadSingleFile.single('file'), uploadFile);
fileRouter.delete('/', deleteFile);

export default fileRouter;
