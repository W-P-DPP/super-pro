import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type { CreateTodoReq, UpdateTodoReq } from './todo.dto.ts';
import { TodoBusinessError, todoService } from './todo.service.ts';

const listTodos = async (req: Request, res: Response) => {
  try {
    const statusParam = req.query.status !== undefined ? Number(req.query.status) : undefined;
    const todos = await todoService.listTodos(req.jwtPayload ?? {}, statusParam);
    res.sendSuccess(todos, '获取待办列表成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('获取待办列表失败', HttpStatus.ERROR);
  }
};

const createTodo = async (req: Request, res: Response) => {
  try {
    const created = await todoService.createTodo(req.jwtPayload ?? {}, req.body as CreateTodoReq);
    res.sendSuccess(created, '创建待办成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('创建待办失败', HttpStatus.ERROR);
  }
};

const updateTodo = async (req: Request, res: Response) => {
  try {
    const updated = await todoService.updateTodo(
      req.jwtPayload ?? {},
      Number(req.params.id),
      req.body as UpdateTodoReq,
    );
    res.sendSuccess(updated, '更新待办成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('更新待办失败', HttpStatus.ERROR);
  }
};

const approveTodo = async (req: Request, res: Response) => {
  try {
    const result = await todoService.approveTodo(req.jwtPayload ?? {}, Number(req.params.id));
    res.sendSuccess(result, '审核通过');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('审核通过失败', HttpStatus.ERROR);
  }
};

const rejectTodo = async (req: Request, res: Response) => {
  try {
    const result = await todoService.rejectTodo(req.jwtPayload ?? {}, Number(req.params.id));
    res.sendSuccess(result, '审核驳回成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('审核驳回失败', HttpStatus.ERROR);
  }
};

const completeTodo = async (req: Request, res: Response) => {
  try {
    const result = await todoService.completeTodo(req.jwtPayload ?? {}, Number(req.params.id));
    res.sendSuccess(result, '完成待办成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('完成待办失败', HttpStatus.ERROR);
  }
};

const rollbackTodo = async (req: Request, res: Response) => {
  try {
    const result = await todoService.rollbackTodo(req.jwtPayload ?? {}, Number(req.params.id));
    res.sendSuccess(result, '回退待办成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('回退待办失败', HttpStatus.ERROR);
  }
};

const cancelTodo = async (req: Request, res: Response) => {
  try {
    const result = await todoService.cancelTodo(req.jwtPayload ?? {}, Number(req.params.id));
    res.sendSuccess(result, '取消待办成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('取消待办失败', HttpStatus.ERROR);
  }
};

const deleteTodo = async (req: Request, res: Response) => {
  try {
    const deleted = await todoService.deleteTodo(req.jwtPayload ?? {}, Number(req.params.id));
    res.sendSuccess(deleted, '删除待办成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('删除待办失败', HttpStatus.ERROR);
  }
};

export {
  approveTodo,
  cancelTodo,
  completeTodo,
  createTodo,
  deleteTodo,
  listTodos,
  rejectTodo,
  rollbackTodo,
  updateTodo,
};
