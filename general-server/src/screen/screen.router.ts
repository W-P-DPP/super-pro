import express, { type Router } from 'express';
import { getScreenDevice } from './screen.controller.ts';

const screenRouter: Router = express.Router();

screenRouter.get('/device', getScreenDevice);

export default screenRouter;
