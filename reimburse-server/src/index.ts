import express, { type Router } from 'express';
import authRouter from './auth/auth.router.ts';
import reimbursementRouter from './reimbursement/reimbursement.router.ts';

const router: Router = express.Router();

router.use('/', authRouter);
router.use('/reimbursements', reimbursementRouter);

export default router;
