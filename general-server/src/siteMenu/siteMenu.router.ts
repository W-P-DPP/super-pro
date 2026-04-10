import express, { type Router } from 'express';
import multer from 'multer';
import {
  createMenu,
  deleteMenu,
  getMenu,
  getMenuConfig,
  getMenuDetail,
  updateMenu,
  uploadMenuFile,
} from './siteMenu.controller.ts';

const siteMenuRouter: Router = express.Router();
const uploadSiteMenuFile = multer({
  storage: multer.memoryStorage(),
});

siteMenuRouter.get('/getMenu', getMenu);
siteMenuRouter.get('/getMenuConfig', getMenuConfig);
siteMenuRouter.get('/getMenu/:id', getMenuDetail);
siteMenuRouter.post('/createMenu', createMenu);
siteMenuRouter.put('/updateMenu/:id', updateMenu);
siteMenuRouter.delete('/deleteMenu/:id', deleteMenu);
siteMenuRouter.post('/uploadMenuFile', uploadSiteMenuFile.single('file'), uploadMenuFile);

export default siteMenuRouter;
