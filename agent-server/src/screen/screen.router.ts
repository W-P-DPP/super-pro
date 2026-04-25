import express, { type Router } from 'express';
import {
  getScreenActivity,
  getScreenAgent,
  getScreenKnowledge,
  getScreenOverview,
  getScreenTrends,
} from './screen.controller.ts';

const screenRouter: Router = express.Router();

screenRouter.get('/overview', getScreenOverview);
screenRouter.get('/trends', getScreenTrends);
screenRouter.get('/agent', getScreenAgent);
screenRouter.get('/knowledge', getScreenKnowledge);
screenRouter.get('/activity', getScreenActivity);

export default screenRouter;
