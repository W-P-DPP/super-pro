import express, { type Router } from 'express';
import { getCurrentUser } from './auth.controller.ts';

const authRouter: Router = express.Router();

authRouter.get('/me', getCurrentUser);

export default authRouter;
