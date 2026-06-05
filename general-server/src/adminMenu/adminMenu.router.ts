import express, { type Router } from 'express';
import {
  createMenu,
  deleteMenu,
  getMenu,
  getMenuDetail,
  updateMenu,
} from './adminMenu.controller.ts';

const adminMenuRouter: Router = express.Router();

adminMenuRouter.get('/getMenu', getMenu);
adminMenuRouter.get('/getMenu/:id', getMenuDetail);
adminMenuRouter.post('/createMenu', createMenu);
adminMenuRouter.put('/updateMenu/:id', updateMenu);
adminMenuRouter.delete('/deleteMenu/:id', deleteMenu);

export default adminMenuRouter;
