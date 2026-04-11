import express, { type Router } from 'express';
import siteMenuRouter from './siteMenu/siteMenu.router.ts';
import userRouter from './user/user.router.ts';
import { jwtMiddleware } from '../utils/middleware/jwtMiddleware.ts';

const router: Router = express.Router();

router.use('/site-menu', jwtMiddleware, siteMenuRouter);
router.use('/user', userRouter);

export default router;
