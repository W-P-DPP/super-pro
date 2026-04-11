import express, { type Router } from 'express';
import { jwtMiddleware } from '../../utils/middleware/jwtMiddleware.ts';
import {
  createUser,
  deleteUser,
  getUser,
  getUserDetail,
  loginUser,
  registerUser,
  updateUser,
} from './user.controller.ts';

const userRouter: Router = express.Router();

userRouter.post('/loginUser', loginUser);
userRouter.post('/registerUser', registerUser);
userRouter.use(jwtMiddleware);
userRouter.get('/getUser', getUser);
userRouter.get('/getUser/:id', getUserDetail);
userRouter.post('/createUser', createUser);
userRouter.put('/updateUser/:id', updateUser);
userRouter.delete('/deleteUser/:id', deleteUser);

export default userRouter;
