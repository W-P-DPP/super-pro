import { createJwtMiddleware } from '@super-pro/shared-server';
import express, { type Router } from 'express';
import {
  createUser,
  deleteUser,
  getLoginPublicKey,
  getUser,
  getUserDetail,
  loginUser,
  registerUser,
  updateUser,
} from './user.controller.ts';

const userRouter: Router = express.Router();
const jwtMiddleware = createJwtMiddleware({
  cookieNames: ['file_preview_token'],
  missingTokenMessage: '缺少授权信息或授权格式错误',
  invalidTokenMessage: '令牌无效或已过期',
});

userRouter.get('/getLoginPublicKey', getLoginPublicKey);
userRouter.post('/loginUser', loginUser);
userRouter.post('/registerUser', registerUser);
userRouter.use(jwtMiddleware);
userRouter.get('/getUser', getUser);
userRouter.get('/getUser/:id', getUserDetail);
userRouter.post('/createUser', createUser);
userRouter.put('/updateUser/:id', updateUser);
userRouter.delete('/deleteUser/:id', deleteUser);

export default userRouter;
