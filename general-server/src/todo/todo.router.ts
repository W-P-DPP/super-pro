import express, { type Router } from 'express';
import { jwtMiddleware } from '../../utils/middleware/jwtMiddleware.ts';
import {
  approveTodo,
  rejectTodo,
  cancelTodo,
  completeTodo,
  createTodo,
  deleteTodo,
  listTodos,
  rollbackTodo,
  updateTodo,
} from './todo.controller.ts';

const todoRouter: Router = express.Router();

todoRouter.use(jwtMiddleware);
todoRouter.get('/list', listTodos);
todoRouter.post('/create', createTodo);
todoRouter.put('/update/:id', updateTodo);
todoRouter.post('/approve/:id', approveTodo);
todoRouter.post('/reject/:id', rejectTodo);
todoRouter.post('/complete/:id', completeTodo);
todoRouter.post('/cancel/:id', cancelTodo);
todoRouter.post('/rollback/:id', rollbackTodo);
todoRouter.delete('/delete/:id', deleteTodo);

export default todoRouter;
