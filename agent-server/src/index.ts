
import express, { type Router } from 'express';
import agentRouter from './agent/agent.router.ts';
import chatRouter from './chat/chat.router.ts';
import knowledgeRouter from './knowledge/knowledge.router.ts';
import screenRouter from './screen/screen.router.ts';

const router: Router = express.Router();

router.use('/agent', agentRouter);
router.use('/chat', chatRouter);
router.use('/knowledge', knowledgeRouter);
router.use('/screen', screenRouter);

export default router;
