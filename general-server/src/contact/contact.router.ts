import express, { type Router } from 'express';
import { submitContactMessage } from './contact.controller.ts';

const contactRouter: Router = express.Router();

contactRouter.post('/submitMessage', submitContactMessage);

export default contactRouter;
