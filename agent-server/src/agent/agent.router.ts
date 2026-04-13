import express, { type Router } from 'express';
import {
  getAgentMe,
  getCurrentUser,
  getDefaultBindings,
  getProviderModels,
  updateDefaultBindings,
} from './agent.controller.ts';

const agentRouter: Router = express.Router();

agentRouter.get('/me', getAgentMe);
agentRouter.get('/current-user', getCurrentUser);
agentRouter.get('/providers/:provider/models', getProviderModels);
agentRouter.get('/default/bindings', getDefaultBindings);
agentRouter.put('/default/bindings', updateDefaultBindings);

export default agentRouter;
