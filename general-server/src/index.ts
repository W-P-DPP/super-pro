import { createJwtMiddleware } from '@super-pro/shared-server';
import express, { type Router } from 'express';
import authorizationRouter from './authorization/authorization.router.ts';
import contactRouter from './contact/contact.router.ts';
import fileRouter from './file/file.router.ts';
import projectRouter from './project/project.router.ts';
import screenRouter from './screen/screen.router.ts';
import siteMenuRouter from './siteMenu/siteMenu.router.ts';
import userRouter from './user/user.router.ts';

const router: Router = express.Router();
const jwtMiddleware = createJwtMiddleware({
  cookieNames: ['file_preview_token'],
  missingTokenMessage: '缺少授权信息或授权格式错误',
  invalidTokenMessage: '令牌无效或已过期',
});

router.use('/contact', contactRouter);
router.use('/authorization', jwtMiddleware, authorizationRouter);
router.use('/file', jwtMiddleware, fileRouter);
router.use('/project', jwtMiddleware, projectRouter);
router.use('/screen', jwtMiddleware, screenRouter);
router.use('/site-menu',  siteMenuRouter);
router.use('/user', userRouter);

export default router;
